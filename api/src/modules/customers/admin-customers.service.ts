import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminRoleCode,
  PaymentStatus,
  Prisma,
  UserStatus,
  UserType,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import {
  PaginatedResponseDto,
  buildPaginatedResponse,
} from '../../common/dto/pagination.dto';
import { toMoneyString } from '../../common/utils/money.util';
import { csvEscape } from '../../common/utils/security.util';
import { AuditService } from '../audit/audit.service';
import { AccountingService } from '../payments/accounting.service';
import { EmailOutboxService } from '../payments/email-outbox.service';
import { PrismaService } from '../prisma/prisma.service';
import { CustomersService } from './customers.service';

export type CustomerListFilter =
  'INDIVIDUAL' | 'CORPORATE' | 'ACTIVE' | 'INACTIVE' | 'DEBTOR' | 'CREDITOR';

@Injectable()
export class AdminCustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting: AccountingService,
    private readonly customers: CustomersService,
    private readonly emailOutbox: EmailOutboxService,
    private readonly audit: AuditService,
  ) {}

  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    filter?: CustomerListFilter;
  }): Promise<
    PaginatedResponseDto<{
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string | null;
      userType: UserType;
      status: UserStatus;
      companyName: string | null;
      balance: string;
      orderCount: number;
      totalSpent: string;
      createdAt: Date;
    }>
  > {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where = this.buildWhere(query.search, query.filter);

    // Pre-filter debtors/creditors via balance map when needed
    if (query.filter === 'DEBTOR' || query.filter === 'CREDITOR') {
      const balances = await this.accounting.balancesByCustomer();
      const ids = balances
        .filter((b) =>
          query.filter === 'DEBTOR'
            ? new Prisma.Decimal(b.balance).greaterThan(0)
            : new Prisma.Decimal(b.balance).lessThan(0),
        )
        .map((b) => b.customerId);
      where.id = {
        in: ids.length ? ids : ['00000000-0000-0000-0000-000000000000'],
      };
    }

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: {
          corporateCustomer: true,
          _count: { select: { orders: true } },
          orders: {
            where: { status: { not: 'CANCELLED' } },
            select: { totalAmount: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const balanceMap = new Map(
      (await this.accounting.balancesByCustomer()).map((b) => [
        b.customerId,
        b.balance,
      ]),
    );

    return buildPaginatedResponse(
      users.map((u) => {
        const spent = u.orders.reduce(
          (acc, o) => acc.add(o.totalAmount),
          new Prisma.Decimal(0),
        );
        return {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          phone: u.phone,
          userType: u.userType,
          status: u.status,
          companyName: u.corporateCustomer?.companyName ?? null,
          balance: balanceMap.get(u.id) ?? '0.00',
          orderCount: u._count.orders,
          totalSpent: toMoneyString(spent),
          createdAt: u.createdAt,
        };
      }),
      total,
      page,
      limit,
    );
  }

  private buildWhere(
    search?: string,
    filter?: CustomerListFilter,
  ): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {
      adminUser: null,
    };
    if (filter === 'INDIVIDUAL') where.userType = UserType.INDIVIDUAL;
    if (filter === 'CORPORATE') where.userType = UserType.CORPORATE;
    if (filter === 'ACTIVE') where.status = UserStatus.ACTIVE;
    if (filter === 'INACTIVE') {
      where.status = { in: [UserStatus.INACTIVE, UserStatus.BLOCKED] };
    }
    if (search?.trim()) {
      const q = search.trim();
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        {
          corporateCustomer: {
            OR: [
              { companyName: { contains: q, mode: 'insensitive' } },
              { taxNumber: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }
    return where;
  }

  async getDetail(customerId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: customerId },
      include: {
        corporateCustomer: true,
        addresses: { orderBy: { createdAt: 'desc' } },
        _count: { select: { orders: true, bankTransfers: true } },
      },
    });
    if (!user || (await this.isAdminOnly(user.id))) {
      throw new NotFoundException('Customer not found');
    }

    const account = await this.accounting.getCurrentAccount(customerId);
    const orderAgg = await this.prisma.order.aggregate({
      where: { userId: customerId, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true },
      _count: true,
    });
    const paidAgg = await this.prisma.payment.aggregate({
      where: { order: { userId: customerId }, status: PaymentStatus.PAID },
      _sum: { amount: true },
    });
    const pendingAgg = await this.prisma.payment.aggregate({
      where: {
        order: { userId: customerId },
        status: PaymentStatus.PENDING,
      },
      _sum: { amount: true },
    });

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      status: user.status,
      createdAt: user.createdAt,
      corporate: user.corporateCustomer
        ? {
            companyName: user.corporateCustomer.companyName,
            taxNumber: user.corporateCustomer.taxNumber,
            taxOffice: user.corporateCustomer.taxOffice,
            allowCredit: user.corporateCustomer.allowCredit,
            creditLimit: user.corporateCustomer.creditLimit
              ? toMoneyString(user.corporateCustomer.creditLimit)
              : null,
            paymentTermDays: user.corporateCustomer.paymentTermDays,
          }
        : null,
      addresses: user.addresses,
      account,
      ordersSummary: {
        orderCount: orderAgg._count,
        totalAmount: toMoneyString(orderAgg._sum.totalAmount ?? 0),
        paidAmount: toMoneyString(paidAgg._sum.amount ?? 0),
        pendingAmount: toMoneyString(pendingAgg._sum.amount ?? 0),
      },
    };
  }

  private async isAdminOnly(userId: string): Promise<boolean> {
    const admin = await this.prisma.adminUser.findUnique({ where: { userId } });
    const customerOrders = await this.prisma.order.count({ where: { userId } });
    // Still show admins who also shop; only hide pure-admin with no commerce activity if desired.
    // Prefer: never hide if they have corporate/customer data.
    void admin;
    void customerOrders;
    return false;
  }

  async updateProfile(
    customerId: string,
    dto: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      companyName?: string;
      taxNumber?: string;
      taxOffice?: string;
      allowCredit?: boolean;
      creditLimit?: string | null;
      paymentTermDays?: number;
    },
    adminUserId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: customerId },
      include: { corporateCustomer: true },
    });
    if (!user) throw new NotFoundException('Customer not found');

    const updated = await this.prisma.user.update({
      where: { id: customerId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone === undefined ? undefined : dto.phone,
      },
    });

    if (user.userType === UserType.CORPORATE && user.corporateCustomer) {
      await this.prisma.corporateCustomer.update({
        where: { userId: customerId },
        data: {
          companyName: dto.companyName,
          taxNumber: dto.taxNumber,
          taxOffice: dto.taxOffice,
          allowCredit: dto.allowCredit,
          creditLimit:
            dto.creditLimit === undefined
              ? undefined
              : dto.creditLimit === null
                ? null
                : new Prisma.Decimal(dto.creditLimit),
          paymentTermDays: dto.paymentTermDays,
        },
      });
    }

    await this.audit.log({
      adminUserId,
      action: 'CUSTOMER_UPDATED',
      entityType: 'User',
      entityId: customerId,
      metadata: dto,
    });

    return this.getDetail(updated.id);
  }

  async updateStatus(
    customerId: string,
    status: UserStatus,
    adminUserId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: customerId },
    });
    if (!user) throw new NotFoundException('Customer not found');

    if (status !== UserStatus.ACTIVE) {
      const adminUser = await this.prisma.adminUser.findUnique({
        where: { userId: customerId },
        include: { roles: { include: { role: true } } },
      });
      const isSuperAdmin = adminUser?.roles.some(
        (item) => item.role.code === AdminRoleCode.SUPER_ADMIN,
      );
      if (isSuperAdmin) {
        const superAdminCount = await this.prisma.adminUserRole.count({
          where: { role: { code: AdminRoleCode.SUPER_ADMIN } },
        });
        if (superAdminCount <= 1) {
          throw new ConflictException(
            'Cannot deactivate or block the last SUPER_ADMIN',
          );
        }
      }
    }

    await this.prisma.user.update({
      where: { id: customerId },
      data: { status },
    });

    const action =
      status === UserStatus.ACTIVE
        ? 'CUSTOMER_ACTIVATED'
        : status === UserStatus.BLOCKED
          ? 'CUSTOMER_BLOCKED'
          : 'CUSTOMER_DEACTIVATED';

    await this.audit.log({
      adminUserId,
      action,
      entityType: 'User',
      entityId: customerId,
      metadata: { status, previous: user.status },
    });

    return this.getDetail(customerId);
  }

  async listOrders(customerId: string, page = 1, limit = 20) {
    await this.ensureCustomer(customerId);
    const where = { userId: customerId };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include: {
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    const summary = await this.prisma.order.aggregate({
      where: { userId: customerId, status: { not: 'CANCELLED' } },
      _sum: { totalAmount: true },
      _count: true,
    });
    const paid = await this.prisma.payment.aggregate({
      where: { order: { userId: customerId }, status: PaymentStatus.PAID },
      _sum: { amount: true },
    });
    const pending = await this.prisma.payment.aggregate({
      where: { order: { userId: customerId }, status: PaymentStatus.PENDING },
      _sum: { amount: true },
    });

    return {
      ...buildPaginatedResponse(
        items.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          createdAt: o.createdAt,
          totalAmount: toMoneyString(o.totalAmount),
          status: o.status,
          paymentStatus: o.payments[0]?.status ?? null,
          paymentMethod: o.payments[0]?.method ?? null,
          dueDate: o.dueDate,
        })),
        total,
        page,
        limit,
      ),
      aggregates: {
        orderCount: summary._count,
        totalAmount: toMoneyString(summary._sum.totalAmount ?? 0),
        paidAmount: toMoneyString(paid._sum.amount ?? 0),
        pendingAmount: toMoneyString(pending._sum.amount ?? 0),
      },
    };
  }

  async inviteCorporate(
    dto: {
      email: string;
      firstName: string;
      lastName: string;
      phone?: string;
      companyName: string;
      taxNumber: string;
      taxOffice: string;
      allowCredit?: boolean;
      creditLimit?: string;
      paymentTermDays?: number;
    },
    adminUserId: string,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    // Unusable random password — customer activates via reset/invite email.
    const tempPassword = randomBytes(32).toString('hex');
    const passwordHash = await argon2.hash(tempPassword);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        userType: UserType.CORPORATE,
        status: UserStatus.ACTIVE,
      },
    });

    await this.customers.createCorporateProfile({
      userId: user.id,
      companyName: dto.companyName,
      taxNumber: dto.taxNumber,
      taxOffice: dto.taxOffice,
    });

    if (
      dto.allowCredit !== undefined ||
      dto.creditLimit !== undefined ||
      dto.paymentTermDays !== undefined
    ) {
      await this.prisma.corporateCustomer.update({
        where: { userId: user.id },
        data: {
          allowCredit: dto.allowCredit ?? false,
          creditLimit: dto.creditLimit
            ? new Prisma.Decimal(dto.creditLimit)
            : null,
          paymentTermDays: dto.paymentTermDays ?? 0,
        },
      });
    }

    await this.emailOutbox.enqueue({
      event: 'ACCOUNT_INVITATION',
      toEmail: user.email,
      subject: 'Anamur Acil Medikal hesabınız oluşturuldu.',
      eventKey: `ACCOUNT_INVITATION:user:${user.id}:${user.email.toLowerCase()}`,
      payload: {
        firstName: user.firstName,
        customerName: user.firstName,
        message:
          'Hesabınız oluşturuldu. Şifrenizi belirlemek için şifre sıfırlama akışını kullanın.',
        invite: true,
      },
    });

    await this.audit.log({
      adminUserId,
      action: 'CUSTOMER_CREATED',
      entityType: 'User',
      entityId: user.id,
      metadata: { email: user.email, userType: UserType.CORPORATE },
    });

    return this.getDetail(user.id);
  }

  async exportCsv(query: { search?: string; filter?: CustomerListFilter }) {
    const result = await this.list({
      page: 1,
      limit: 5000,
      search: query.search,
      filter: query.filter,
    });
    const header =
      'Customer,Type,Company,Email,Phone,Balance,Order Count,Created At,Status';
    const rows = result.items.map((c) =>
      [
        csvEscape(`${c.firstName} ${c.lastName}`),
        c.userType,
        csvEscape(c.companyName ?? ''),
        csvEscape(c.email),
        csvEscape(c.phone ?? ''),
        c.balance,
        String(c.orderCount),
        c.createdAt.toISOString(),
        c.status,
      ].join(','),
    );
    return [header, ...rows].join('\n');
  }

  async importCustomers(
    rows: Array<{
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      userType?: string;
      companyName?: string;
      taxNumber?: string;
      taxOffice?: string;
    }>,
    adminUserId: string,
  ) {
    const results: Array<{
      row: number;
      email: string;
      status: 'created' | 'skipped' | 'error';
      error?: string;
    }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.email || !row.firstName || !row.lastName) {
          results.push({
            row: i + 1,
            email: row.email ?? '',
            status: 'error',
            error: 'firstName, lastName, email required',
          });
          continue;
        }
        const existing = await this.prisma.user.findUnique({
          where: { email: row.email.toLowerCase() },
        });
        if (existing) {
          results.push({
            row: i + 1,
            email: row.email,
            status: 'skipped',
            error: 'already exists',
          });
          continue;
        }
        const userType =
          row.userType?.toUpperCase() === 'CORPORATE'
            ? UserType.CORPORATE
            : UserType.INDIVIDUAL;
        if (userType === UserType.CORPORATE) {
          if (!row.companyName || !row.taxNumber || !row.taxOffice) {
            results.push({
              row: i + 1,
              email: row.email,
              status: 'error',
              error: 'corporate requires companyName, taxNumber, taxOffice',
            });
            continue;
          }
        }
        const tempPassword = randomBytes(32).toString('hex');
        const passwordHash = await argon2.hash(tempPassword);
        const user = await this.prisma.user.create({
          data: {
            email: row.email.toLowerCase(),
            passwordHash,
            firstName: row.firstName,
            lastName: row.lastName,
            phone: row.phone,
            userType,
            status: UserStatus.INACTIVE,
          },
        });
        if (userType === UserType.CORPORATE) {
          await this.customers.createCorporateProfile({
            userId: user.id,
            companyName: row.companyName!,
            taxNumber: row.taxNumber!,
            taxOffice: row.taxOffice!,
          });
        }
        await this.emailOutbox.enqueue({
          event: 'CUSTOMER_INVITE',
          toEmail: user.email,
          subject: 'Anamur Acil Medikal hesabınız oluşturuldu.',
          payload: {
            firstName: user.firstName,
            invite: true,
            activationRequired: true,
          },
        });
        results.push({ row: i + 1, email: row.email, status: 'created' });
      } catch (error) {
        results.push({
          row: i + 1,
          email: row.email ?? '',
          status: 'error',
          error: error instanceof Error ? error.message : 'failed',
        });
      }
    }

    await this.audit.log({
      adminUserId,
      action: 'CUSTOMER_IMPORT',
      entityType: 'User',
      entityId: null,
      metadata: {
        total: rows.length,
        created: results.filter((r) => r.status === 'created').length,
        skipped: results.filter((r) => r.status === 'skipped').length,
        errors: results.filter((r) => r.status === 'error').length,
      },
    });

    return { results };
  }

  private async ensureCustomer(customerId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: customerId },
    });
    if (!user) throw new NotFoundException('Customer not found');
  }
}

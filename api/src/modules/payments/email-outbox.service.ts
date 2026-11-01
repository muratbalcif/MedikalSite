import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OutboxStatus, Prisma } from '@prisma/client';
import {
  PaginatedResponseDto,
  buildPaginatedResponse,
} from '../../common/dto/pagination.dto';
import { EnvironmentVariables } from '../../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildTransactionalEmail,
  isCriticalEmailEvent,
  isMarketingEmailEvent,
  resolveTemplateKey,
} from './email-templates';

type SendResult =
  | { ok: true; providerMessageId?: string }
  | { ok: false; error: string; retryable: boolean };

/** How long a PROCESSING claim is exclusive before another worker may reclaim. */
const CLAIM_LEASE_MS = 5 * 60 * 1000;

/** Exponential-style backoff minutes: attempt 1→1m, 2→5m, 3→15m, 4→30m, 5→60m */
const BACKOFF_MINUTES = [1, 5, 15, 30, 60] as const;

const MARKETING_EVENT_FILTER = {
  NOT: {
    OR: [
      { event: { startsWith: 'CAMPAIGN_' } },
      { event: { equals: 'CAMPAIGN' } },
      { event: { equals: 'MARKETING' } },
      { event: { contains: 'PROMO' } },
    ],
  },
};

/**
 * Email delivery is intentionally outside order/payment DB transactions.
 * Rows are claimed atomically (status → PROCESSING) so multi-instance
 * workers cannot double-send. processedAt is set only after successful send.
 */
@Injectable()
export class EmailOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailOutboxService.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly maxAttempts: number;
  private warnedMissingProvider = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.maxAttempts =
      this.config.get('EMAIL_OUTBOX_MAX_ATTEMPTS', { infer: true }) ?? 5;
  }

  onModuleInit(): void {
    const nodeEnv = this.config.get('NODE_ENV', { infer: true });
    if (nodeEnv === 'production' && !this.isProviderConfigured()) {
      this.logger.error(
        'notification.email.config_missing: RESEND_API_KEY and from-address (RESEND_FROM_EMAIL or EMAIL_FROM) are required in production',
      );
    }
    this.timer = setInterval(() => {
      void this.processPending(30);
    }, 60 * 1000);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  isProviderConfigured(): boolean {
    const apiKey = this.config.get('RESEND_API_KEY', { infer: true });
    const from = this.resolveFromAddress();
    return Boolean(apiKey?.trim() && from?.trim());
  }

  /**
   * Enqueue a transactional (or marketing) email. Idempotent when eventKey is set.
   * Never throws on duplicate eventKey (P2002) — returns { created: false }.
   */
  async enqueue(input: {
    event: string;
    toEmail: string;
    subject: string;
    payload: Record<string, unknown>;
    eventKey?: string;
    correlationId?: string;
  }): Promise<{ created: boolean }> {
    const eventKey =
      input.eventKey ??
      this.buildEventKey(input.event, input.toEmail, input.payload);

    try {
      await this.prisma.emailOutbox.create({
        data: {
          event: input.event,
          eventKey,
          toEmail: input.toEmail,
          subject: input.subject,
          payload: {
            ...input.payload,
            ...(input.correlationId
              ? { correlationId: input.correlationId }
              : {}),
          },
          status: OutboxStatus.PENDING,
          availableAt: new Date(),
        },
      });
      this.logger.log(
        `notification.created channel=email event=${input.event} eventKey=${eventKey}`,
      );
      return { created: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.debug(
          `notification.idempotent_skip channel=email eventKey=${eventKey}`,
        );
        return { created: false };
      }
      throw error;
    }
  }

  async enqueueOrderEmail(input: {
    event: string;
    toEmail: string;
    customerName: string;
    orderId: string;
    orderNumber: string;
    status: string;
    totalAmount?: string;
    trackingUrl?: string;
    trackingNumber?: string;
    userId?: string;
  }): Promise<{ created: boolean }> {
    const templateEvent = this.mapOrderEventToTemplate(input.event);
    const allowed = await this.shouldSendEmailForUser(
      input.userId,
      templateEvent,
    );
    if (!allowed) {
      this.logger.debug(
        `notification.skipped channel=email event=${templateEvent} reason=preference`,
      );
      return { created: false };
    }

    const siteName =
      this.config.get('SITE_NAME', { infer: true }) || 'ANAMUR ACİL MEDİKAL & ANAMUR İŞİTME MERKEZİ';
    const support =
      this.config.get('SITE_SUPPORT_EMAIL', { infer: true }) || undefined;
    const webBase =
      this.config.get('CORS_ORIGINS', { infer: true })?.split(',')[0]?.trim() ||
      'https://furkansogutma.net';
    const actionUrl = `${webBase.replace(/\/$/, '')}/account/orders/${input.orderId}`;

    const built = buildTransactionalEmail(templateEvent, {
      siteName,
      supportEmail: support,
      siteUrl: webBase,
      customerName: input.customerName,
      orderNumber: input.orderNumber,
      orderId: input.orderId,
      statusLabel: input.status,
      amount: input.totalAmount,
      trackingUrl: input.trackingUrl,
      trackingNumber: input.trackingNumber,
      ctaUrl: actionUrl,
    });

    return this.enqueue({
      event: templateEvent,
      toEmail: input.toEmail,
      subject:
        built.subject || `${siteName} — ${input.orderNumber}: ${input.status}`,
      eventKey: `${templateEvent}:order:${input.orderId}:${input.toEmail.toLowerCase()}`,
      payload: {
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        status: input.status,
        html: built.html,
        text: built.text,
        templateKey: resolveTemplateKey(templateEvent),
        customerName: input.customerName,
        totalAmount: input.totalAmount,
        trackingUrl: input.trackingUrl,
        trackingNumber: input.trackingNumber,
      },
    });
  }

  async processPending(limit = 30): Promise<number> {
    const now = new Date();
    // Prefer transactional over marketing so campaigns never starve order emails.
    const transactional = await this.findEligible(
      now,
      Math.ceil(limit * 0.8),
      true,
    );
    const remaining = Math.max(0, limit - transactional.length);
    const marketing =
      remaining > 0 ? await this.findEligible(now, remaining, false) : [];
    const pending = [...transactional, ...marketing];

    let processed = 0;
    for (const item of pending) {
      const claimed = await this.claim(item.id, now);
      if (!claimed) {
        continue;
      }

      this.logger.log(
        `notification.processing channel=email id=${item.id} event=${item.event} attempt=${item.attempts + 1}`,
      );

      const { html, text } = this.resolveBody(item);

      try {
        const result = await this.sendEmail({
          to: item.toEmail,
          subject: item.subject,
          html,
          text,
        });

        if (result.ok) {
          const sentAt = new Date();
          await this.prisma.emailOutbox.update({
            where: { id: item.id },
            data: {
              status: OutboxStatus.SENT,
              processedAt: sentAt,
              sentAt,
              lastAttemptAt: sentAt,
              attempts: { increment: 1 },
              lastError: null,
              failedAt: null,
              providerMessageId: result.providerMessageId ?? null,
            },
          });
          this.logger.log(
            `notification.sent channel=email id=${item.id} event=${item.event} providerMessageId=${result.providerMessageId ?? 'n/a'}`,
          );
          processed += 1;
          continue;
        }

        await this.markFailed(item.id, item.attempts + 1, result.error);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown email error';
        await this.markFailed(item.id, item.attempts + 1, message);
      }
    }
    return processed;
  }

  /**
   * Atomic exclusive claim. Returns false if another worker already owns the row.
   */
  async claim(id: string, now = new Date()): Promise<boolean> {
    const leaseUntil = new Date(now.getTime() + CLAIM_LEASE_MS);
    const claimed = await this.prisma.emailOutbox.updateMany({
      where: {
        id,
        processedAt: null,
        OR: [
          { status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED] } },
          { status: OutboxStatus.PROCESSING, availableAt: { lte: now } },
        ],
      },
      data: {
        status: OutboxStatus.PROCESSING,
        availableAt: leaseUntil,
        lastAttemptAt: now,
      },
    });
    return claimed.count === 1;
  }

  /**
   * Admin retry: reset a FAILED (or exhausted) row to PENDING without duplicating.
   * Idempotent — already PENDING/PROCESSING with attempts left is a no-op success.
   */
  async retry(id: string): Promise<{
    id: string;
    status: OutboxStatus;
    attempts: number;
  }> {
    const row = await this.prisma.emailOutbox.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Email outbox item not found');
    }
    if (row.status === OutboxStatus.SENT && row.processedAt) {
      return { id: row.id, status: row.status, attempts: row.attempts };
    }
    if (
      row.status === OutboxStatus.PENDING ||
      (row.status === OutboxStatus.PROCESSING && row.availableAt > new Date())
    ) {
      return { id: row.id, status: row.status, attempts: row.attempts };
    }

    const updated = await this.prisma.emailOutbox.update({
      where: { id },
      data: {
        status: OutboxStatus.PENDING,
        availableAt: new Date(),
        processedAt: null,
        failedAt: null,
        lastError: null,
        // Keep attempts so history is visible; allow one more cycle up to max.
        attempts: Math.min(row.attempts, this.maxAttempts - 1),
      },
    });
    this.logger.log(`notification.retrying channel=email id=${id}`);
    void this.processPending(5);
    return {
      id: updated.id,
      status: updated.status,
      attempts: updated.attempts,
    };
  }

  async listAdmin(query: {
    page?: number;
    limit?: number;
    status?: OutboxStatus;
    event?: string;
    toEmail?: string;
    from?: string;
    to?: string;
  }): Promise<
    PaginatedResponseDto<{
      id: string;
      event: string;
      eventKey: string | null;
      toEmail: string;
      subject: string;
      status: OutboxStatus;
      attempts: number;
      lastError: string | null;
      providerMessageId: string | null;
      createdAt: Date;
      sentAt: Date | null;
      failedAt: Date | null;
      lastAttemptAt: Date | null;
      nextAttemptAt: Date;
    }>
  > {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.EmailOutboxWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.event
        ? { event: { contains: query.event, mode: 'insensitive' } }
        : {}),
      ...(query.toEmail
        ? { toEmail: { contains: query.toEmail, mode: 'insensitive' } }
        : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.emailOutbox.count({ where }),
      this.prisma.emailOutbox.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return buildPaginatedResponse(
      items.map((item) => ({
        id: item.id,
        event: item.event,
        eventKey: item.eventKey,
        toEmail: item.toEmail,
        subject: item.subject,
        status: item.status,
        attempts: item.attempts,
        lastError: item.lastError,
        providerMessageId: item.providerMessageId,
        createdAt: item.createdAt,
        sentAt: item.sentAt,
        failedAt: item.failedAt,
        lastAttemptAt: item.lastAttemptAt,
        nextAttemptAt: item.availableAt,
      })),
      total,
      page,
      limit,
    );
  }

  async getAdminById(id: string) {
    const item = await this.prisma.emailOutbox.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException('Email outbox item not found');
    }
    return {
      id: item.id,
      event: item.event,
      eventKey: item.eventKey,
      toEmail: item.toEmail,
      subject: item.subject,
      status: item.status,
      attempts: item.attempts,
      lastError: item.lastError,
      providerMessageId: item.providerMessageId,
      createdAt: item.createdAt,
      sentAt: item.sentAt,
      failedAt: item.failedAt,
      lastAttemptAt: item.lastAttemptAt,
      nextAttemptAt: item.availableAt,
      payloadMeta: this.safePayloadMeta(item.payload),
    };
  }

  async summary(): Promise<{
    pending: number;
    processing: number;
    retrying: number;
    sentToday: number;
    failedToday: number;
    emailTotal: number;
  }> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const now = new Date();

    const [pending, processing, retrying, sentToday, failedToday, emailTotal] =
      await Promise.all([
        this.prisma.emailOutbox.count({
          where: { status: OutboxStatus.PENDING, processedAt: null },
        }),
        this.prisma.emailOutbox.count({
          where: { status: OutboxStatus.PROCESSING },
        }),
        this.prisma.emailOutbox.count({
          where: {
            status: OutboxStatus.FAILED,
            processedAt: null,
            attempts: { lt: this.maxAttempts },
            availableAt: { gt: now },
          },
        }),
        this.prisma.emailOutbox.count({
          where: {
            status: OutboxStatus.SENT,
            sentAt: { gte: startOfDay },
          },
        }),
        this.prisma.emailOutbox.count({
          where: {
            status: OutboxStatus.FAILED,
            OR: [
              { failedAt: { gte: startOfDay } },
              { failedAt: null, createdAt: { gte: startOfDay } },
            ],
          },
        }),
        this.prisma.emailOutbox.count(),
      ]);

    return {
      pending,
      processing,
      retrying,
      sentToday,
      failedToday,
      emailTotal,
    };
  }

  /** Whether email channel is allowed for this user/event (SECURITY always on). */
  async shouldSendEmailForUser(
    userId: string | undefined,
    event: string,
  ): Promise<boolean> {
    if (isCriticalEmailEvent(event)) {
      return true;
    }
    if (!userId) {
      return true;
    }
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (!prefs) {
      return true;
    }
    if (isMarketingEmailEvent(event)) {
      return prefs.marketingEmailOptIn && prefs.emailEnabled;
    }
    return prefs.emailEnabled;
  }

  /** Exposed for tests — sends via Resend when configured. */
  async sendEmail(input: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<SendResult> {
    const apiKey = this.config.get('RESEND_API_KEY', { infer: true })?.trim();
    const from = this.resolveFromAddress();
    const fromName = this.config
      .get('RESEND_FROM_NAME', { infer: true })
      ?.trim();
    const replyTo = this.config.get('RESEND_REPLY_TO', { infer: true })?.trim();
    const nodeEnv = this.config.get('NODE_ENV', { infer: true });

    if (!apiKey || !from) {
      const devMock =
        this.config.get('EMAIL_DEV_MOCK', { infer: true }) === true;
      if (devMock && nodeEnv !== 'production') {
        this.logger.debug(
          `notification.dev_mock channel=email to=${this.maskEmail(input.to)} subject=${input.subject.slice(0, 80)}`,
        );
        return { ok: true, providerMessageId: `dev-mock-${Date.now()}` };
      }
      if (!this.warnedMissingProvider) {
        this.warnedMissingProvider = true;
        this.logger.error(
          'notification.email.config_missing: set RESEND_API_KEY and RESEND_FROM_EMAIL (or EMAIL_FROM)',
        );
      }
      return {
        ok: false,
        error: 'Email provider not configured (RESEND_API_KEY / from address)',
        retryable: true,
      };
    }

    const fromHeader = fromName ? `${fromName} <${from}>` : from;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        from: fromHeader,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        ...(input.text ? { text: input.text } : {}),
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        error: `Resend HTTP ${response.status}: ${text.slice(0, 300)}`,
        retryable: response.status >= 500 || response.status === 429,
      };
    }

    let providerMessageId: string | undefined;
    try {
      const data = (await response.json()) as { id?: string };
      providerMessageId = data.id;
    } catch {
      providerMessageId = undefined;
    }

    return { ok: true, providerMessageId };
  }

  private async findEligible(
    now: Date,
    limit: number,
    transactionalOnly: boolean,
  ) {
    const marketingFilter = transactionalOnly
      ? MARKETING_EVENT_FILTER
      : {
          OR: [
            { event: { startsWith: 'CAMPAIGN_' } },
            { event: { equals: 'CAMPAIGN' } },
            { event: { equals: 'MARKETING' } },
            { event: { contains: 'PROMO' } },
          ],
        };

    return this.prisma.emailOutbox.findMany({
      where: {
        processedAt: null,
        attempts: { lt: this.maxAttempts },
        AND: [marketingFilter],
        OR: [
          {
            status: { in: [OutboxStatus.PENDING, OutboxStatus.FAILED] },
            availableAt: { lte: now },
          },
          {
            status: OutboxStatus.PROCESSING,
            availableAt: { lte: now },
          },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
  }

  private async markFailed(
    id: string,
    attempts: number,
    error: string,
  ): Promise<void> {
    const exhausted = attempts >= this.maxAttempts;
    const backoffMs = this.backoffMs(attempts);
    const now = new Date();
    await this.prisma.emailOutbox.update({
      where: { id },
      data: {
        status: OutboxStatus.FAILED,
        attempts,
        lastError: error.slice(0, 500),
        lastAttemptAt: now,
        failedAt: exhausted ? now : null,
        availableAt: exhausted ? now : new Date(Date.now() + backoffMs),
        processedAt: null,
      },
    });
    this.logger.warn(
      exhausted
        ? `notification.failed channel=email id=${id} attempts=${attempts} error=${error.slice(0, 120)}`
        : `notification.retrying channel=email id=${id} attempts=${attempts} nextInMs=${backoffMs}`,
    );
  }

  private backoffMs(attempts: number): number {
    const idx = Math.min(Math.max(attempts - 1, 0), BACKOFF_MINUTES.length - 1);
    return BACKOFF_MINUTES[idx] * 60_000;
  }

  private resolveFromAddress(): string | undefined {
    return (
      this.config.get('RESEND_FROM_EMAIL', { infer: true })?.trim() ||
      this.config.get('EMAIL_FROM', { infer: true })?.trim() ||
      undefined
    );
  }

  private buildEventKey(
    event: string,
    toEmail: string,
    payload: Record<string, unknown>,
  ): string {
    const ref =
      (typeof payload.orderId === 'string' && payload.orderId) ||
      (typeof payload.transferId === 'string' && payload.transferId) ||
      (typeof payload.paymentId === 'string' && payload.paymentId) ||
      (typeof payload.userId === 'string' && payload.userId) ||
      'na';
    return `${event}:${ref}:${toEmail.toLowerCase()}`;
  }

  private mapOrderEventToTemplate(event: string): string {
    const upper = event.toUpperCase().replace(/-/g, '_');
    const aliases: Record<string, string> = {
      ORDERCREATED: 'ORDER_CREATED',
      ORDER_CREATED: 'ORDER_CREATED',
      ORDERCONFIRMED: 'ORDER_CONFIRMED',
      ORDER_CONFIRMED: 'ORDER_CONFIRMED',
      ORDERSHIPPED: 'ORDER_SHIPPED',
      ORDER_SHIPPED: 'ORDER_SHIPPED',
      ORDERDELIVERED: 'ORDER_DELIVERED',
      ORDER_DELIVERED: 'ORDER_DELIVERED',
      ORDERCANCELLED: 'ORDER_CANCELLED',
      ORDER_CANCELLED: 'ORDER_CANCELLED',
      PAYMENTEXPIRED: 'PAYMENT_EXPIRED',
      PAYMENT_EXPIRED: 'PAYMENT_EXPIRED',
    };
    const compact = upper.replace(/_/g, '');
    return aliases[upper] ?? aliases[compact] ?? upper;
  }

  private resolveBody(item: {
    event: string;
    subject: string;
    payload: Prisma.JsonValue;
  }): { html: string; text?: string } {
    const payload =
      item.payload &&
      typeof item.payload === 'object' &&
      !Array.isArray(item.payload)
        ? (item.payload as Record<string, unknown>)
        : {};
    const html =
      typeof payload.html === 'string'
        ? payload.html
        : buildTransactionalEmail(item.event, {
            title: item.subject,
            message: `Event: ${item.event}`,
            orderNumber:
              typeof payload.orderNumber === 'string'
                ? payload.orderNumber
                : undefined,
            amount:
              typeof payload.amount === 'string' ? payload.amount : undefined,
          }).html;
    const text = typeof payload.text === 'string' ? payload.text : undefined;
    return { html, text };
  }

  private safePayloadMeta(payload: Prisma.JsonValue): Record<string, unknown> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {};
    }
    const src = payload as Record<string, unknown>;
    const meta: Record<string, unknown> = {};
    for (const key of [
      'orderId',
      'orderNumber',
      'transferId',
      'paymentId',
      'correlationId',
      'templateKey',
      'status',
    ]) {
      if (src[key] !== undefined) {
        meta[key] = src[key];
      }
    }
    return meta;
  }

  private maskEmail(email: string): string {
    const [user, domain] = email.split('@');
    if (!domain) return '***';
    const safeUser =
      user.length <= 2
        ? '*'.repeat(user.length)
        : `${user[0]}***${user.slice(-1)}`;
    return `${safeUser}@${domain}`;
  }
}

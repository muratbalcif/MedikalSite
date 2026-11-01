import Link from "next/link";
import { serverApiFetch } from "@/lib/api/server";
import { orderStatusLabel, userTypeLabel } from "@/lib/order-labels";
import type { AuthUser, Paginated } from "@/types/api";

export default async function AccountPage() {
  const user = await serverApiFetch<AuthUser>("/auth/me").catch(() => null);
  const orders = await serverApiFetch<
    Paginated<{
      id: string;
      orderNumber: string;
      status: string;
      totalAmount: string;
      createdAt: string;
    }>
  >("/orders?page=1&limit=5").catch(() => ({
    items: [],
    meta: { page: 1, limit: 5, total: 0, totalPages: 0 },
  }));

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-navy">
        Hesabım
      </h1>
      {user ? (
        <div className="rounded-lg border bg-white p-4 text-sm">
          <p className="font-semibold">
            {user.firstName} {user.lastName}
          </p>
          <p>{user.email}</p>
          <p className="text-slate-500">{userTypeLabel(user.userType)}</p>
        </div>
      ) : null}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Son siparişler</h2>
          <Link href="/account/orders" className="text-sm text-primary">
            Tümü
          </Link>
        </div>
        <ul className="space-y-2">
          {orders.items.map((order) => (
            <li key={order.id} className="rounded border bg-white p-3 text-sm">
              <Link href={`/account/orders/${order.id}`} className="font-medium">
                {order.orderNumber}
              </Link>
              <span className="ml-2 text-slate-500">
                {orderStatusLabel(order.status)}
              </span>
            </li>
          ))}
          {orders.items.length === 0 ? (
            <p className="text-sm text-slate-500">Henüz sipariş yok.</p>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

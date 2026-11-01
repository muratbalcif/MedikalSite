"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ModulePage } from "@/components/auth/module-page";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api-client";
import {
  rbacService,
  type AdminRbacUser,
} from "@/services/admin-api.service";

export default function SettingsPage() {
  const { user } = useAuth();
  const isSuperAdmin = (user?.roles ?? []).includes("SUPER_ADMIN");
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [roleCode, setRoleCode] = useState("PRODUCT_MANAGER");
  const [lookupResult, setLookupResult] = useState<AdminRbacUser | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rolesQuery = useQuery({
    queryKey: ["admin-rbac-roles"],
    queryFn: () => rbacService.listRoles(),
    enabled: isSuperAdmin,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-rbac-users"],
    queryFn: () => rbacService.listUsers(),
    enabled: isSuperAdmin,
  });

  const assignMutation = useMutation({
    mutationFn: () => rbacService.assignByEmail(email.trim(), roleCode),
    onSuccess: (data) => {
      setLookupResult(data);
      setMessage(`${data.email} kullanıcısına ${roleCode} atandı.`);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-rbac-users"] });
    },
    onError: (err: unknown) => {
      setMessage(null);
      setError(err instanceof ApiError ? err.message : "Rol atanamadı");
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({
      userId,
      code,
    }: {
      userId: string;
      code: string;
    }) => rbacService.removeRole(userId, code),
    onSuccess: () => {
      setMessage("Rol kaldırıldı.");
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-rbac-users"] });
    },
    onError: (err: unknown) => {
      setMessage(null);
      setError(err instanceof ApiError ? err.message : "Rol kaldırılamadı");
    },
  });

  async function onLookup(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      const found = await rbacService.lookup(email.trim());
      setLookupResult(found);
    } catch (err) {
      setLookupResult(null);
      setError(err instanceof ApiError ? err.message : "Kullanıcı bulunamadı");
    }
  }

  return (
    <ModulePage>
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Oturum
          </h3>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Ad</dt>
              <dd className="font-medium">
                {user?.firstName} {user?.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">E-posta</dt>
              <dd className="font-medium">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">API</dt>
              <dd className="font-mono text-xs">
                {process.env.NEXT_PUBLIC_API_BASE_URL}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Roller
          </h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {(user?.roles ?? []).map((role) => (
              <li
                key={role}
                className="rounded-md bg-slate-900 px-2 py-1 text-xs text-[#f0f5f8]"
              >
                {role}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            İzinler (RBAC)
          </h3>
          <ul className="mt-3 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {(user?.permissions ?? []).map((code) => (
              <li
                key={code}
                className="rounded border border-slate-200 px-2 py-1 font-mono text-xs text-slate-700"
              >
                {code}
              </li>
            ))}
          </ul>
        </div>

        {isSuperAdmin ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold">
              Rol atama
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Yalnızca SUPER_ADMIN kullanıcılarına rol atayabilir / kaldırabilir.
            </p>

            <form
              onSubmit={onLookup}
              className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <label className="flex-1 text-sm">
                <span className="text-slate-500">Kullanıcı e-posta</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                  placeholder="user@example.com"
                />
              </label>
              <button
                type="submit"
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
              >
                Ara
              </button>
            </form>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="text-sm">
                <span className="text-slate-500">Rol</span>
                <select
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value)}
                  className="mt-1 block rounded-md border border-slate-300 px-3 py-2"
                >
                  {(rolesQuery.data ?? []).map((role) => (
                    <option key={role.code} value={role.code}>
                      {role.code}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={!email.trim() || assignMutation.isPending}
                onClick={() => assignMutation.mutate()}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                {assignMutation.isPending ? "Atanıyor…" : "Rol ata"}
              </button>
            </div>

            {lookupResult ? (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="font-medium">
                  {lookupResult.firstName} {lookupResult.lastName} —{" "}
                  {lookupResult.email}
                </p>
                <p className="mt-1 text-slate-600">
                  Mevcut roller:{" "}
                  {lookupResult.roles.length > 0
                    ? lookupResult.roles.join(", ")
                    : "yok"}
                </p>
              </div>
            ) : null}

            {message ? (
              <p className="mt-3 text-sm text-emerald-700">{message}</p>
            ) : null}
            {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-800">
                Admin kullanıcılar
              </h4>
              {usersQuery.isLoading ? (
                <p className="mt-2 text-sm text-slate-500">Yükleniyor…</p>
              ) : usersQuery.error ? (
                <p className="mt-2 text-sm text-red-700">Liste alınamadı</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {(usersQuery.data ?? []).map((row) => (
                    <li
                      key={row.userId}
                      className="flex flex-col gap-2 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {row.firstName} {row.lastName}
                        </p>
                        <p className="text-slate-500">{row.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {row.roles.map((code) => (
                          <span
                            key={code}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-xs text-[#f0f5f8]"
                          >
                            {code}
                            <button
                              type="button"
                              title={`${code} rolünü kaldır`}
                              className="ml-1 text-[#d9e8ef] hover:text-white"
                              disabled={removeMutation.isPending}
                              onClick={() =>
                                removeMutation.mutate({
                                  userId: row.userId,
                                  code,
                                })
                              }
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </ModulePage>
  );
}

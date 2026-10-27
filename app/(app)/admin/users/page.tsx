import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireLecturerPage } from "@/lib/server/page-guards";
import { Card, PageHeader } from "@/components/ui/card";
import { UserRowControls } from "@/components/admin/user-row-controls";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireLecturerPage();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const users = await db.user.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : undefined,
    orderBy: [{ appRole: "asc" }, { name: "asc" }],
    take: 200,
    include: { memberships: { where: { leftAt: null }, include: { team: { select: { name: true } } } } },
  });
  return (
    <div className="space-y-5">
      <PageHeader title="Users" subtitle="Everyone registers as a student; give staff their role here." />
      <Card>
        <form className="mb-4 flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name or e-mail"
            className="w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button className="rounded-md border border-slate-300 px-3 py-2 text-sm">Search</button>
        </form>
        <ul className="divide-y divide-slate-100">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <div>
                <div className="font-medium">{u.name}</div>
                <div className="text-xs text-slate-500">
                  {u.email}
                  {u.memberships.length > 0 && ` · ${u.memberships.map((m) => m.team.name).join(", ")}`}
                </div>
              </div>
              <UserRowControls userId={u.id} appRole={u.appRole} isActive={u.isActive} isSelf={u.id === me.userId} />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

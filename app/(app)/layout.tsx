import Link from "next/link";
import { signOut } from "@/lib/auth/config";
import { isLecturer, isStaff } from "@/lib/auth/permissions";
import { requirePageUser } from "@/lib/server/viewer";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requirePageUser();
  const links: { href: string; label: string }[] = [];
  if (user.appRole === "STUDENT") {
    links.push(
      { href: "/dashboard", label: "Dashboard" },
      { href: "/forms", label: "Forms" },
      { href: "/team", label: "Team" },
      { href: "/milestones", label: "Milestones" },
    );
  }
  if (isStaff(user)) links.push({ href: "/monitor", label: "Monitor" });
  if (isLecturer(user)) links.push({ href: "/admin", label: "Admin" }, { href: "/admin/users", label: "Users" });
  links.push({ href: "/reference", label: "Reference" });

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/" className="font-semibold text-slate-900">
            TSPi Workbook
          </Link>
          <nav className="flex flex-1 flex-wrap gap-1 text-sm">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded px-2 py-1 text-slate-700 hover:bg-slate-100">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden text-slate-600 sm:inline">{user.name}</span>
            <form action={doSignOut}>
              <button type="submit" className="rounded px-2 py-1 text-slate-700 hover:bg-slate-100">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}

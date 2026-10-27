import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/server/viewer";

export default async function Home() {
  const user = await requirePageUser();
  redirect(user.appRole === "STUDENT" ? "/dashboard" : user.appRole === "LECTURER" ? "/admin" : "/monitor");
}

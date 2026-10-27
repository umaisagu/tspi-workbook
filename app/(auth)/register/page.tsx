import type { Metadata } from "next";
import { getEnv } from "@/lib/env";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return <RegisterForm domains={getEnv().ALLOWED_EMAIL_DOMAINS} />;
}

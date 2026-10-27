import "server-only";
import nodemailer from "nodemailer";
import { getEnv } from "@/lib/env";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

/** Sends via SMTP. Without SMTP settings (local development only) the message is printed to the server log. */
export async function sendMail(mail: Mail): Promise<void> {
  const env = getEnv();
  if (!env.SMTP_HOST || !env.SMTP_FROM) {
    console.info(`[mail:dev] To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}`);
    return;
  }
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD ?? "" } : undefined,
  });
  await transport.sendMail({ from: env.SMTP_FROM, to: mail.to, subject: mail.subject, text: mail.text });
}

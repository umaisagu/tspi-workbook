import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TSPi Workbook", template: "%s · TSPi Workbook" },
  description: "TSPi forms, tracking and monitoring for TMA3084 Software Engineering Lab, UNIMAS",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Every page renders per request so Next can apply the CSP nonce from proxy.ts to its scripts.
  await connection();
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

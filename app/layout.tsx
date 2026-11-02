import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taskora — Crypto payments for work completed",
  description: "A crypto-first workspace for freelancers to manage jobs and prepare secure USDC and NEAR payment requests.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

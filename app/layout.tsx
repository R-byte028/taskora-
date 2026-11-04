import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taskora — Work tracking and NEAR testnet payment requests",
  description: "A workspace for freelancers to track client work and prepare NEAR testnet payment requests. USDC checkout and mainnet payments are not enabled.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

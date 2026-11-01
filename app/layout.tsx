import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taskora — Work done. Payments moving.",
  description: "A simpler way for independent professionals and small teams to manage jobs and get paid.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
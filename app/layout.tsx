import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GVR Voice Agent · Voxaris",
  description: "Zero-hallucination Retell voice agent for Government Vacation Rewards",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-100 antialiased">{children}</body>
    </html>
  );
}

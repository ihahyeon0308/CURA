import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CURA Seoul Hospital Guide",
  description: "Decision-support MVP for comparing Seoul hospitals, specialties, and treatment value signals.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

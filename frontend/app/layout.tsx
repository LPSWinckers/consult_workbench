import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Meridian | Projectwerkruimte",
  description: "Samen werken aan advies, met AI en projectcontext.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}

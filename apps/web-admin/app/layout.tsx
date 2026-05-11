import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noogym Web Admin",
  description: "Administracao SaaS Noogym para ginasios em Angola"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-AO">
      <body>{children}</body>
    </html>
  );
}

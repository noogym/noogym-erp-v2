import type { Metadata } from "next";
import "@noogym/admin/styles/globals.css";

export const metadata: Metadata = {
  title: "Noogym Web Admin",
  description: "Administracao SaaS Noogym para ginasios em Angola",
  icons: {
    icon: "/icon.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-AO">
      <body>{children}</body>
    </html>
  );
}

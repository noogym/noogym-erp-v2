import type { Metadata } from "next";
import "@noogym/admin/styles/globals.css";

export const metadata: Metadata = {
  title: "Noogym Web Admin",
  description: "Administracao SaaS Noogym para ginasios em Angola",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" }
    ],
    shortcut: "/favicon.ico",
    apple: "/icon.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-AO">
      <body>{children}</body>
    </html>
  );
}

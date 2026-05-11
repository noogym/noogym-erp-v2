"use client";

import { useEffect, useState } from "react";
import AdminApp from "@noogym/admin";

export function DesktopClient() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <AdminApp onlineOnly />;
}

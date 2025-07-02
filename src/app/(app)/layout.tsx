"use client";

import { AppLayout } from "@/components/app-layout";
import { ApiProvider } from "@/context/api-context";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ApiProvider>
      <AppLayout>{children}</AppLayout>
    </ApiProvider>
  );
}

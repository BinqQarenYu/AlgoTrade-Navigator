
"use client";

import { AppLayout } from "@/components/app-layout";
import { ApiProvider } from "@/context/api-context";
import { BotProvider } from "@/context/bot-context";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ApiProvider>
      <BotProvider>
        <AppLayout>{children}</AppLayout>
      </BotProvider>
    </ApiProvider>
  );
}

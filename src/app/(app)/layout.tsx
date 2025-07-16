
"use client";

import { AppLayout } from "@/components/app-layout";
import { ApiProvider } from "@/context/api-context";
import { BotProvider, useBot } from "@/context/bot-context";
import { StrategyRecommendation } from "@/components/trading-discipline/StrategyRecommendation";

function AppLayoutWithProviders({ children }: { children: React.ReactNode }) {
  const {
    showRecommendation,
    strategyRecommendation,
    activateRecommendedStrategy,
    dismissRecommendation,
  } = useBot();

  return (
    <>
      <StrategyRecommendation
        isOpen={showRecommendation}
        onOpenChange={(isOpen) => !isOpen && dismissRecommendation()}
        recommendation={strategyRecommendation}
        onActivate={activateRecommendedStrategy}
        onDismiss={dismissRecommendation}
      />
      <AppLayout>{children}</AppLayout>
    </>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <ApiProvider>
      <BotProvider>
        <AppLayoutWithProviders>{children}</AppLayoutWithProviders>
      </BotProvider>
    </ApiProvider>
  );
}

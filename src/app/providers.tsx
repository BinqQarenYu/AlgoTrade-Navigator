
"use client";

import { ApiProvider } from "@/context/api-context";
import { BotProvider, useBot } from "@/context/bot-context";
import { StrategyRecommendation } from "@/components/trading-discipline/StrategyRecommendation";

function AppStatefulWrapper({ children }: { children: React.ReactNode }) {
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
      {children}
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApiProvider>
      <BotProvider>
        <AppStatefulWrapper>{children}</AppStatefulWrapper>
      </BotProvider>
    </ApiProvider>
  );
}

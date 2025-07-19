
"use client";

import { ApiProvider } from "@/context/api-context";
import { BotProvider, useBot } from "@/context/bot-context";
import { DataManagerProvider } from "@/context/data-manager-context";
import { LabProvider } from "@/context/lab-context";
import { StrategyRecommendation } from "@/components/trading-discipline/StrategyRecommendation";
import { AuthProvider } from "@/context/auth-context";

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
    <AuthProvider>
        <ApiProvider>
        <BotProvider>
            <LabProvider>
                <DataManagerProvider>
                <AppStatefulWrapper>{children}</AppStatefulWrapper>
                </DataManagerProvider>
            </LabProvider>
        </BotProvider>
        </ApiProvider>
    </AuthProvider>
  );
}

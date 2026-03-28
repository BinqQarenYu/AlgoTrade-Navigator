/**
 * 🛰️ Sentinel Machine: Settings Vault (The Command Center)
 * Documentation: src/app/(app)/settings/README.md
 * Mission: System-wide configuration, API keys, and safety limits.
 */
"use client"

import React from "react"
import { useApi } from "@/context/api-context"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { GlobalPersistenceCard } from "./_components/global-persistence-card"
import { DataVaultCard } from "./_components/data-vault-card"
import { ApiConnectionCard } from "./_components/api-connection-card"
import { IpConfigCard } from "./_components/ip-config-card"
import { IntegrationsCard } from "./_components/integrations-card"
import { ApiProfilesCard } from "./_components/api-profiles-card"
import { RateLimitCard } from "./_components/rate-limit-card"
import { AiQuotaCard } from "./_components/ai-quota-card"
import { TestControlsCard } from "./_components/test-controls-card"

export default function SettingsPage() {
  const { isConnected } = useApi()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Tabs defaultValue="data-vault" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="data-vault">Data Vault</TabsTrigger>
          <TabsTrigger value="keys-connections">Keys & Connections</TabsTrigger>
          <TabsTrigger value="integrations">Integrations & AI</TabsTrigger>
          <TabsTrigger value="test-controls">Test Controls</TabsTrigger>
        </TabsList>

        <TabsContent value="data-vault" className="space-y-6">
          <GlobalPersistenceCard />
          <DataVaultCard isConnected={isConnected} />
        </TabsContent>

        <TabsContent value="keys-connections" className="space-y-6">
          <ApiProfilesCard />
          <ApiConnectionCard />
          <IpConfigCard />
          <RateLimitCard />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <IntegrationsCard />
          <AiQuotaCard />
        </TabsContent>

        <TabsContent value="test-controls" className="space-y-6">
          <TestControlsCard />
        </TabsContent>
      </Tabs>
    </div>
  )
}

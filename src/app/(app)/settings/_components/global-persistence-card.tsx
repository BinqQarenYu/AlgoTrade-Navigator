"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { HardDrive, CloudUpload, Loader2 } from "lucide-react"
import { useApi } from "@/context/api-context"

export function GlobalPersistenceCard() {
  const { saveToDisk } = useApi()
  const [isSaving, setIsSaving] = useState(false)

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900/80 border border-slate-800 p-6 rounded-3xl gap-4 shadow-2xl shadow-black/40 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent pointer-events-none" />
        <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <HardDrive className="text-primary h-6 w-6" />
                Global Persistence
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
                Backup your keys and profiles to the application server for permanent storage.
            </p>
        </div>
        <Button
            onClick={async () => {
                setIsSaving(true);
                await saveToDisk();
                setIsSaving(false);
            }}
            size="lg"
            disabled={isSaving}
            className="shadow-lg shadow-primary/20 rounded-2xl"
        >
            {isSaving ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
                <CloudUpload className="mr-2 h-5 w-5" />
            )}
            {isSaving ? "Saving..." : "Save Configuration to Server"}
        </Button>
    </div>
  )
}

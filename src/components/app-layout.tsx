
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  BarChart2, 
  BrainCircuit, 
  LayoutDashboard, 
  Settings, 
  Bot, 
  UserCheck, 
  Activity, 
  Flame, 
  Layers,
  Sparkles
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/research", label: "Research Lab", icon: BrainCircuit },
  { href: "/backtest", label: "Backtest Matrix", icon: BarChart2 },
  { href: "/live", label: "Live Trading", icon: Bot },
  { href: "/simulation", label: "Simulation", icon: Layers },
  { href: "/order-flow", label: "Order Flow", icon: Activity },
  { href: "/candlestick-patterns", label: "Pattern Screener", icon: Flame },
  { href: "/manual", label: "Manual Execution", icon: UserCheck },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const activeItem = menuItems.find((item) => pathname.startsWith(item.href))

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-border/40 bg-background/95 backdrop-blur-xl">
        <SidebarContent>
          <SidebarHeader className="p-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/15 border border-primary/30 rounded-xl shadow-lg shadow-primary/10">
                <Bot className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                  AlgoTrade Nav
                </h1>
                <p className="text-[10px] text-muted-foreground font-mono">QUANT v1.0 • PRO</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarMenu className="p-2 space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={{ children: item.label }}
                    className={cn(
                      "transition-all duration-200 rounded-xl px-3 py-2.5",
                      isActive 
                        ? "bg-primary/20 text-primary font-semibold border border-primary/30 shadow-md shadow-primary/10" 
                        : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Link href={item.href} prefetch={true} className="flex items-center gap-3">
                      <item.icon className={cn("h-4 w-4 transition-transform duration-200 group-hover:scale-110", isActive && "text-primary")} />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-border/40">
           <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono text-[11px]">ENGINE ACTIVE</span>
            </div>
            <Sparkles className="h-3.5 w-3.5 text-primary/60" />
           </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-20 flex items-center h-14 px-4 md:px-6 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <SidebarTrigger className="md:hidden mr-2" />
          <div className="flex-1 flex items-center justify-between">
            <h2 className="text-base md:text-lg font-semibold tracking-tight">
              {activeItem?.label || 'Dashboard'}
            </h2>
            <div className="flex items-center gap-2 text-xs font-mono px-3 py-1 bg-secondary/50 border border-white/10 rounded-full text-muted-foreground">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>LIVE FEED</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

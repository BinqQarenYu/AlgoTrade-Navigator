
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart2, BrainCircuit, LayoutDashboard, Settings, Bot, UserCheck, Activity, ShieldAlert } from "lucide-react"

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
import { ChildNodeStatus } from "@/components/child-node-status"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/backtest", label: "Backtest", icon: BarChart2 },
  { href: "/live", label: "Live Trading", icon: Bot },
  { href: "/manual", label: "Manual Trading", icon: UserCheck },
  { href: "/ai-research", label: "AI Research", icon: BrainCircuit },
  { href: "/radar", label: "Anomaly Radar", icon: ShieldAlert },
  { href: "/order-flow", label: "Order Flow", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const activeItem = menuItems.find((item) => pathname.startsWith(item.href))

  return (
    <SidebarProvider>
      <Sidebar className="border-r border-slate-800 bg-slate-950">
        <SidebarContent className="bg-slate-950">
          <SidebarHeader className="p-4 border-b border-slate-800/50">
            <div className="flex items-center gap-3">
               <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <Activity className="text-emerald-400 h-5 w-5" />
              </div>
              <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent drop-shadow-sm">
                AlgoTrade Nav
              </h1>
            </div>
          </SidebarHeader>
          <SidebarMenu className="mt-4 px-2 space-y-1">
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  tooltip={{ children: item.label }}
                  className={cn(
                    "transition-all duration-200",
                    pathname.startsWith(item.href) 
                      ? "bg-slate-800/80 text-emerald-400 border border-slate-700/50 shadow-sm" 
                      : "text-slate-400 hover:text-emerald-300 hover:bg-slate-900"
                  )}
                >
                  <Link href={item.href} className="flex items-center gap-3 py-2">
                    <item.icon className={cn("h-4 w-4", pathname.startsWith(item.href) ? "text-emerald-400" : "text-slate-500")} />
                    <span className="font-semibold">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 bg-slate-950 border-t border-slate-800/50">
           <div className="flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest uppercase text-slate-500">
            <Bot className="h-3 w-3" />
            <span>Navigator v2.0</span>
           </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="bg-[#0B0F19]">
        <header className="sticky top-0 z-10 flex items-center h-16 px-6 border-b border-slate-800/80 bg-[#0B0F19]/80 backdrop-blur-md">
          <SidebarTrigger className="md:hidden text-emerald-400 mr-4" />
          <div className="flex-1 flex items-center gap-3">
            {activeItem && (
                <div className="p-1.5 bg-slate-900 rounded-md border border-slate-800">
                    <activeItem.icon className="h-4 w-4 text-emerald-500" />
                </div>
            )}
            <h2 className="text-lg font-bold text-slate-200">
              {activeItem?.label || 'Dashboard'}
            </h2>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
            <ChildNodeStatus />
            <Link href="/order-flow" className={cn("px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all", pathname.startsWith('/order-flow') ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-slate-500 hover:text-slate-300 hover:bg-slate-900")}>
               Order Flow
            </Link>
            <Link href="/settings" className={cn("px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all", pathname.startsWith('/settings') ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "text-slate-500 hover:text-slate-300 hover:bg-slate-900")}>
               Settings
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

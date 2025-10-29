
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart2, BrainCircuit, LayoutDashboard, Settings, Bot, UserCheck } from "lucide-react"

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
  { href: "/backtest", label: "Backtest", icon: BarChart2 },
  { href: "/live", label: "Live Trading", icon: Bot },
  { href: "/manual", label: "Manual Trading", icon: UserCheck },
  { href: "/ai-research", label: "AI Research", icon: BrainCircuit },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const activeItem = menuItems.find((item) => pathname.startsWith(item.href))

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-2">
               <div className="p-2 bg-primary/20 rounded-lg">
                <Bot className="text-primary" />
              </div>
              <h1 className="text-xl font-semibold text-primary">AlgoTrade Nav</h1>
            </div>
          </SidebarHeader>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  tooltip={{
                    children: item.label,
                  }}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4">
           <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Bot className="h-4 w-4" />
            <span>AlgoTrade Navigator v1.0</span>
           </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex items-center h-14 px-4 border-b bg-background/80 backdrop-blur-sm">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">
              {activeItem?.label || 'Dashboard'}
            </h2>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

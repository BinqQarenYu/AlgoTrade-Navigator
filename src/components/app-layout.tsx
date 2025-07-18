

"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart2, BrainCircuit, Database, LayoutDashboard, Settings, Bot, ClipboardCheck, LayoutGrid, Sparkles, FlaskConical, TestTube, Grid3x3, Sigma, UserCheck } from "lucide-react"

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
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/backtest", label: "Backtest", icon: BarChart2 },
  { href: "/simulation", label: "Paper Trading", icon: TestTube },
  { href: "/grid-trading", label: "Live Grid", icon: Grid3x3 },
  { href: "/live", label: "Live Trading", icon: Bot },
  { href: "/manual", label: "Manual Trading", icon: UserCheck },
  { href: "/strategy-maker", label: "Strategy Maker", icon: ClipboardCheck },
  { href: "/lab", label: "Trading Lab", icon: FlaskConical },
  { href: "/trading-lab-2", label: "Trading Lab II", icon: Sigma },
  { href: "/optimize", label: "Optimize", icon: BrainCircuit },
  { href: "/data", label: "Data", icon: Database },
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
           <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src="https://placehold.co/40x40" alt="@shadcn" data-ai-hint="profile avatar" />
                <AvatarFallback>BT</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Bingkl Tech</span>
                <span className="text-xs text-muted-foreground">letstopfraudscam@gmail.com</span>
              </div>
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

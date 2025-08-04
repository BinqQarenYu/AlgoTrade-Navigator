
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart2, BrainCircuit, Database, LayoutDashboard, Settings, Bot, ClipboardCheck, LayoutGrid, Sparkles, FlaskConical, TestTube, Grid3x3, Sigma, UserCheck, LogIn, LogOut } from "lucide-react"

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
import { useAuth } from "@/context/auth-context"
import { Skeleton } from "./ui/skeleton"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/live", label: "Live Trading", icon: Bot },
  { href: "/settings", label: "Settings", icon: Settings },
]

const AuthProfile = () => {
    const { user, loading, signInWithGoogle, logOut } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                </div>
            </div>
        )
    }

    if (user) {
        return (
             <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={user.photoURL || 'https://placehold.co/40x40'} alt={user.displayName || 'User'} data-ai-hint="profile avatar" />
                <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex-col truncate">
                <span className="text-sm font-medium truncate">{user.displayName || 'User'}</span>
                <span className="text-xs text-muted-foreground truncate">{user.email || 'No email'}</span>
              </div>
               <Button variant="ghost" size="icon" onClick={logOut} className="shrink-0">
                    <LogOut />
               </Button>
            </div>
        )
    }

    return (
        <Button onClick={signInWithGoogle} className="w-full">
            <LogIn/>
            Sign In With Google
        </Button>
    )
}

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
           <AuthProfile/>
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

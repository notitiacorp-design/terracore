"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  HardHat,
  FileText,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const navItems = [
  {
    label: "Accueil",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Clients",
    href: "/dashboard/clients",
    icon: Users,
  },
  {
    label: "Chantiers",
    href: "/dashboard/chantiers",
    icon: HardHat,
  },
  {
    label: "Documents",
    href: "/dashboard/documents",
    icon: FileText,
  },
  {
    label: "Pilotage",
    href: "/dashboard/pilotage",
    icon: BarChart3,
  },
]

interface SidebarProps {
  companyName?: string
}

export function Sidebar({ companyName = "Entreprise BTP" }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen sticky top-0 border-r border-white/10 bg-[#0f0f13] transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-5 border-b border-white/10 min-h-[64px]",
            collapsed && "justify-center px-2"
          )}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/20">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-white font-bold text-base leading-none">
                TerraCore
                <span className="text-emerald-400"> Pro</span>
              </span>
              <span className="text-white/40 text-xs leading-none mt-0.5 truncate">
                {companyName}
              </span>
            </div>
          )}
        </div>

        {/* Nav items */}
        <ScrollArea className="flex-1 py-4">
          <nav className="flex flex-col gap-1 px-2">
            {!collapsed && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">
                Navigation
              </p>
            )}
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href)

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-center h-10 w-10 rounded-lg mx-auto transition-all duration-200",
                          isActive
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "text-white/50 hover:text-white hover:bg-white/5"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="sr-only">{item.label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-[#1a1a24] text-white border-white/10">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0 transition-colors",
                      isActive
                        ? "text-emerald-400"
                        : "text-white/40 group-hover:text-white/70"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  )}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Bottom section */}
        <div className="border-t border-white/10 p-2">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/dashboard/reglages"
                  className={cn(
                    "flex items-center justify-center h-10 w-10 rounded-lg mx-auto transition-all duration-200",
                    pathname === "/dashboard/reglages"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  )}
                >
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Réglages</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#1a1a24] text-white border-white/10">
                Réglages
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href="/dashboard/reglages"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group border",
                pathname === "/dashboard/reglages"
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"
              )}
            >
              <Settings
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  pathname === "/dashboard/reglages"
                    ? "text-emerald-400"
                    : "text-white/40 group-hover:text-white/70"
                )}
              />
              <span>Réglages</span>
            </Link>
          )}

          {/* User info */}
          {!collapsed && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg">
              <div className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white text-[10px] font-semibold">TC</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-white text-xs font-medium truncate">Thomas C.</span>
                <span className="text-white/30 text-[10px] truncate">Admin</span>
              </div>
            </div>
          )}

          {/* Collapse toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "mt-1 w-full text-white/40 hover:text-white hover:bg-white/5 transition-colors",
              collapsed && "justify-center px-0"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span className="text-xs">Réduire</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}

"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Users,
  HardHat,
  FileText,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
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
    icon: Home,
    exact: true,
  },
  {
    label: "Clients",
    href: "/dashboard/clients",
    icon: Users,
    exact: false,
  },
  {
    label: "Chantiers",
    href: "/dashboard/chantiers",
    icon: HardHat,
    exact: false,
  },
  {
    label: "Documents",
    href: "/dashboard/documents",
    icon: FileText,
    exact: false,
  },
  {
    label: "Pilotage",
    href: "/dashboard/pilotage",
    icon: BarChart3,
    exact: false,
  },
]

const settingsItem = {
  label: "Réglages",
  href: "/dashboard/settings",
  icon: Settings,
}

function isNavItemActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) {
    return pathname === href
  }
  return pathname.startsWith(href)
}

interface SidebarContentProps {
  companyName: string
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  onMobileClose?: () => void
  isMobile?: boolean
}

function SidebarContent({
  companyName,
  collapsed = false,
  onCollapsedChange,
  onMobileClose,
  isMobile = false,
}: SidebarContentProps) {
  const pathname = usePathname()

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col h-full bg-[#0a0a0f]">
        {/* Logo */}
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-5 border-b border-white/[0.06] min-h-[64px] flex-shrink-0",
            collapsed && !isMobile && "justify-center px-2"
          )}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500 shadow-lg shadow-emerald-500/25">
            <span className="text-white font-bold text-sm tracking-tight">T</span>
          </div>
          {(!collapsed || isMobile) && (
            <div className="flex flex-col min-w-0">
              <span className="text-white font-semibold text-[15px] leading-none tracking-tight">
                TerraCore
                <span className="text-emerald-400"> Pro</span>
              </span>
              <span className="text-white/30 text-[11px] leading-none mt-1 truncate font-normal">
                {companyName}
              </span>
            </div>
          )}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMobileClose}
              className="ml-auto h-8 w-8 text-white/40 hover:text-white hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Nav items */}
        <ScrollArea className="flex-1 py-3">
          <nav className="flex flex-col gap-0.5 px-2">
            {(!collapsed || isMobile) && (
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-white/20 mb-2 mt-1">
                Navigation
              </p>
            )}
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = isNavItemActive(pathname, item.href, item.exact)

              if (collapsed && !isMobile) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-center h-9 w-9 rounded-lg mx-auto transition-all duration-150",
                          isActive
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "text-white/40 hover:text-white hover:bg-white/[0.06]"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="sr-only">{item.label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="bg-[#16161e] text-white border-white/10 text-xs"
                    >
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={isMobile ? onMobileClose : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 group relative",
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "text-white/50 hover:text-white hover:bg-white/[0.04]"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 bg-emerald-400 rounded-full" />
                  )}
                  <Icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0 transition-colors",
                      isActive
                        ? "text-emerald-400"
                        : "text-white/30 group-hover:text-white/60"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400/80 flex-shrink-0" />
                  )}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Bottom section */}
        <div className="border-t border-white/[0.06] p-2 flex-shrink-0">
          {/* Settings */}
          {collapsed && !isMobile ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={settingsItem.href}
                  className={cn(
                    "flex items-center justify-center h-9 w-9 rounded-lg mx-auto transition-all duration-150",
                    isNavItemActive(pathname, settingsItem.href, false)
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "text-white/40 hover:text-white hover:bg-white/[0.06]"
                  )}
                >
                  <Settings className="h-4 w-4" />
                  <span className="sr-only">{settingsItem.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-[#16161e] text-white border-white/10 text-xs"
              >
                {settingsItem.label}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              href={settingsItem.href}
              onClick={isMobile ? onMobileClose : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 group relative",
                isNavItemActive(pathname, settingsItem.href, false)
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "text-white/50 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              {isNavItemActive(pathname, settingsItem.href, false) && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 bg-emerald-400 rounded-full" />
              )}
              <Settings
                className={cn(
                  "h-4 w-4 flex-shrink-0",
                  isNavItemActive(pathname, settingsItem.href, false)
                    ? "text-emerald-400"
                    : "text-white/30 group-hover:text-white/60"
                )}
              />
              <span>Réglages</span>
              {isNavItemActive(pathname, settingsItem.href, false) && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400/80 flex-shrink-0" />
              )}
            </Link>
          )}

          {/* User info */}
          {(!collapsed || isMobile) && (
            <div className="mt-1 flex items-center gap-2.5 px-3 py-2 rounded-lg">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                <span className="text-white text-[10px] font-semibold">TC</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-white/80 text-[12px] font-medium truncate leading-none">
                  Thomas C.
                </span>
                <span className="text-white/25 text-[10px] truncate leading-none mt-0.5">
                  Admin
                </span>
              </div>
              <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            </div>
          )}

          {/* Collapse toggle — desktop only */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCollapsedChange?.(!collapsed)}
              className={cn(
                "mt-1 w-full text-white/25 hover:text-white/60 hover:bg-white/[0.04] transition-colors h-8 text-[11px]",
                collapsed && "justify-center px-0"
              )}
            >
              {collapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <>
                  <ChevronLeft className="h-3.5 w-3.5 mr-1.5" />
                  <span>Réduire</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

interface SidebarProps {
  companyName?: string
}

export function Sidebar({ companyName = "Entreprise BTP" }: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen sticky top-0 border-r border-white/[0.06] bg-[#0a0a0f] transition-all duration-300 ease-in-out flex-shrink-0",
          collapsed ? "w-[60px]" : "w-[232px]"
        )}
      >
        <SidebarContent
          companyName={companyName}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          isMobile={false}
        />
      </aside>

      {/* Mobile trigger */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 bg-[#0a0a0f] border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.06] rounded-lg shadow-xl"
            >
              <Menu className="h-4 w-4" />
              <span className="sr-only">Ouvrir le menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="p-0 w-[260px] bg-[#0a0a0f] border-r border-white/[0.06] [&>button]:hidden"
          >
            <SidebarContent
              companyName={companyName}
              isMobile={true}
              onMobileClose={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

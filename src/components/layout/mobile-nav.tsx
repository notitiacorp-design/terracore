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
  Menu,
  X,
} from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Ouvrir le menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 bg-[#0f0f13] border-r border-white/10">
        <SheetHeader className="px-6 py-5 border-b border-white/10">
          <SheetTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-bold text-base leading-none">
                TerraCore
                <span className="text-emerald-400"> Pro</span>
              </span>
              <span className="text-white/40 text-xs leading-none mt-0.5">Bâtiment & Travaux</span>
            </div>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1 px-3 py-4">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-2">
            Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    isActive ? "text-emerald-400" : "text-white/40"
                  )}
                />
                <span>{item.label}</span>
                {isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 px-3 py-4 border-t border-white/10">
          <Link
            href="/dashboard/reglages"
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              pathname === "/dashboard/reglages"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            <Settings
              className={cn(
                "h-4 w-4 flex-shrink-0",
                pathname === "/dashboard/reglages" ? "text-emerald-400" : "text-white/40"
              )}
            />
            <span>Réglages</span>
          </Link>

          <div className="mt-3 flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">TC</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-white text-sm font-medium truncate">Thomas Chevalier</span>
              <span className="text-white/40 text-xs truncate">Administrateur</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

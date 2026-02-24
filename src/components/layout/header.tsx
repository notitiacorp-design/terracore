"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Menu, Search, Bell, Moon, Sun, LogOut, Settings, User } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MobileNav } from "@/components/layout/mobile-nav"
import { cn } from "@/lib/utils"

const pageTitles: Record<string, string> = {
  "/dashboard": "Accueil",
  "/dashboard/clients": "Clients",
  "/dashboard/chantiers": "Chantiers",
  "/dashboard/documents": "Documents",
  "/dashboard/pilotage": "Pilotage",
  "/dashboard/reglages": "Réglages",
}

export function Header() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [commandOpen, setCommandOpen] = React.useState(false)
  const [notificationsOpen, setNotificationsOpen] = React.useState(false)

  const pageTitle = pageTitles[pathname] ?? "TerraCore Pro"

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const notifications = [
    { id: 1, title: "Nouveau chantier assigné", time: "Il y a 5 min", read: false },
    { id: 2, title: "Document en attente de validation", time: "Il y a 1h", read: false },
    { id: 3, title: "Client Dupont a répondu", time: "Il y a 3h", read: true },
  ]

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
        <div className="flex items-center gap-3 md:hidden">
          <MobileNav />
        </div>

        <div className="flex flex-1 items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight hidden md:block">
            {pageTitle}
          </h1>
          <h1 className="text-lg font-semibold tracking-tight md:hidden">
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="hidden md:flex items-center gap-2 text-muted-foreground text-sm w-[200px] justify-start"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span>Rechercher...</span>
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="h-5 w-5" />
            <span className="sr-only">Rechercher</span>
          </Button>

          <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-emerald-500 text-white border-0"
                  >
                    {unreadCount}
                  </Badge>
                )}
                <span className="sr-only">Notifications</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} non lues
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    )}
                    <span className={cn("text-sm", !notification.read && "font-medium")}>
                      {notification.title}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-4">
                    {notification.time}
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center justify-center text-sm text-emerald-600 dark:text-emerald-400">
                Voir toutes les notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Basculer le thème</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/avatar.jpg" alt="Avatar utilisateur" />
                  <AvatarFallback className="bg-emerald-500 text-white text-sm font-semibold">
                    TC
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Thomas Chevalier</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    thomas@terracore.pro
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Mon profil</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Réglages</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Se déconnecter</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Rechercher une page, un client, un chantier..." />
        <CommandList>
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => { setCommandOpen(false) }}>
              <Search className="mr-2 h-4 w-4" />
              <span>Accueil</span>
            </CommandItem>
            <CommandItem onSelect={() => { setCommandOpen(false) }}>
              <Search className="mr-2 h-4 w-4" />
              <span>Clients</span>
            </CommandItem>
            <CommandItem onSelect={() => { setCommandOpen(false) }}>
              <Search className="mr-2 h-4 w-4" />
              <span>Chantiers</span>
            </CommandItem>
            <CommandItem onSelect={() => { setCommandOpen(false) }}>
              <Search className="mr-2 h-4 w-4" />
              <span>Documents</span>
            </CommandItem>
            <CommandItem onSelect={() => { setCommandOpen(false) }}>
              <Search className="mr-2 h-4 w-4" />
              <span>Pilotage</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Actions rapides">
            <CommandItem onSelect={() => { setCommandOpen(false) }}>
              <span>Créer un nouveau chantier</span>
            </CommandItem>
            <CommandItem onSelect={() => { setCommandOpen(false) }}>
              <span>Ajouter un client</span>
            </CommandItem>
            <CommandItem onSelect={() => { setCommandOpen(false) }}>
              <span>Importer un document</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

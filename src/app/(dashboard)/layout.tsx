"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  Briefcase,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  Bell,
  LogOut,
  Building2,
  Wrench,
  TrendingUp,
  Map,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const navItems = [
  {
    label: "Tableau de bord",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Devis",
    href: "/devis",
    icon: FileText,
  },
  {
    label: "Factures",
    href: "/factures",
    icon: Receipt,
  },
  {
    label: "Chantiers",
    href: "/chantiers",
    icon: Briefcase,
  },
  {
    label: "Planification",
    href: "/planification",
    icon: Calendar,
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Users,
  },
  {
    label: "Employés",
    href: "/employes",
    icon: Users,
  },
  {
    label: "Équipements",
    href: "/equipements",
    icon: Wrench,
  },
  {
    label: "Carte",
    href: "/carte",
    icon: Map,
  },
  {
    label: "Rapports",
    href: "/rapports",
    icon: TrendingUp,
  },
  {
    label: "Paramètres",
    href: "/parametres",
    icon: Settings,
  },
];

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  company_id: string | null;
  company_name: string | null;
  role: string | null;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  profile: UserProfile | null;
  onSignOut: () => void;
}

function SidebarNav({
  collapsed,
  onToggle,
  profile,
  onSignOut,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-gray-900 text-white transition-all duration-300 ease-in-out",
        collapsed ? "w-20" : "w-72"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 px-4 border-b border-gray-700 flex-shrink-0",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-sm">TerraCore</span>
              <span className="text-emerald-400 font-bold text-sm"> Pro</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className={cn(
            "text-gray-400 hover:text-white transition-colors p-1 rounded",
            collapsed && "hidden"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Collapsed toggle */}
      {collapsed && (
        <button
          onClick={onToggle}
          className="mx-auto mt-2 text-gray-400 hover:text-white transition-colors p-1 rounded"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Company name */}
      {!collapsed && profile?.company_name && (
        <div className="px-4 py-2 bg-gray-800/50">
          <p className="text-xs text-gray-400 truncate">{profile.company_name}</p>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-emerald-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className={cn("border-t border-gray-700 p-3", collapsed && "p-2")}>
        <div
          className={cn(
            "flex items-center gap-3",
            collapsed && "justify-center"
          )}
        >
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-emerald-600 text-white text-xs">
              {profile?.full_name
                ? profile.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "U"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {profile?.full_name || "Utilisateur"}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {profile?.role || "Membre"}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onSignOut}
              className="text-gray-400 hover:text-white transition-colors p-1"
              title="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function MobileNavContent({
  profile,
  onSignOut,
  onClose,
}: {
  profile: UserProfile | null;
  onSignOut: () => void;
  onClose: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white">
            TerraCore<span className="text-emerald-400"> Pro</span>
          </span>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-emerald-600 text-white"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-emerald-600 text-white text-xs">
              {profile?.full_name
                ? profile.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {profile?.full_name || "Utilisateur"}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {profile?.email || ""}
            </p>
          </div>
          <button
            onClick={onSignOut}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState(3);
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data: profileData } = await supabase
          .from("user_profile")
          .select("*, companies(name)")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile({
            id: profileData.id,
            full_name: profileData.full_name,
            email: user.email || null,
            avatar_url: profileData.avatar_url,
            company_id: profileData.company_id,
            company_name:
              (profileData.companies as { name: string } | null)?.name || null,
            role: profileData.role,
          });
        } else {
          setProfile({
            id: user.id,
            full_name: user.user_metadata?.full_name || null,
            email: user.email || null,
            avatar_url: null,
            company_id: null,
            company_name: null,
            role: null,
          });
        }
      } catch (err) {
        console.error("Erreur chargement profil:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const currentPageLabel =
    navItems.find((item) =>
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
    )?.label || "Tableau de bord";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col flex-shrink-0 h-full">
        {loading ? (
          <div
            className={cn(
              "flex flex-col bg-gray-900",
              collapsed ? "w-20" : "w-72"
            )}
          >
            <div className="h-16 border-b border-gray-700 flex items-center px-4">
              <Skeleton className="h-8 w-8 rounded-lg bg-gray-700" />
              {!collapsed && (
                <Skeleton className="h-4 w-24 ml-2 bg-gray-700" />
              )}
            </div>
          </div>
        ) : (
          <SidebarNav
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
            profile={profile}
            onSignOut={handleSignOut}
          />
        )}
      </div>

      {/* Main Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-4 md:px-6 bg-white border-b border-gray-200 flex-shrink-0 z-10">
          {/* Mobile: hamburger */}
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Ouvrir le menu"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 w-72 border-0"
              >
                <MobileNavContent
                  profile={profile}
                  onSignOut={handleSignOut}
                  onClose={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>

            <div>
              <h1 className="text-lg font-semibold text-gray-900 hidden md:block">
                {currentPageLabel}
              </h1>
              <div className="flex items-center gap-2 md:hidden">
                <div className="w-7 h-7 bg-emerald-500 rounded flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-gray-900 text-sm">
                  TerraCore<span className="text-emerald-500"> Pro</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-emerald-600 text-white text-xs">
                      {profile?.full_name
                        ? profile.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)
                        : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900 leading-tight">
                      {loading ? (
                        <Skeleton className="h-3 w-20" />
                      ) : (
                        profile?.full_name || "Utilisateur"
                      )}
                    </p>
                    <p className="text-xs text-gray-500 leading-tight">
                      {loading ? (
                        <Skeleton className="h-2 w-16 mt-1" />
                      ) : (
                        profile?.role || "Membre"
                      )}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="text-sm font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500 font-normal">
                    {profile?.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/parametres">
                    <Settings className="mr-2 h-4 w-4" />
                    Paramètres
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-red-600 focus:text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

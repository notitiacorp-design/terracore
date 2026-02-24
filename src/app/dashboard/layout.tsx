"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  Bell,
  LogOut,
  Building2,
  TrendingUp,
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
    icon: Briefcase,
  },
  {
    label: "Documents",
    href: "/dashboard/documents",
    icon: FileText,
  },
  {
    label: "Pilotage",
    href: "/dashboard/pilotage",
    icon: TrendingUp,
  },
];

const settingsItem = {
  label: "Paramètres",
  href: "/dashboard/settings",
  icon: Settings,
};

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
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

function getFullName(profile: UserProfile | null): string {
  if (!profile) return "Utilisateur";
  const first = profile.first_name || "";
  const last = profile.last_name || "";
  const full = (first + " " + last).trim();
  return full || "Utilisateur";
}

function getInitials(profile: UserProfile | null): string {
  if (!profile) return "U";
  const first = profile.first_name?.[0] || "";
  const last = profile.last_name?.[0] || "";
  return (first + last).toUpperCase() || "U";
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
            item.href === "/dashboard"
              ? pathname === "/dashboard"
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
              {getInitials(profile)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {getFullName(profile)}
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
            item.href === "/dashboard"
              ? pathname === "/dashboard"
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
              {getInitials(profile)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {getFullName(profile)}
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
          .select("*, company(name)")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile({
            id: profileData.id,
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            email: user.email || null,
            avatar_url: profileData.avatar_url,
            company_id: profileData.company_id,
            company_name:
              (profileData.company as { name: string } | null)?.name || null,
            role: profileData.role,
          });
        } else {
          setProfile({
            id: user.id,
            first_name: user.user_metadata?.first_name || null,
            last_name: user.user_metadata?.last_name || null,
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
      item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)
    )?.label || "Accueil";

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
                      {getInitials(profile)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900 leading-tight">
                      {loading ? (
                        <Skeleton className="h-3 w-20" />
                      ) : (
                        getFullName(profile)
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
                  <p className="text-sm font-medium">{getFullName(profile)}</p>
                  <p className="text-xs text-gray-500 font-normal">
                    {profile?.email}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
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

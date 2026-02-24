'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  TrendingUp,
  Package,
  Bell,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  User,
  Sparkles,
  Building2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const mainNavItems: NavItem[] = [
  { label: 'Accueil', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Clients', href: '/dashboard/clients', icon: Users },
  { label: 'Chantiers', href: '/dashboard/chantiers', icon: Briefcase },
  { label: 'Documents', href: '/dashboard/documents', icon: FileText },
  { label: 'Pilotage', href: '/dashboard/pilotage', icon: TrendingUp },
];

const secondaryNavItems: NavItem[] = [
  { label: 'Catalogue', href: '/dashboard/catalogue', icon: Package },
  { label: 'Relances', href: '/dashboard/relances', icon: Bell },
  { label: 'Paiements', href: '/dashboard/paiements', icon: CreditCard },
  { label: 'Réglages', href: '/dashboard/settings', icon: Settings },
];

interface UserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  avatar_url: string | null;
  company?: {
    name: string;
  } | null;
}

function NavLink({
  item,
  pathname,
  collapsed,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const isActive =
    item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(item.href);

  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 min-h-[48px]',
        'hover:bg-white/10 hover:text-white',
        isActive
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'text-gray-400',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon
        className={cn(
          'shrink-0 transition-all',
          isActive ? 'text-emerald-400' : 'text-gray-400',
          collapsed ? 'h-5 w-5' : 'h-5 w-5'
        )}
      />
      {!collapsed && (
        <span className="truncate">{item.label}</span>
      )}
    </Link>
  );
}

function Sidebar({
  collapsed,
  onToggle,
  profile,
  pathname,
  onSignOut,
}: {
  collapsed: boolean;
  onToggle: () => void;
  profile: UserProfile | null;
  pathname: string;
  onSignOut: () => void;
}) {
  const initials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() || 'U'
    : 'U';

  const fullName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Utilisateur'
    : 'Chargement...';

  const companyName = profile?.company?.name ?? 'TerraCore Pro';

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out',
        'bg-[#1a1a2e] border-r border-white/10',
        collapsed ? 'w-[72px]' : 'w-[240px]'
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center h-16 px-4 border-b border-white/10 shrink-0',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {!collapsed && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{companyName}</p>
              <p className="text-gray-400 text-xs">TerraCore Pro</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-white" />
          </div>
        )}
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-gray-400 hover:text-white hover:bg-white/10 shrink-0 h-8 w-8"
            aria-label="Réduire le menu"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
          />
        ))}

        <div className="my-3">
          <Separator className="bg-white/10" />
        </div>

        {secondaryNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* AI Assistant button */}
      <div className={cn('px-2 pb-3', collapsed && 'flex justify-center')}>
        <Button
          variant="outline"
          className={cn(
            'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 bg-transparent min-h-[48px]',
            collapsed ? 'w-12 px-0 justify-center' : 'w-full gap-2'
          )}
          title={collapsed ? 'Assistant IA' : undefined}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-sm">Assistant IA</span>}
        </Button>
      </div>

      {/* User area */}
      <div className={cn('border-t border-white/10 p-2 shrink-0')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/10 transition-colors min-h-[48px]',
                collapsed && 'justify-center'
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={profile?.avatar_url ?? undefined} alt={fullName} />
                <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 text-left">
                  <p className="text-white text-sm font-medium truncate">{fullName}</p>
                  <p className="text-gray-400 text-xs truncate capitalize">{profile?.role ?? ''}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align={collapsed ? 'center' : 'start'}
            className="w-56 bg-[#1a1a2e] border-white/10 text-white"
          >
            <DropdownMenuLabel className="text-gray-400 text-xs">
              Mon compte
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              asChild
              className="text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <Link href="/dashboard/settings/profile">
                <User className="h-4 w-4 mr-2" />
                Mon profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={onSignOut}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Collapse toggle when collapsed */}
      {collapsed && (
        <div className="p-2 border-t border-white/10 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="w-full text-gray-400 hover:text-white hover:bg-white/10 h-10"
            aria-label="Étendre le menu"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </aside>
  );
}

function MobileNav({
  profile,
  pathname,
  onSignOut,
}: {
  profile: UserProfile | null;
  pathname: string;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);

  const initials = profile
    ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() || 'U'
    : 'U';

  const fullName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || 'Utilisateur'
    : 'Chargement...';

  const companyName = profile?.company?.name ?? 'TerraCore Pro';

  return (
    <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between h-16 px-4 bg-[#1a1a2e] border-b border-white/10">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
          <Building2 className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{companyName}</p>
          <p className="text-gray-400 text-xs">TerraCore Pro</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 min-h-[48px] min-w-[48px]"
          title="Assistant IA"
        >
          <Sparkles className="h-5 w-5" />
        </Button>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 min-h-[48px] min-w-[48px]"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[280px] bg-[#1a1a2e] border-r border-white/10 p-0 flex flex-col"
          >
            {/* Sheet header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{companyName}</p>
                  <p className="text-gray-400 text-xs">TerraCore Pro</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8"
                aria-label="Fermer le menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Sheet nav */}
            <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
              {mainNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  collapsed={false}
                  onClick={() => setOpen(false)}
                />
              ))}

              <div className="my-3">
                <Separator className="bg-white/10" />
              </div>

              {secondaryNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  collapsed={false}
                  onClick={() => setOpen(false)}
                />
              ))}
            </nav>

            {/* AI button */}
            <div className="px-2 pb-3">
              <Button
                variant="outline"
                className="w-full border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 bg-transparent min-h-[48px] gap-2"
                onClick={() => setOpen(false)}
              >
                <Sparkles className="h-4 w-4" />
                <span className="text-sm">Assistant IA</span>
              </Button>
            </div>

            {/* User area */}
            <div className="border-t border-white/10 p-2">
              <div className="flex items-center gap-3 rounded-lg px-2 py-2 mb-1">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt={fullName} />
                  <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{fullName}</p>
                  <p className="text-gray-400 text-xs capitalize">{profile?.role ?? ''}</p>
                </div>
              </div>
              <Link
                href="/dashboard/settings/profile"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors min-h-[48px]"
              >
                <User className="h-4 w-4" />
                Mon profil
              </Link>
              <button
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors min-h-[48px]"
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace('/login');
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('user_profile')
          .select(
            `
            id,
            first_name,
            last_name,
            role,
            avatar_url,
            company:company_id (
              name
            )
          `
          )
          .eq('auth_user_id', user.id)
          .single();

        if (profileError) {
          console.error('Erreur chargement profil:', profileError);
        } else {
          setProfile(profileData as UserProfile);
        }
      } catch (err) {
        console.error('Erreur auth:', err);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center animate-pulse">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <p className="text-gray-400 text-sm">Chargement en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex">
      {/* Desktop sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
        profile={profile}
        pathname={pathname}
        onSignOut={handleSignOut}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <MobileNav
          profile={profile}
          pathname={pathname}
          onSignOut={handleSignOut}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

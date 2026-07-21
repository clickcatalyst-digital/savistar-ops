'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SunIcon, MoonIcon, SettingsIcon, LogOutIcon, LayoutDashboardIcon,
  UsersIcon, FolderKanbanIcon, ArmchairIcon, HardHatIcon, TruckIcon, WalletIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';

const LINKS = [
  { href: '/', label: 'Home', icon: LayoutDashboardIcon },
  { href: '/clients', label: 'Clients', icon: UsersIcon },
  { href: '/projects', label: 'Projects', icon: FolderKanbanIcon },
  { href: '/orders', label: 'Orders', icon: ArmchairIcon },
  { href: '/people', label: 'People', icon: HardHatIcon },
  { href: '/vendors', label: 'Vendors', icon: TruckIcon },
  { href: '/finance', label: 'Finance', icon: WalletIcon },
];

export default function Nav({ user }) {
  const pathname = usePathname();
  const links = user?.role === 'user' ? LINKS.filter(l => l.href !== '/finance') : LINKS;
  const router = useRouter();
  const [theme, setTheme] = useState('light');

  const isActive = l => (l.href === '/' ? pathname === '/' : pathname.startsWith(l.href));

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'light';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-muted-foreground">SAVISTAR</span><span className="text-primary">OPS</span>
            </h1>
          </Link>

          {/* Desktop tabs */}
          <nav className="ml-2 hidden items-center gap-1 md:flex">
            {links.map(l => (
              <Link key={l.href} href={l.href}
                className={cn('rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive(l) ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Menu"><SettingsIcon /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="font-normal">
                  <div className="text-sm font-medium">{user?.display_name || user?.username}</div>
                  <div className="text-xs text-muted-foreground">@{user?.username} · {user?.role}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={toggleTheme}>
                    {theme === 'dark' ? <SunIcon data-icon="inline-start" /> : <MoonIcon data-icon="inline-start" />}
                    {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                  </DropdownMenuItem>
                  {user?.role !== 'user' && (
                    <DropdownMenuItem onClick={() => router.push('/settings')}>
                      <SettingsIcon data-icon="inline-start" />Settings
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={logout} variant="destructive">
                    <LogOutIcon data-icon="inline-start" />Logout
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
          {links.map(l => {
            const Icon = l.icon;
            const active = isActive(l);
            return (
              <Link key={l.href} href={l.href}
                className={cn('flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground')}>
                <Icon className={cn('size-5', active && 'fill-primary/10')} />
                <span className="truncate">{l.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

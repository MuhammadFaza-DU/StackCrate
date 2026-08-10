'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, LogOut, Settings, Heart, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/components/providers/UserProvider';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { LocaleSwitcher } from '@/components/i18n/LocaleSwitcher';
import type { Dictionary, Message } from '@/i18n/types';
import type { User } from '@supabase/supabase-js';

const text = (message: Message) => typeof message === 'function' ? message() : message;

interface ProfileDropdownProps {
  isAdmin: boolean;
  dictionary: Dictionary;
  onCloseMenu: () => void;
  onLogout: () => void;
}

function ProfileDropdown({ isAdmin, dictionary, onCloseMenu, onLogout }: ProfileDropdownProps) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onCloseMenu} />
      {/* Dropdown */}
      <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-card border border-border rounded-lg shadow-lg z-50">
        <Link
          href="/favorites"
          className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
          onClick={onCloseMenu}
        >
          <Heart className="w-4 h-4" /> {text(dictionary.header.favorites)}
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
            onClick={onCloseMenu}
          >
            <Settings className="w-4 h-4" /> {text(dictionary.header.admin)}
          </Link>
        )}
        <button
          onClick={() => { onLogout(); onCloseMenu(); }}
          className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors w-full text-left text-destructive"
        >
          <LogOut className="w-4 h-4" /> {text(dictionary.header.logout)}
        </button>
      </div>
    </>
  );
}

interface UserProfileProps {
  user: User;
  isAdmin: boolean;
  dictionary: Dictionary;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onLogout: () => void;
}

function UserProfile({ user, isAdmin, dictionary, open, onToggle, onClose, onLogout }: UserProfileProps) {
  const displayName = (user.user_metadata as { display_name?: string } | undefined)?.display_name ?? user.email;

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex h-12 items-center gap-2 px-3 rounded-xl border border-border bg-background/70 shadow-sm hover:bg-muted transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
          {displayName?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <span className="text-sm hidden md:block">{displayName}</span>
      </button>

      {open && (
        <ProfileDropdown
          isAdmin={isAdmin}
          dictionary={dictionary}
          onCloseMenu={onClose}
          onLogout={onLogout}
        />
      )}
    </div>
  );
}

export function Header() {
  const { user, isAdmin, logout } = useUser();
  const { dictionary } = useLocale();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      router.push(`/explore?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border shadow-[0_4px_18px_rgba(26,20,16,0.12)]">
      <div className="max-w-7xl mx-auto px-4 h-[72px] flex items-center gap-3 md:gap-5">
        {/* Logo */}
        <Link href="/#home" className="flex items-center gap-2.5 flex-shrink-0" aria-label={text(dictionary.header.homeAriaLabel)}>
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm shadow-primary/20">
            <span className="font-bold text-xs tracking-tight">SC</span>
          </div>
          <span className="font-heading text-lg text-foreground hidden sm:block">
            Stack<span className="text-[#f97316]">Crate</span>
          </span>
        </Link>

        {/* Search (right, before profile/auth) */}
        <form onSubmit={handleSearch} className="flex-1 min-w-0 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              aria-label={text(dictionary.common.search)}
              placeholder={text(dictionary.header.searchPlaceholder)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/80 border-border/80 rounded-xl"
            />
          </div>
        </form>

        {/* Auth + profile */}
        <div className="ml-auto flex items-center gap-1.5">
          {user ? (
            <UserProfile
              user={user}
              isAdmin={isAdmin}
              dictionary={dictionary}
              open={profileOpen}
              onToggle={() => setProfileOpen(!profileOpen)}
              onClose={() => setProfileOpen(false)}
              onLogout={logout}
            />
          ) : (
            <Link href="/login">
              <Button size="sm" variant="outline" className="h-12 rounded-xl px-4">{text(dictionary.header.login)}</Button>
            </Link>
          )}

          <LocaleSwitcher className="!hidden md:!inline-flex" />
          <LocaleSwitcher compact className="!inline-flex md:!hidden" />

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2.5 rounded-xl hover:bg-muted transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={text(mobileOpen ? dictionary.header.closeMenu : dictionary.header.mobileMenu)}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-4 py-3 space-y-2">
            {user && (
              <Link href="/favorites" className="block py-2 text-sm hover:text-foreground" onClick={() => setMobileOpen(false)}>
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4" /> {text(dictionary.header.favorites)}
                </div>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

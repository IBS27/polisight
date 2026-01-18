'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { signInWithGoogle, signOut } from '@/lib/supabase/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogIn, LogOut, User, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface UserButtonProps {
  collapsed?: boolean;
  menuSide?: 'top' | 'bottom' | 'left' | 'right';
}

export function UserButton({ collapsed = false, menuSide = 'bottom' }: UserButtonProps) {
  const { user, isLoading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in failed:', error);
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out failed:', error);
      setIsSigningOut(false);
    }
  };

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className={collapsed ? 'w-full justify-center' : 'w-full justify-start'}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignIn}
        disabled={isSigningIn}
        className={collapsed ? 'w-full justify-center' : 'w-full justify-start'}
      >
        {isSigningIn ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <LogIn className="w-4 h-4" />
        )}
        {!collapsed && <span className="ml-2">Sign in</span>}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={collapsed ? 'w-full justify-center' : 'w-full justify-start gap-2'}>
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name || 'User'}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <User className="w-4 h-4" />
          )}
          {!collapsed && (
            <span className="truncate max-w-[160px]">
              {user.name || user.email || 'User'}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={menuSide} align="start" className="w-48">
        <div className="px-2 py-1.5 text-sm text-gray-500">
          {user.email}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="cursor-pointer">
            <User className="w-4 h-4 mr-2" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="text-red-600 cursor-pointer"
        >
          {isSigningOut ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4 mr-2" />
          )}
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

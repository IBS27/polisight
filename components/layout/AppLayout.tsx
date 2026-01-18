'use client';

import { type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { UserButton } from '@/components/auth/UserButton';
import Link from 'next/link';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header bar */}
        <header className="flex items-center justify-between px-4 py-2 bg-white border-b flex-shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-lg font-semibold text-gray-900 sm:hidden">
              Polisight
            </Link>
          </div>
          <UserButton />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

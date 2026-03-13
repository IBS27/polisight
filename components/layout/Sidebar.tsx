'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { useArticleHistory } from '@/components/history/ArticleHistoryProvider';
import { Button } from '@/components/ui/button';
import { UserButton } from '@/components/auth/UserButton';
import {
  Home,
  User,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { user, isLoading: authLoading } = useAuth();
  const { articles, isLoading: isLoadingArticles } = useArticleHistory();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-white border-r transition-all duration-200',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!isCollapsed && (
          <Link href="/" className="font-semibold text-gray-900">
            PoliSight
          </Link>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(isCollapsed && 'mx-auto')}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-shrink-0 p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start mb-1',
                  isCollapsed && 'justify-center px-2'
                )}
              >
                <item.icon className="w-4 h-4" />
                {!isCollapsed && <span className="ml-2">{item.label}</span>}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* Article History */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 border-t">
          <div className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-500">
            <FileText className="w-4 h-4" />
            Recent Articles
          </div>

          {!authLoading && (
            <p className="px-4 pb-2 text-xs text-gray-400">
              {user ? 'Synced to your account' : 'Saved in this browser'}
            </p>
          )}

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {authLoading || isLoadingArticles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : articles.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4 px-2">
                Articles you analyze will appear here
              </p>
            ) : (
              <div className="space-y-1">
                {articles.map((article) => {
                  const isActive =
                    pathname === `/articles/${article.articleId}`;
                  return (
                    <Link
                      key={article.id}
                      href={`/articles/${article.articleId}`}
                    >
                      <div
                        className={cn(
                          'px-3 py-2 rounded-md text-sm hover:bg-gray-100 cursor-pointer transition-colors',
                          isActive && 'bg-gray-100'
                        )}
                      >
                        <p className="font-medium text-gray-900 truncate">
                          {article.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(article.lastViewedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User profile at bottom */}
      <div className={cn(
        'border-t p-2 mt-auto flex-shrink-0',
        isCollapsed && 'flex justify-center'
      )}>
        <UserButton collapsed={isCollapsed} menuSide="top" />
      </div>
    </aside>
  );
}

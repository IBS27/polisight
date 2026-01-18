'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import {
  Home,
  User,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ArticleHistoryItem {
  id: string;
  articleId: string;
  title: string;
  lastViewedAt: string;
}

export function Sidebar() {
  const { user, isLoading: authLoading } = useAuth();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [articles, setArticles] = useState<ArticleHistoryItem[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(false);

  // Fetch user's article history
  useEffect(() => {
    if (!user) {
      setArticles([]);
      return;
    }

    const fetchArticles = async () => {
      setIsLoadingArticles(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('user_articles')
          .select(
            `
            id,
            article_id,
            last_viewed_at,
            articles (
              title
            )
          `
          )
          .eq('user_id', user.id)
          .order('last_viewed_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('Failed to fetch articles:', error);
          return;
        }

        setArticles(
          (data || []).map((item) => {
            // Handle the joined articles data - could be object or array depending on query
            const articlesData = item.articles as { title: string } | { title: string }[] | null;
            let title = 'Untitled';
            if (articlesData) {
              if (Array.isArray(articlesData)) {
                title = articlesData[0]?.title || 'Untitled';
              } else {
                title = articlesData.title || 'Untitled';
              }
            }
            return {
              id: item.id,
              articleId: item.article_id,
              title,
              lastViewedAt: item.last_viewed_at,
            };
          })
        );
      } catch (error) {
        console.error('Failed to fetch articles:', error);
      } finally {
        setIsLoadingArticles(false);
      }
    };

    fetchArticles();
  }, [user]);

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
            Polisight
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
      {!isCollapsed && user && (
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 border-t">
          <div className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-500">
            <FileText className="w-4 h-4" />
            Your Articles
          </div>

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

      {/* Sign in prompt for unauthenticated users */}
      {!isCollapsed && !user && !authLoading && (
        <div className="flex-1 flex items-center justify-center p-4 border-t">
          <p className="text-sm text-gray-400 text-center">
            Sign in to save your article history
          </p>
        </div>
      )}
    </aside>
  );
}

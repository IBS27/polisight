'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import {
  ARTICLE_HISTORY_STORAGE_KEY,
  ARTICLE_HISTORY_UPDATED_EVENT,
  type ArticleHistoryItem,
  readGuestArticleHistory,
  upsertGuestArticleHistoryItem,
} from '@/lib/article-history';

interface TrackArticleInput {
  id: string;
  title: string;
}

interface ArticleHistoryContextType {
  articles: ArticleHistoryItem[];
  isLoading: boolean;
  recordArticleView: (article: TrackArticleInput) => Promise<void>;
}

const ArticleHistoryContext = createContext<ArticleHistoryContextType>({
  articles: [],
  isLoading: true,
  recordArticleView: async () => {},
});

interface UserArticleRow {
  id: string;
  article_id: string;
  last_viewed_at: string;
  articles: { title: string } | { title: string }[] | null;
}

export function useArticleHistory() {
  return useContext(ArticleHistoryContext);
}

export function ArticleHistoryProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [articles, setArticles] = useState<ArticleHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadArticles = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setArticles(readGuestArticleHistory());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

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
        setArticles([]);
        return;
      }

      setArticles(
        ((data || []) as UserArticleRow[]).map((item) => {
          const articlesData = item.articles;
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
      setArticles([]);
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleGuestHistoryChange = () => {
      if (!user) {
        setArticles(readGuestArticleHistory());
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === ARTICLE_HISTORY_STORAGE_KEY && !user) {
        setArticles(readGuestArticleHistory());
      }
    };

    window.addEventListener(
      ARTICLE_HISTORY_UPDATED_EVENT,
      handleGuestHistoryChange
    );
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(
        ARTICLE_HISTORY_UPDATED_EVENT,
        handleGuestHistoryChange
      );
      window.removeEventListener('storage', handleStorage);
    };
  }, [user]);

  const recordArticleView = useCallback(async (article: TrackArticleInput) => {
    if (!user) {
      const nextArticles = upsertGuestArticleHistoryItem({
        articleId: article.id,
        title: article.title,
      });
      setArticles(nextArticles);
      return;
    }

    const response = await fetch(`/api/articles/${article.id}/view`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to save article history');
    }

    await loadArticles();
  }, [loadArticles, user]);

  return (
    <ArticleHistoryContext.Provider
      value={{
        articles,
        isLoading: authLoading || isLoading,
        recordArticleView,
      }}
    >
      {children}
    </ArticleHistoryContext.Provider>
  );
}

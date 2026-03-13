import { z } from 'zod';

export const ARTICLE_HISTORY_STORAGE_KEY = 'polisight.guest-article-history';
export const ARTICLE_HISTORY_UPDATED_EVENT = 'polisight:article-history-updated';
const MAX_ARTICLE_HISTORY_ITEMS = 20;

export const ArticleHistoryItemSchema = z.object({
  id: z.string(),
  articleId: z.string(),
  title: z.string(),
  lastViewedAt: z.string(),
});

export const ArticleHistoryListSchema = z.array(ArticleHistoryItemSchema);

export type ArticleHistoryItem = z.infer<typeof ArticleHistoryItemSchema>;

interface TrackGuestArticleInput {
  articleId: string;
  title: string;
}

export function readGuestArticleHistory(): ArticleHistoryItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(ARTICLE_HISTORY_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    const result = ArticleHistoryListSchema.safeParse(parsed);

    if (!result.success) {
      return [];
    }

    return result.data.sort(
      (left, right) =>
        new Date(right.lastViewedAt).getTime() - new Date(left.lastViewedAt).getTime()
    );
  } catch {
    return [];
  }
}

export function saveGuestArticleHistory(
  items: ArticleHistoryItem[]
): ArticleHistoryItem[] {
  if (typeof window === 'undefined') {
    return items;
  }

  const normalizedItems = items
    .slice()
    .sort(
      (left, right) =>
        new Date(right.lastViewedAt).getTime() - new Date(left.lastViewedAt).getTime()
    )
    .slice(0, MAX_ARTICLE_HISTORY_ITEMS);

  window.localStorage.setItem(
    ARTICLE_HISTORY_STORAGE_KEY,
    JSON.stringify(normalizedItems)
  );
  window.dispatchEvent(new CustomEvent(ARTICLE_HISTORY_UPDATED_EVENT));

  return normalizedItems;
}

export function upsertGuestArticleHistoryItem({
  articleId,
  title,
}: TrackGuestArticleInput): ArticleHistoryItem[] {
  const nextItem: ArticleHistoryItem = {
    id: articleId,
    articleId,
    title,
    lastViewedAt: new Date().toISOString(),
  };

  const existingItems = readGuestArticleHistory().filter(
    (item) => item.articleId !== articleId
  );

  return saveGuestArticleHistory([nextItem, ...existingItems]);
}

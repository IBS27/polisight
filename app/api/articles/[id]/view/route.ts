import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ============================================
// POST /api/articles/[id]/view - Track article view for authenticated user
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: articleId } = await params;

    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // If not authenticated, silently skip tracking (articles are public)
    if (authError || !user) {
      return NextResponse.json({ tracked: false, reason: 'not_authenticated' });
    }

    // Check if article exists
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Upsert the user_articles record
    const { error: upsertError } = await supabase
      .from('user_articles')
      .upsert(
        {
          user_id: user.id,
          article_id: articleId,
          last_viewed_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,article_id',
        }
      );

    if (upsertError) {
      console.error('Failed to track article view:', upsertError);
      return NextResponse.json(
        { error: 'Failed to track view' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tracked: true });
  } catch (error) {
    console.error('Track view error:', error);
    return NextResponse.json(
      { error: 'Failed to track view' },
      { status: 500 }
    );
  }
}

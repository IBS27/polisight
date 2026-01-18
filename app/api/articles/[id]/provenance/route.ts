import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ============================================
// GET /api/articles/[id]/provenance - Get provenance trail
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: articleId } = await params;

  try {
    const supabase = await createClient();

    const { data: entries, error } = await supabase
      .from('provenance_logs')
      .select('*')
      .eq('article_id', articleId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch provenance:', error);
      return NextResponse.json(
        { error: 'Failed to fetch provenance' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      articleId,
      entries: entries?.map(e => ({
        id: e.id,
        entityType: e.entity_type,
        entityId: e.entity_id,
        action: e.action,
        description: e.description,
        createdAt: e.created_at,
        durationMs: e.duration_ms,
        llmModel: e.llm_model,
        apiProvider: e.api_provider,
        inputData: e.input_data,
        outputData: e.output_data,
      })) || [],
      count: entries?.length || 0,
    });
  } catch (error) {
    console.error('Fetch provenance error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provenance' },
      { status: 500 }
    );
  }
}

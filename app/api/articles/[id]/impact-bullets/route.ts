import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { generateImpactBullets } from '@/lib/services/impact-bullets-generator';
import { createTimedLogger } from '@/lib/services/provenance';
import type { UserProfile } from '@/lib/schemas/core';
import type { ImpactBullet } from '@/lib/schemas/impact-bullets';

// Allow longer execution for LLM calls
export const maxDuration = 60;

// ============================================
// Request Schema
// ============================================

const ImpactBulletsRequestSchema = z.object({
  userProfileId: z.string().uuid(),
});

// ============================================
// Helper: Convert DB profile to UserProfile
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dbProfileToUserProfile(profile: any): UserProfile {
  return {
    id: profile.id,
    age: profile.age,
    state: profile.state,
    city: profile.city,
    zip_code: profile.zip_code,
    household_size: profile.household_size,
    marital_status: profile.marital_status,
    employment_status: profile.employment_status,
    individual_income: profile.individual_income ? parseFloat(profile.individual_income) : undefined,
    household_income: profile.household_income ? parseFloat(profile.household_income) : undefined,
    tax_filing_status: profile.tax_filing_status,
    industry: profile.industry,
    rent_vs_own: profile.rent_vs_own,
    annual_housing_payment: profile.annual_housing_payment ? parseFloat(profile.annual_housing_payment) : undefined,
    student_loan_balance: profile.student_loan_balance ? parseFloat(profile.student_loan_balance) : undefined,
    other_debts: profile.other_debts ? parseFloat(profile.other_debts) : undefined,
    insurance_status: profile.insurance_status,
    insurance_type: profile.insurance_type,
    dependents_covered: profile.dependents_covered,
    student_status: profile.student_status,
    institution_type: profile.institution_type,
    in_state_vs_out_of_state: profile.in_state_vs_out_of_state,
    current_benefits: profile.current_benefits,
    retirement_accounts: profile.retirement_accounts ? parseFloat(profile.retirement_accounts) : undefined,
    investment_accounts: profile.investment_accounts ? parseFloat(profile.investment_accounts) : undefined,
    home_equity: profile.home_equity ? parseFloat(profile.home_equity) : undefined,
    planning_home_purchase: profile.planning_home_purchase,
    planning_retirement_soon: profile.planning_retirement_soon,
    planning_children: profile.planning_children,
    planning_start_business: profile.planning_start_business,
    is_gig_worker: profile.is_gig_worker,
    is_union_member: profile.is_union_member,
    is_small_business_owner: profile.is_small_business_owner,
  };
}

// ============================================
// POST /api/articles/[id]/impact-bullets
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id: articleId } = await params;

  try {
    const body = await request.json();

    const parseResult = ImpactBulletsRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { userProfileId } = parseResult.data;
    const supabase = await createClient();

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userProfileId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Get article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id, title, clean_text')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Get claims
    const { data: claims } = await supabase
      .from('argument_elements')
      .select('id, content, claim_type, confidence')
      .eq('article_id', articleId)
      .eq('element_type', 'claim');

    const policyClaimsForPrompt = (claims || []).map(c => ({
      id: c.id,
      content: c.content,
      claimType: c.claim_type || 'general',
      confidence: c.confidence || 0.5,
    }));

    // Generate impact bullets
    const result = await generateImpactBullets(
      { id: article.id, title: article.title, cleanText: article.clean_text },
      policyClaimsForPrompt,
      dbProfileToUserProfile(profile)
    );

    // Delete existing record if present
    await supabase
      .from('impact_bullets')
      .delete()
      .eq('user_profile_id', userProfileId)
      .eq('article_id', articleId);

    // Store result
    const { data: insertedBullets, error: insertError } = await supabase
      .from('impact_bullets')
      .insert({
        article_id: articleId,
        user_profile_id: userProfileId,
        bullets: result.response.bullets,
        overall_sentiment: 'neutral', // Simplified - not tracking overall sentiment
        summary_headline: result.response.summary,
        llm_model: result.model,
        prompt_tokens: result.promptTokens,
        completion_tokens: result.completionTokens,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert impact bullets:', insertError);
    }

    // Log provenance
    if (insertedBullets) {
      const logger = createTimedLogger('impact_bullets', insertedBullets.id, articleId);
      await logger.log('calculated', 'Impact bullets generated via LLM', {
        inputData: { userProfileId, claimCount: policyClaimsForPrompt.length },
        outputData: { bulletCount: result.response.bullets.length },
        apiProvider: 'openrouter',
        llmModel: result.model,
      });
    }

    return NextResponse.json({
      articleId,
      userProfileId,
      id: insertedBullets?.id,
      bullets: result.response.bullets,
      summary: result.response.summary,
      model: result.model,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Impact bullets generation error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate impact bullets', details: message },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/articles/[id]/impact-bullets
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: articleId } = await params;
  const { searchParams } = new URL(request.url);
  const userProfileId = searchParams.get('userProfileId');

  if (!userProfileId) {
    return NextResponse.json({ error: 'userProfileId query parameter required' }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    const { data: bullets, error } = await supabase
      .from('impact_bullets')
      .select('*')
      .eq('article_id', articleId)
      .eq('user_profile_id', userProfileId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to fetch impact bullets:', error);
      return NextResponse.json({ error: 'Failed to fetch impact bullets' }, { status: 500 });
    }

    if (!bullets) {
      return NextResponse.json({ articleId, userProfileId, exists: false });
    }

    return NextResponse.json({
      articleId,
      userProfileId,
      exists: true,
      id: bullets.id,
      bullets: bullets.bullets as ImpactBullet[],
      summary: bullets.summary_headline,
      createdAt: bullets.created_at,
    });
  } catch (error) {
    console.error('Fetch impact bullets error:', error);
    return NextResponse.json({ error: 'Failed to fetch impact bullets' }, { status: 500 });
  }
}

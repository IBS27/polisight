import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractPolicyParameters } from '@/lib/services/policy-extraction';
import { createTimedLogger } from '@/lib/services/provenance';

// ============================================
// POST /api/articles/[id]/parameters - Extract policy parameters
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id: articleId } = await params;

  try {
    const supabase = await createClient();

    // Get article
    const { data: article, error: articleError } = await supabase
      .from('articles')
      .select('id, title')
      .eq('id', articleId)
      .single();

    if (articleError || !article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Get sentences
    const { data: sentences, error: sentencesError } = await supabase
      .from('sentence_spans')
      .select('*')
      .eq('article_id', articleId)
      .order('sentence_index', { ascending: true });

    if (sentencesError || !sentences || sentences.length === 0) {
      return NextResponse.json(
        { error: 'No sentences found for article' },
        { status: 400 }
      );
    }

    // Get claims
    const { data: claims } = await supabase
      .from('argument_elements')
      .select('content, claim_type')
      .eq('article_id', articleId)
      .eq('element_type', 'claim');

    // Convert sentences to spans
    const sentenceSpans = sentences.map((s) => ({
      text: s.text,
      startChar: s.start_char,
      endChar: s.end_char,
      paragraphIndex: s.paragraph_index || 0,
      sentenceIndex: s.sentence_index,
    }));

    // Convert claims
    const claimsList = (claims || []).map(c => ({
      content: c.content,
      claimType: c.claim_type || 'factual',
    }));

    // Extract policy parameters
    const extraction = await extractPolicyParameters(
      articleId,
      article.title,
      sentenceSpans,
      claimsList
    );

    // Use atomic replace function to prevent data loss on insert failure
    const policyType = extraction.result.extractionStatus === 'extracted'
      ? extraction.result.policyType
      : null;
    const parameters = extraction.result.extractionStatus === 'extracted'
      ? extraction.result.parameters
      : (extraction.result.extractionStatus === 'insufficient_detail'
        ? extraction.result.partialParameters
        : null);
    const calculationFormulas = extraction.result.extractionStatus === 'extracted'
      ? extraction.result.calculationFormulas
      : [];
    const reason = extraction.result.extractionStatus !== 'extracted'
      ? extraction.result.reason
      : null;
    const missingInformation = extraction.result.extractionStatus === 'insufficient_detail'
      ? extraction.result.missingInformation
      : [];

    const { data: insertedParam, error: replaceError } = await supabase.rpc('replace_policy_parameters', {
      p_article_id: articleId,
      p_extraction_status: extraction.result.extractionStatus,
      p_policy_type: policyType,
      p_parameters: parameters,
      p_calculation_formulas: calculationFormulas,
      p_reason: reason,
      p_missing_information: missingInformation,
    });

    if (replaceError || !insertedParam) {
      console.error('Failed to replace policy parameters:', replaceError);
      return NextResponse.json(
        { error: 'Failed to store policy parameters' },
        { status: 500 }
      );
    }

    // Log provenance
    const logger = createTimedLogger('policy_parameters', insertedParam.id, articleId);
    await logger.log('extracted', 'Policy parameter extraction completed', {
      inputData: {
        sentenceCount: sentences.length,
        claimCount: claims?.length || 0,
      },
      outputData: {
        extractionStatus: extraction.result.extractionStatus,
        hasFormulas: extraction.result.extractionStatus === 'extracted'
          ? extraction.result.calculationFormulas.length > 0
          : false,
      },
      llmModel: extraction.model,
      llmPrompt: extraction.prompt,
      llmResponse: extraction.rawResponse,
      apiProvider: 'openrouter',
    });

    // Build response based on extraction status
    const responseData: Record<string, unknown> = {
      articleId,
      policyParameterId: insertedParam.id,
      extractionStatus: extraction.result.extractionStatus,
      durationMs: Date.now() - startTime,
    };

    if (extraction.result.extractionStatus === 'extracted') {
      responseData.policyType = extraction.result.policyType;
      responseData.formulaCount = extraction.result.calculationFormulas.length;
      responseData.hasEligibilityCriteria = !!extraction.result.parameters.eligibility;
    } else if (extraction.result.extractionStatus === 'insufficient_detail') {
      responseData.reason = extraction.result.reason;
      responseData.missingInformation = extraction.result.missingInformation;
    } else {
      responseData.reason = extraction.result.reason;
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Policy parameter extraction error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: 'Failed to extract policy parameters', details: message },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/articles/[id]/parameters - Get policy parameters
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: articleId } = await params;

  try {
    const supabase = await createClient();

    const { data: policyParams, error } = await supabase
      .from('policy_parameters')
      .select('*')
      .eq('article_id', articleId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to fetch policy parameters:', error);
      return NextResponse.json(
        { error: 'Failed to fetch policy parameters' },
        { status: 500 }
      );
    }

    if (!policyParams) {
      return NextResponse.json({
        articleId,
        exists: false,
        message: 'No policy parameters extracted yet',
      });
    }

    return NextResponse.json({
      articleId,
      exists: true,
      id: policyParams.id,
      extractionStatus: policyParams.extraction_status,
      policyType: policyParams.policy_type,
      parameters: policyParams.parameters,
      calculationFormulas: policyParams.calculation_formulas,
      reason: policyParams.reason,
      missingInformation: policyParams.missing_information,
    });
  } catch (error) {
    console.error('Fetch policy parameters error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch policy parameters' },
      { status: 500 }
    );
  }
}

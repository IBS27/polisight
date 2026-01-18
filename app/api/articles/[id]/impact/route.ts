import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { calculateImpact, generateImpactHeadline } from '@/lib/services/impact-calculator';
import { createTimedLogger } from '@/lib/services/provenance';
import type { UserProfile } from '@/lib/schemas/core';

// ============================================
// Request Schema
// ============================================

const ImpactRequestSchema = z.object({
  userProfileId: z.string().uuid(),
  policyParameterId: z.string().uuid().optional(), // If not provided, uses first available
});

// ============================================
// POST /api/articles/[id]/impact - Calculate personal impact
// ============================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id: articleId } = await params;

  try {
    const body = await request.json();

    // Validate request
    const parseResult = ImpactRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { userProfileId, policyParameterId } = parseResult.data;

    const supabase = await createClient();

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userProfileId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Get policy parameters
    let policyParamsQuery = supabase
      .from('policy_parameters')
      .select('*')
      .eq('article_id', articleId);

    if (policyParameterId) {
      policyParamsQuery = policyParamsQuery.eq('id', policyParameterId);
    }

    const { data: policyParams, error: paramsError } = await policyParamsQuery.single();

    if (paramsError || !policyParams) {
      return NextResponse.json({
        calculationStatus: 'cannot_compute',
        reason: 'No policy parameters available for this article',
        missingInputs: [],
        headline: 'Unable to calculate personal impact',
        explanation: 'This article has not been analyzed for policy parameters yet, or no quantifiable policy was found.',
      });
    }

    // Check extraction status
    if (policyParams.extraction_status === 'not_applicable') {
      return NextResponse.json({
        calculationStatus: 'cannot_compute',
        reason: policyParams.reason || 'This article does not discuss quantifiable policy changes',
        missingInputs: [],
        headline: 'No quantifiable policy impact',
        explanation: 'This article discusses policy topics but does not contain specific changes that would affect your finances.',
      });
    }

    if (policyParams.extraction_status === 'insufficient_detail') {
      return NextResponse.json({
        calculationStatus: 'cannot_compute',
        reason: policyParams.reason || 'Insufficient policy details to calculate impact',
        missingInputs: [],
        headline: 'Incomplete policy information',
        explanation: 'The article mentions policy changes but lacks the specific details needed to calculate personal impact.',
        missingInformation: policyParams.missing_information,
      });
    }

    // Convert profile to typed object
    const userProfile: UserProfile = {
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
    };

    // Calculate impact
    const result = calculateImpact(
      userProfile,
      policyParams.parameters || {},
      policyParams.calculation_formulas || []
    );

    const headline = generateImpactHeadline(result);

    // Check if calculation already exists
    const { data: existingCalc } = await supabase
      .from('impact_calculations')
      .select('id')
      .eq('user_profile_id', userProfileId)
      .eq('policy_parameter_id', policyParams.id)
      .single();

    // Delete existing calculation if present
    if (existingCalc) {
      await supabase
        .from('impact_calculations')
        .delete()
        .eq('id', existingCalc.id);
    }

    // Store calculation result
    const calcRecord = {
      user_profile_id: userProfileId,
      policy_parameter_id: policyParams.id,
      article_id: articleId,
      calculation_status: result.calculationStatus,
      primary_impact_value: result.calculationStatus === 'computed' ? result.primaryImpactValue : null,
      impact_unit: result.calculationStatus === 'computed' ? result.impactUnit : null,
      impact_direction: result.calculationStatus === 'computed' ? result.impactDirection : null,
      calculation_breakdown: result.calculationStatus === 'computed' ? result.calculationBreakdown : null,
      caveats: result.calculationStatus === 'computed' ? result.caveats : [],
      reason: result.calculationStatus === 'cannot_compute' ? result.reason : null,
      missing_inputs: result.calculationStatus === 'cannot_compute' ? result.missingInputs : [],
    };

    const { data: insertedCalc, error: insertError } = await supabase
      .from('impact_calculations')
      .insert(calcRecord)
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to insert impact calculation:', insertError);
    }

    // Log provenance
    if (insertedCalc) {
      const logger = createTimedLogger('impact_calculation', insertedCalc.id, articleId);
      await logger.log('calculated', 'Impact calculation completed', {
        inputData: {
          userProfileId,
          policyParameterId: policyParams.id,
        },
        outputData: {
          calculationStatus: result.calculationStatus,
          impactValue: result.calculationStatus === 'computed' ? result.primaryImpactValue : null,
        },
      });
    }

    // Build response
    const response: Record<string, unknown> = {
      articleId,
      userProfileId,
      policyParameterId: policyParams.id,
      calculationId: insertedCalc?.id,
      ...result,
      headline,
      durationMs: Date.now() - startTime,
    };

    if (result.calculationStatus === 'computed') {
      response.explanation = `Based on your profile, this policy would result in ${
        result.impactDirection === 'positive' ? 'savings' : 'additional costs'
      } of approximately $${Math.abs(result.primaryImpactValue).toLocaleString()} per year.`;
    } else {
      response.explanation = result.reason;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Impact calculation error:', error);

    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      { error: 'Failed to calculate impact', details: message },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/articles/[id]/impact - Get existing calculation
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: articleId } = await params;
  const { searchParams } = new URL(request.url);
  const userProfileId = searchParams.get('userProfileId');

  if (!userProfileId) {
    return NextResponse.json(
      { error: 'userProfileId query parameter required' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    const { data: calculation, error } = await supabase
      .from('impact_calculations')
      .select('*')
      .eq('article_id', articleId)
      .eq('user_profile_id', userProfileId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to fetch impact calculation:', error);
      return NextResponse.json(
        { error: 'Failed to fetch impact calculation' },
        { status: 500 }
      );
    }

    if (!calculation) {
      return NextResponse.json({
        articleId,
        userProfileId,
        exists: false,
        message: 'No impact calculation found',
      });
    }

    return NextResponse.json({
      articleId,
      userProfileId,
      exists: true,
      id: calculation.id,
      calculationStatus: calculation.calculation_status,
      primaryImpactValue: calculation.primary_impact_value,
      impactUnit: calculation.impact_unit,
      impactDirection: calculation.impact_direction,
      calculationBreakdown: calculation.calculation_breakdown,
      caveats: calculation.caveats,
      reason: calculation.reason,
      missingInputs: calculation.missing_inputs,
    });
  } catch (error) {
    console.error('Fetch impact calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch impact calculation' },
      { status: 500 }
    );
  }
}

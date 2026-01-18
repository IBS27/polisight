import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserProfileSchema } from '@/lib/schemas/core';

// ============================================
// GET /api/users/profile - Get user profile for authenticated user
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Calculate profile completeness
    const completenessFields = [
      'age', 'state', 'household_size', 'marital_status',
      'employment_status', 'household_income', 'tax_filing_status',
      'insurance_status', 'student_status', 'rent_vs_own',
    ];
    const filledFields = completenessFields.filter(f => profile[f] !== null && profile[f] !== undefined);
    const completeness = Math.round((filledFields.length / completenessFields.length) * 100);

    return NextResponse.json({
      profile: {
        id: profile.id,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        // Basic
        age: profile.age,
        state: profile.state,
        city: profile.city,
        zipCode: profile.zip_code,
        householdSize: profile.household_size,
        maritalStatus: profile.marital_status,
        // Income
        employmentStatus: profile.employment_status,
        individualIncome: profile.individual_income,
        householdIncome: profile.household_income,
        taxFilingStatus: profile.tax_filing_status,
        industry: profile.industry,
        // Housing
        rentVsOwn: profile.rent_vs_own,
        annualHousingPayment: profile.annual_housing_payment,
        studentLoanBalance: profile.student_loan_balance,
        otherDebts: profile.other_debts,
        // Healthcare
        insuranceStatus: profile.insurance_status,
        insuranceType: profile.insurance_type,
        dependentsCovered: profile.dependents_covered,
        // Education
        studentStatus: profile.student_status,
        institutionType: profile.institution_type,
        inStateVsOutOfState: profile.in_state_vs_out_of_state,
        // Benefits
        currentBenefits: profile.current_benefits,
        // Assets
        retirementAccounts: profile.retirement_accounts,
        investmentAccounts: profile.investment_accounts,
        homeEquity: profile.home_equity,
        // Life Plans
        planningHomePurchase: profile.planning_home_purchase,
        planningRetirementSoon: profile.planning_retirement_soon,
        planningChildren: profile.planning_children,
        planningStartBusiness: profile.planning_start_business,
        // Work Details
        isGigWorker: profile.is_gig_worker,
        isUnionMember: profile.is_union_member,
        isSmallBusinessOwner: profile.is_small_business_owner,
      },
      completeness,
      missingFields: completenessFields.filter(f => profile[f] === null || profile[f] === undefined),
    });
  } catch (error) {
    console.error('Fetch profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/users/profile - Create new profile for authenticated user
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user already has a profile
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Profile already exists', id: existingProfile.id },
        { status: 409 }
      );
    }

    const body = await request.json();

    // Filter out null values (convert to undefined for Zod optional fields)
    const cleanedBody = Object.fromEntries(
      Object.entries(body).filter(([, value]) => value !== null)
    );

    // Validate with Zod schema
    const parseResult = UserProfileSchema.safeParse(cleanedBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const profileData = parseResult.data;

    // Convert camelCase to snake_case for database
    const dbRecord = {
      user_id: user.id,
      age: profileData.age,
      state: profileData.state,
      city: profileData.city,
      zip_code: profileData.zip_code,
      household_size: profileData.household_size,
      marital_status: profileData.marital_status,
      employment_status: profileData.employment_status,
      individual_income: profileData.individual_income,
      household_income: profileData.household_income,
      tax_filing_status: profileData.tax_filing_status,
      industry: profileData.industry,
      rent_vs_own: profileData.rent_vs_own,
      annual_housing_payment: profileData.annual_housing_payment,
      student_loan_balance: profileData.student_loan_balance,
      other_debts: profileData.other_debts,
      insurance_status: profileData.insurance_status,
      insurance_type: profileData.insurance_type,
      dependents_covered: profileData.dependents_covered,
      student_status: profileData.student_status,
      institution_type: profileData.institution_type,
      in_state_vs_out_of_state: profileData.in_state_vs_out_of_state,
      current_benefits: profileData.current_benefits,
      // Assets
      retirement_accounts: profileData.retirement_accounts,
      investment_accounts: profileData.investment_accounts,
      home_equity: profileData.home_equity,
      // Life Plans
      planning_home_purchase: profileData.planning_home_purchase,
      planning_retirement_soon: profileData.planning_retirement_soon,
      planning_children: profileData.planning_children,
      planning_start_business: profileData.planning_start_business,
      // Work Details
      is_gig_worker: profileData.is_gig_worker,
      is_union_member: profileData.is_union_member,
      is_small_business_owner: profileData.is_small_business_owner,
    };

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .insert(dbRecord)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create profile:', error);
      return NextResponse.json(
        { error: 'Failed to create profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: profile.id,
      message: 'Profile created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Create profile error:', error);
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/users/profile - Update profile for authenticated user
// ============================================

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Filter out null values (convert to undefined for Zod optional fields)
    const cleanedBody = Object.fromEntries(
      Object.entries(body).filter(([, value]) => value !== null)
    );

    // Validate with Zod schema
    const parseResult = UserProfileSchema.safeParse(cleanedBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid profile data', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const profileData = parseResult.data;

    // Check if profile exists for this user
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Profile not found. Create one first.' },
        { status: 404 }
      );
    }

    // Convert camelCase to snake_case for database
    const dbRecord: Record<string, unknown> = {};
    if (profileData.age !== undefined) dbRecord.age = profileData.age;
    if (profileData.state !== undefined) dbRecord.state = profileData.state;
    if (profileData.city !== undefined) dbRecord.city = profileData.city;
    if (profileData.zip_code !== undefined) dbRecord.zip_code = profileData.zip_code;
    if (profileData.household_size !== undefined) dbRecord.household_size = profileData.household_size;
    if (profileData.marital_status !== undefined) dbRecord.marital_status = profileData.marital_status;
    if (profileData.employment_status !== undefined) dbRecord.employment_status = profileData.employment_status;
    if (profileData.individual_income !== undefined) dbRecord.individual_income = profileData.individual_income;
    if (profileData.household_income !== undefined) dbRecord.household_income = profileData.household_income;
    if (profileData.tax_filing_status !== undefined) dbRecord.tax_filing_status = profileData.tax_filing_status;
    if (profileData.industry !== undefined) dbRecord.industry = profileData.industry;
    if (profileData.rent_vs_own !== undefined) dbRecord.rent_vs_own = profileData.rent_vs_own;
    if (profileData.annual_housing_payment !== undefined) dbRecord.annual_housing_payment = profileData.annual_housing_payment;
    if (profileData.student_loan_balance !== undefined) dbRecord.student_loan_balance = profileData.student_loan_balance;
    if (profileData.other_debts !== undefined) dbRecord.other_debts = profileData.other_debts;
    if (profileData.insurance_status !== undefined) dbRecord.insurance_status = profileData.insurance_status;
    if (profileData.insurance_type !== undefined) dbRecord.insurance_type = profileData.insurance_type;
    if (profileData.dependents_covered !== undefined) dbRecord.dependents_covered = profileData.dependents_covered;
    if (profileData.student_status !== undefined) dbRecord.student_status = profileData.student_status;
    if (profileData.institution_type !== undefined) dbRecord.institution_type = profileData.institution_type;
    if (profileData.in_state_vs_out_of_state !== undefined) dbRecord.in_state_vs_out_of_state = profileData.in_state_vs_out_of_state;
    if (profileData.current_benefits !== undefined) dbRecord.current_benefits = profileData.current_benefits;
    // Assets
    if (profileData.retirement_accounts !== undefined) dbRecord.retirement_accounts = profileData.retirement_accounts;
    if (profileData.investment_accounts !== undefined) dbRecord.investment_accounts = profileData.investment_accounts;
    if (profileData.home_equity !== undefined) dbRecord.home_equity = profileData.home_equity;
    // Life Plans
    if (profileData.planning_home_purchase !== undefined) dbRecord.planning_home_purchase = profileData.planning_home_purchase;
    if (profileData.planning_retirement_soon !== undefined) dbRecord.planning_retirement_soon = profileData.planning_retirement_soon;
    if (profileData.planning_children !== undefined) dbRecord.planning_children = profileData.planning_children;
    if (profileData.planning_start_business !== undefined) dbRecord.planning_start_business = profileData.planning_start_business;
    // Work Details
    if (profileData.is_gig_worker !== undefined) dbRecord.is_gig_worker = profileData.is_gig_worker;
    if (profileData.is_union_member !== undefined) dbRecord.is_union_member = profileData.is_union_member;
    if (profileData.is_small_business_owner !== undefined) dbRecord.is_small_business_owner = profileData.is_small_business_owner;

    const { error } = await supabase
      .from('user_profiles')
      .update(dbRecord)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to update profile:', error);
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: existing.id,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

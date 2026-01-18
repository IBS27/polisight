'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { User, Briefcase, Home, Heart, GraduationCap, Gift, PiggyBank, Target } from 'lucide-react';

// ============================================
// Types
// ============================================

interface ProfileData {
  // Basic
  age?: number;
  state?: string;
  city?: string;
  zipCode?: string;
  householdSize?: number;
  maritalStatus?: string;
  // Income
  employmentStatus?: string;
  individualIncome?: number;
  householdIncome?: number;
  taxFilingStatus?: string;
  industry?: string;
  // Housing
  rentVsOwn?: string;
  annualHousingPayment?: number;
  studentLoanBalance?: number;
  otherDebts?: number;
  // Healthcare
  insuranceStatus?: string;
  insuranceType?: string;
  dependentsCovered?: number;
  // Education
  studentStatus?: string;
  institutionType?: string;
  inStateVsOutOfState?: string;
  // Benefits
  currentBenefits?: {
    snap?: boolean;
    medicaid?: boolean;
    medicare?: boolean;
    pell_grant?: boolean;
    child_tax_credit?: boolean;
    earned_income_tax_credit?: boolean;
  };
  // Assets
  retirementAccounts?: number;
  investmentAccounts?: number;
  homeEquity?: number;
  // Life Plans
  planningHomePurchase?: boolean;
  planningRetirementSoon?: boolean;
  planningChildren?: boolean;
  planningStartBusiness?: boolean;
  // Work Details
  isGigWorker?: boolean;
  isUnionMember?: boolean;
  isSmallBusinessOwner?: boolean;
}

interface ProfileFormProps {
  data: ProfileData;
  onChange: (data: ProfileData) => void;
}

// ============================================
// US States
// ============================================

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
];

// ============================================
// Component
// ============================================

export function ProfileForm({ data, onChange }: ProfileFormProps) {
  const updateField = <K extends keyof ProfileData>(
    field: K,
    value: ProfileData[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      {/* Basic Demographics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              min={0}
              max={150}
              value={data.age || ''}
              onChange={(e) => updateField('age', parseInt(e.target.value) || undefined)}
              placeholder="Enter age"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <select
              id="state"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={data.state || ''}
              onChange={(e) => updateField('state', e.target.value || undefined)}
            >
              <option value="">Select state</option>
              {US_STATES.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="householdSize">Household Size</Label>
            <Input
              id="householdSize"
              type="number"
              min={1}
              value={data.householdSize || ''}
              onChange={(e) => updateField('householdSize', parseInt(e.target.value) || undefined)}
              placeholder="Number of people"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maritalStatus">Marital Status</Label>
            <select
              id="maritalStatus"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={data.maritalStatus || ''}
              onChange={(e) => updateField('maritalStatus', e.target.value || undefined)}
            >
              <option value="">Select status</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
              <option value="separated">Separated</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Income & Employment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="w-4 h-4" />
            Income & Employment
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="employmentStatus">Employment Status</Label>
            <select
              id="employmentStatus"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={data.employmentStatus || ''}
              onChange={(e) => updateField('employmentStatus', e.target.value || undefined)}
            >
              <option value="">Select status</option>
              <option value="employed_full_time">Employed Full-Time</option>
              <option value="employed_part_time">Employed Part-Time</option>
              <option value="self_employed">Self-Employed</option>
              <option value="unemployed">Unemployed</option>
              <option value="retired">Retired</option>
              <option value="student">Student</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="individualIncome">Individual Income ($/year)</Label>
            <Input
              id="individualIncome"
              type="number"
              min={0}
              value={data.individualIncome || ''}
              onChange={(e) => updateField('individualIncome', parseFloat(e.target.value) || undefined)}
              placeholder="Annual income"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="householdIncome">Household Income ($/year)</Label>
            <Input
              id="householdIncome"
              type="number"
              min={0}
              value={data.householdIncome || ''}
              onChange={(e) => updateField('householdIncome', parseFloat(e.target.value) || undefined)}
              placeholder="Total household income"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxFilingStatus">Tax Filing Status</Label>
            <select
              id="taxFilingStatus"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={data.taxFilingStatus || ''}
              onChange={(e) => updateField('taxFilingStatus', e.target.value || undefined)}
            >
              <option value="">Select status</option>
              <option value="single">Single</option>
              <option value="married_filing_jointly">Married Filing Jointly</option>
              <option value="married_filing_separately">Married Filing Separately</option>
              <option value="head_of_household">Head of Household</option>
              <option value="qualifying_widow">Qualifying Widow(er)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Housing & Finances */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Home className="w-4 h-4" />
            Housing & Finances
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="rentVsOwn">Housing Status</Label>
            <select
              id="rentVsOwn"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={data.rentVsOwn || ''}
              onChange={(e) => updateField('rentVsOwn', e.target.value || undefined)}
            >
              <option value="">Select status</option>
              <option value="rent">Rent</option>
              <option value="own">Own</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="annualHousingPayment">Annual Housing Payment ($)</Label>
            <Input
              id="annualHousingPayment"
              type="number"
              min={0}
              value={data.annualHousingPayment || ''}
              onChange={(e) => updateField('annualHousingPayment', parseFloat(e.target.value) || undefined)}
              placeholder="Rent or mortgage per year"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="studentLoanBalance">Student Loan Balance ($)</Label>
            <Input
              id="studentLoanBalance"
              type="number"
              min={0}
              value={data.studentLoanBalance || ''}
              onChange={(e) => updateField('studentLoanBalance', parseFloat(e.target.value) || undefined)}
              placeholder="Total student loans"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="otherDebts">Other Debts ($)</Label>
            <Input
              id="otherDebts"
              type="number"
              min={0}
              value={data.otherDebts || ''}
              onChange={(e) => updateField('otherDebts', parseFloat(e.target.value) || undefined)}
              placeholder="Credit cards, loans, etc."
            />
          </div>
        </CardContent>
      </Card>

      {/* Healthcare */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="w-4 h-4" />
            Healthcare
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="insuranceStatus">Insurance Status</Label>
            <select
              id="insuranceStatus"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={data.insuranceStatus || ''}
              onChange={(e) => updateField('insuranceStatus', e.target.value || undefined)}
            >
              <option value="">Select status</option>
              <option value="insured">Insured</option>
              <option value="uninsured">Uninsured</option>
              <option value="underinsured">Underinsured</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="insuranceType">Insurance Type</Label>
            <select
              id="insuranceType"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={data.insuranceType || ''}
              onChange={(e) => updateField('insuranceType', e.target.value || undefined)}
            >
              <option value="">Select type</option>
              <option value="employer">Employer-Provided</option>
              <option value="marketplace">Marketplace/ACA</option>
              <option value="medicaid">Medicaid</option>
              <option value="medicare">Medicare</option>
              <option value="va">VA/Military</option>
              <option value="private">Private/Individual</option>
              <option value="none">None</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dependentsCovered">Dependents Covered</Label>
            <Input
              id="dependentsCovered"
              type="number"
              min={0}
              value={data.dependentsCovered || ''}
              onChange={(e) => updateField('dependentsCovered', parseInt(e.target.value) || undefined)}
              placeholder="Number of dependents"
            />
          </div>
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="w-4 h-4" />
            Education
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="studentStatus">Student Status</Label>
            <select
              id="studentStatus"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={data.studentStatus || ''}
              onChange={(e) => updateField('studentStatus', e.target.value || undefined)}
            >
              <option value="">Select status</option>
              <option value="not_student">Not a Student</option>
              <option value="part_time">Part-Time Student</option>
              <option value="full_time">Full-Time Student</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="institutionType">Institution Type</Label>
            <select
              id="institutionType"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={data.institutionType || ''}
              onChange={(e) => updateField('institutionType', e.target.value || undefined)}
            >
              <option value="">Select type</option>
              <option value="public_2year">Public 2-Year</option>
              <option value="public_4year">Public 4-Year</option>
              <option value="private_nonprofit">Private Non-Profit</option>
              <option value="private_forprofit">Private For-Profit</option>
              <option value="none">Not Applicable</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Current Benefits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="w-4 h-4" />
            Current Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Select any benefits you currently receive:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { key: 'snap', label: 'SNAP (Food Stamps)' },
              { key: 'medicaid', label: 'Medicaid' },
              { key: 'medicare', label: 'Medicare' },
              { key: 'pell_grant', label: 'Pell Grant' },
              { key: 'child_tax_credit', label: 'Child Tax Credit' },
              { key: 'earned_income_tax_credit', label: 'Earned Income Tax Credit' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.currentBenefits?.[key as keyof typeof data.currentBenefits] || false}
                  onChange={(e) => updateField('currentBenefits', {
                    ...data.currentBenefits,
                    [key]: e.target.checked,
                  })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <PiggyBank className="w-4 h-4" />
            Assets
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="retirementAccounts">Retirement Accounts ($)</Label>
            <Input
              id="retirementAccounts"
              type="number"
              min={0}
              value={data.retirementAccounts || ''}
              onChange={(e) => updateField('retirementAccounts', parseFloat(e.target.value) || undefined)}
              placeholder="401k, IRA, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="investmentAccounts">Investment Accounts ($)</Label>
            <Input
              id="investmentAccounts"
              type="number"
              min={0}
              value={data.investmentAccounts || ''}
              onChange={(e) => updateField('investmentAccounts', parseFloat(e.target.value) || undefined)}
              placeholder="Brokerage, stocks, etc."
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="homeEquity">Home Equity ($)</Label>
            <Input
              id="homeEquity"
              type="number"
              min={0}
              value={data.homeEquity || ''}
              onChange={(e) => updateField('homeEquity', parseFloat(e.target.value) || undefined)}
              placeholder="Home value minus mortgage"
            />
          </div>
        </CardContent>
      </Card>

      {/* Life Plans & Work */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-4 h-4" />
            Life Plans & Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Select any that apply to help us find relevant policies:
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase">Life Plans</p>
              {[
                { key: 'planningHomePurchase', label: 'Planning to buy a home' },
                { key: 'planningRetirementSoon', label: 'Planning to retire soon' },
                { key: 'planningChildren', label: 'Planning to have children' },
                { key: 'planningStartBusiness', label: 'Planning to start a business' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data[key as keyof ProfileData] as boolean || false}
                    onChange={(e) => updateField(key as keyof ProfileData, e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase">Work Situation</p>
              {[
                { key: 'isGigWorker', label: 'Gig/freelance worker' },
                { key: 'isUnionMember', label: 'Union member' },
                { key: 'isSmallBusinessOwner', label: 'Small business owner' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data[key as keyof ProfileData] as boolean || false}
                    onChange={(e) => updateField(key as keyof ProfileData, e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

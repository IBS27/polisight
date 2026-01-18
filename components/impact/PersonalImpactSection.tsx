'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ImpactResult } from './ImpactResult';
import { CalculationBreakdown } from './CalculationBreakdown';
import { MissingInputsPrompt } from './MissingInputsPrompt';
import { Calculator, ChevronDown, ChevronUp, FileQuestion, User } from 'lucide-react';
import Link from 'next/link';

// ============================================
// Types
// ============================================

interface CalculationStep {
  stepNumber: number;
  description: string;
  formula?: string;
  inputs: Record<string, string | number>;
  result: number;
  unit?: string;
}

interface Caveat {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface MissingInput {
  field: string;
  fieldLabel: string;
  reason: string;
  impact: string;
  isRequired: boolean;
}

interface CalculationBreakdownData {
  steps: CalculationStep[];
  inputsUsed: Record<string, string | number>;
}

// Impact context
interface ImpactContext {
  asPercentageOfIncome: number | null;
  monthlyEquivalent: number;
  monthsOfHousingPayment: number | null;
}

// Additional dimension
interface AdditionalDimension {
  name: string;
  value: number;
  unit: 'dollars' | 'percentage' | 'boolean';
  description: string;
}

// Computed result
interface ComputedResult {
  calculationStatus: 'computed';
  primaryImpactValue: number;
  impactUnit: 'dollars_annual' | 'dollars_monthly' | 'dollars_one_time' | 'percentage' | 'qualitative';
  impactDirection: 'positive' | 'negative' | 'neutral' | 'mixed';
  calculationBreakdown: CalculationBreakdownData;
  caveats: Caveat[];
  confidenceLevel?: number;
  context?: ImpactContext;
  additionalDimensions?: AdditionalDimension[];
  headline: string;
  explanation: string;
}

// Cannot compute result
interface CannotComputeResult {
  calculationStatus: 'cannot_compute';
  reason: string;
  missingInputs: MissingInput[];
  headline: string;
  explanation: string;
}

// No policy parameters
interface NoPolicyResult {
  calculationStatus: 'no_policy';
  reason: string;
  headline: string;
  explanation: string;
}

type ImpactData = ComputedResult | CannotComputeResult | NoPolicyResult;

interface PersonalImpactSectionProps {
  data: ImpactData | null;
  isLoading?: boolean;
  hasProfile: boolean;
  profileId?: string;
  onCalculate?: () => void;
}

// ============================================
// Component
// ============================================

export function PersonalImpactSection({
  data,
  isLoading,
  hasProfile,
  profileId,
  onCalculate,
}: PersonalImpactSectionProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  // No profile state
  if (!hasProfile) {
    return (
      <Card className="border-2 border-dashed border-gray-300">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            <CardTitle className="text-lg">How This Affects You</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-gray-600 mb-4">
            Create a profile to see how this policy could affect you personally.
          </p>
          <Link href="/profile">
            <Button>
              <User className="w-4 h-4 mr-2" />
              Create Your Profile
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-500 animate-pulse" />
            <CardTitle className="text-lg">Calculating Your Impact...</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data yet - prompt to calculate
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-lg">How This Affects You</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-gray-600 mb-4">
            Calculate how this policy could affect your finances based on your profile.
          </p>
          <Button onClick={onCalculate} disabled={!onCalculate}>
            <Calculator className="w-4 h-4 mr-2" />
            Calculate My Impact
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Computed result
  if (data.calculationStatus === 'computed') {
    return (
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-lg">How This Affects You</CardTitle>
            </div>
            {onCalculate && (
              <Button variant="ghost" size="sm" onClick={onCalculate}>
                Recalculate
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImpactResult
            value={data.primaryImpactValue}
            unit={data.impactUnit}
            direction={data.impactDirection}
            headline={data.headline}
            explanation={data.explanation}
            caveats={data.caveats}
            confidenceLevel={data.confidenceLevel}
            context={data.context}
          />

          {/* Additional Dimensions */}
          {data.additionalDimensions && data.additionalDimensions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-500">Other Impact Dimensions</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.additionalDimensions.map((dimension, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {dimension.name}
                      </span>
                      <span className="text-lg font-semibold text-gray-900">
                        {dimension.unit === 'dollars'
                          ? dimension.value.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              maximumFractionDigits: 0,
                            })
                          : dimension.unit === 'percentage'
                            ? `${dimension.value}%`
                            : dimension.value ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {dimension.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Show/Hide Breakdown */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowBreakdown(!showBreakdown)}
          >
            {showBreakdown ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Hide Calculation Details
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Show How We Calculated This
              </>
            )}
          </Button>

          {showBreakdown && (
            <CalculationBreakdown
              steps={data.calculationBreakdown.steps}
              inputsUsed={data.calculationBreakdown.inputsUsed}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  // Cannot compute result
  if (data.calculationStatus === 'cannot_compute') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-yellow-500" />
            <CardTitle className="text-lg">How This Affects You</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <MissingInputsPrompt
            missingInputs={data.missingInputs}
            reason={data.reason}
            profileId={profileId}
          />
        </CardContent>
      </Card>
    );
  }

  // No policy parameters (not applicable)
  return (
    <Card className="border-gray-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileQuestion className="w-5 h-5 text-gray-400" />
          <CardTitle className="text-lg">How This Affects You</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-center py-4">
          <p className="text-gray-600 mb-2">{data.headline}</p>
          <p className="text-sm text-gray-500">{data.explanation}</p>
        </div>
      </CardContent>
    </Card>
  );
}

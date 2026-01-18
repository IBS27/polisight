'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';

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

interface CalculationBreakdownProps {
  steps: CalculationStep[];
  inputsUsed: Record<string, string | number>;
}

// ============================================
// Format Currency
// ============================================

function formatValue(value: number | string, unit?: string): string {
  if (typeof value === 'string') return value;

  if (unit === 'dollars' || unit === 'dollars_annual') {
    return value.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  }

  if (unit === 'percentage') {
    return `${value.toFixed(1)}%`;
  }

  return value.toLocaleString();
}

// ============================================
// Component
// ============================================

export function CalculationBreakdown({
  steps,
  inputsUsed,
}: CalculationBreakdownProps) {
  return (
    <Card className="bg-gray-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">How We Calculated This</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inputs Used */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 mb-2">
            Your Profile Values Used
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(inputsUsed).map(([key, value]) => (
              <div key={key} className="text-xs">
                <span className="text-gray-500">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}:
                </span>{' '}
                <span className="font-medium">
                  {typeof value === 'number'
                    ? value.toLocaleString()
                    : value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Calculation Steps */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 mb-2">
            Calculation Steps
          </h4>
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div
                key={step.stepNumber}
                className="bg-white rounded p-2 border text-xs"
              >
                <div className="flex items-center gap-1 text-gray-600 mb-1">
                  <span className="bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center text-xs">
                    {step.stepNumber}
                  </span>
                  <span>{step.description}</span>
                </div>
                {step.formula && (
                  <div className="font-mono text-gray-500 text-xs pl-6 mb-1">
                    {step.formula}
                  </div>
                )}
                <div className="flex items-center gap-1 pl-6">
                  <ChevronRight className="w-3 h-3 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {formatValue(step.result, step.unit)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface Caveat {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface ImpactResultProps {
  value: number;
  unit: 'dollars_annual' | 'dollars_monthly' | 'dollars_one_time' | 'percentage' | 'qualitative';
  direction: 'positive' | 'negative' | 'neutral' | 'mixed';
  headline: string;
  explanation: string;
  caveats: Caveat[];
  confidenceLevel?: number;
}

// ============================================
// Format Helpers
// ============================================

function formatImpactValue(value: number, unit: string): string {
  const absValue = Math.abs(value);

  if (unit.startsWith('dollars')) {
    return absValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    });
  }

  if (unit === 'percentage') {
    return `${absValue.toFixed(1)}%`;
  }

  return absValue.toLocaleString();
}

function getUnitLabel(unit: string): string {
  switch (unit) {
    case 'dollars_annual':
      return '/year';
    case 'dollars_monthly':
      return '/month';
    case 'dollars_one_time':
      return ' one-time';
    case 'percentage':
      return '';
    default:
      return '';
  }
}

// ============================================
// Component
// ============================================

export function ImpactResult({
  value,
  unit,
  direction,
  headline,
  explanation,
  caveats,
  confidenceLevel,
}: ImpactResultProps) {
  const isPositive = direction === 'positive';
  const isNegative = direction === 'negative';

  const iconClass = cn(
    'w-8 h-8',
    isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-gray-400'
  );

  const valueClass = cn(
    'text-4xl font-bold',
    isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
  );

  const bgClass = cn(
    'rounded-lg p-4',
    isPositive
      ? 'bg-green-50 border border-green-200'
      : isNegative
        ? 'bg-red-50 border border-red-200'
        : 'bg-gray-50 border border-gray-200'
  );

  return (
    <div className="space-y-4">
      {/* Main Impact Display */}
      <div className={bgClass}>
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            {isPositive ? (
              <TrendingUp className={iconClass} />
            ) : isNegative ? (
              <TrendingDown className={iconClass} />
            ) : (
              <Minus className={iconClass} />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-1">
              <span className={valueClass}>
                {isNegative && '-'}
                {formatImpactValue(value, unit)}
              </span>
              <span className="text-lg text-gray-500">
                {getUnitLabel(unit)}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-700 mt-1">{headline}</p>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <p className="text-sm text-gray-600">{explanation}</p>

      {/* Confidence */}
      {confidenceLevel !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Confidence:</span>
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                confidenceLevel >= 0.8
                  ? 'bg-green-500'
                  : confidenceLevel >= 0.6
                    ? 'bg-yellow-500'
                    : 'bg-orange-500'
              )}
              style={{ width: `${confidenceLevel * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">
            {Math.round(confidenceLevel * 100)}%
          </span>
        </div>
      )}

      {/* Caveats */}
      {caveats.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Important Considerations
          </h4>
          <ul className="space-y-1">
            {caveats.map((caveat, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs">
                <Badge
                  variant={
                    caveat.severity === 'high'
                      ? 'destructive'
                      : caveat.severity === 'medium'
                        ? 'secondary'
                        : 'outline'
                  }
                  className="text-xs mt-0.5"
                >
                  {caveat.severity}
                </Badge>
                <span className="text-gray-600">{caveat.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

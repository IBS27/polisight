'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

type ElementType = 'claim' | 'assumption' | 'prediction' | 'value';

interface ArgumentElementCardProps {
  id: string;
  type: ElementType;
  content: string;
  confidence: number;
  isSelected: boolean;
  isHighlighted: boolean;
  onClick: (id: string) => void;
  // Type-specific properties
  claimType?: string;
  isVerifiable?: boolean;
  isExplicit?: boolean;
  criticality?: string;
  timeframe?: string;
  category?: string;
}

// ============================================
// Style Maps
// ============================================

const typeColors = {
  claim: 'border-l-blue-500 bg-blue-50',
  assumption: 'border-l-amber-500 bg-amber-50',
  prediction: 'border-l-purple-500 bg-purple-50',
  value: 'border-l-green-500 bg-green-50',
};

const selectedColors = {
  claim: 'border-l-blue-600 bg-blue-100 ring-2 ring-blue-300',
  assumption: 'border-l-amber-600 bg-amber-100 ring-2 ring-amber-300',
  prediction: 'border-l-purple-600 bg-purple-100 ring-2 ring-purple-300',
  value: 'border-l-green-600 bg-green-100 ring-2 ring-green-300',
};

const highlightColors = {
  claim: 'border-l-blue-500 bg-blue-75',
  assumption: 'border-l-amber-500 bg-amber-75',
  prediction: 'border-l-purple-500 bg-purple-75',
  value: 'border-l-green-500 bg-green-75',
};

// ============================================
// Component
// ============================================

export function ArgumentElementCard({
  id,
  type,
  content,
  confidence,
  isSelected,
  isHighlighted,
  onClick,
  claimType,
  isVerifiable,
  isExplicit,
  criticality,
  timeframe,
  category,
}: ArgumentElementCardProps) {
  const cardClasses = cn(
    'border-l-4 cursor-pointer transition-all duration-150',
    isSelected
      ? selectedColors[type]
      : isHighlighted
        ? highlightColors[type]
        : typeColors[type],
    'hover:shadow-md'
  );

  const confidencePercent = Math.round(confidence * 100);
  const confidenceColor =
    confidencePercent >= 80
      ? 'text-green-600'
      : confidencePercent >= 60
        ? 'text-yellow-600'
        : 'text-red-600';

  return (
    <Card className={cardClasses} onClick={() => onClick(id)}>
      <CardContent className="p-3">
        {/* Content */}
        <p className="text-sm text-gray-800 mb-2">{content}</p>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5">
          {/* Confidence badge */}
          <Badge variant="outline" className={cn('text-xs', confidenceColor)}>
            {confidencePercent}% conf
          </Badge>

          {/* Type-specific badges */}
          {type === 'claim' && claimType && (
            <Badge variant="secondary" className="text-xs">
              {claimType}
            </Badge>
          )}
          {type === 'claim' && isVerifiable !== undefined && (
            <Badge
              variant={isVerifiable ? 'default' : 'outline'}
              className="text-xs"
            >
              {isVerifiable ? 'Verifiable' : 'Opinion'}
            </Badge>
          )}

          {type === 'assumption' && (
            <>
              <Badge variant="secondary" className="text-xs">
                {isExplicit ? 'Explicit' : 'Implicit'}
              </Badge>
              {criticality && (
                <Badge
                  variant={
                    criticality === 'critical' || criticality === 'high'
                      ? 'destructive'
                      : 'outline'
                  }
                  className="text-xs"
                >
                  {criticality}
                </Badge>
              )}
            </>
          )}

          {type === 'prediction' && timeframe && (
            <Badge variant="secondary" className="text-xs">
              {timeframe}
            </Badge>
          )}

          {type === 'value' && category && (
            <Badge variant="secondary" className="text-xs capitalize">
              {category}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

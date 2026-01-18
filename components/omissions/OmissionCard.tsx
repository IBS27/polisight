'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, FileQuestion, Users, DollarSign, Scale, Clock, History, Lightbulb } from 'lucide-react';

// ============================================
// Types
// ============================================

type OmissionType =
  | 'data_source'
  | 'timeframe'
  | 'stakeholder'
  | 'cost'
  | 'counterargument'
  | 'implementation'
  | 'historical_context'
  | 'alternative';

type DetectionMethod = 'deterministic' | 'llm_detected' | 'pattern_match';

interface OmissionCardProps {
  id: string;
  type: OmissionType;
  method: DetectionMethod;
  description: string;
  whyItMatters?: string;
  relatedSentences?: Array<{ sentenceIndex: number }>;
  onSentenceClick?: (index: number) => void;
}

// ============================================
// Icon Map
// ============================================

const typeIcons: Record<OmissionType, typeof AlertTriangle> = {
  data_source: FileQuestion,
  timeframe: Clock,
  stakeholder: Users,
  cost: DollarSign,
  counterargument: Scale,
  implementation: Lightbulb,
  historical_context: History,
  alternative: Lightbulb,
};

const typeLabels: Record<OmissionType, string> = {
  data_source: 'Missing Sources',
  timeframe: 'Missing Timeframe',
  stakeholder: 'Limited Stakeholders',
  cost: 'Missing Cost Info',
  counterargument: 'One-Sided View',
  implementation: 'No Implementation Details',
  historical_context: 'Missing Historical Context',
  alternative: 'No Alternatives Discussed',
};

const methodLabels: Record<DetectionMethod, string> = {
  deterministic: 'Auto-detected',
  llm_detected: 'AI-detected',
  pattern_match: 'Pattern match',
};

// ============================================
// Component
// ============================================

export function OmissionCard({
  id,
  type,
  method,
  description,
  whyItMatters,
  relatedSentences,
  onSentenceClick,
}: OmissionCardProps) {
  const Icon = typeIcons[type] || AlertTriangle;

  return (
    <Card size="sm" className="border-l-4 border-l-orange-400 bg-orange-50/50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-orange-600" />
            <CardTitle className="text-orange-900">
              {typeLabels[type]}
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-xs text-orange-600">
            {methodLabels[method]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-700">{description}</p>

        {whyItMatters && (
          <div className="mt-2 p-2 bg-orange-100/50 rounded text-xs text-orange-800">
            <span className="font-medium">Why this matters: </span>
            {whyItMatters}
          </div>
        )}

        {relatedSentences && relatedSentences.length > 0 && onSentenceClick && (
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="text-xs text-gray-500">Related sentences:</span>
            {relatedSentences.map((s) => (
              <button
                key={s.sentenceIndex}
                onClick={() => onSentenceClick(s.sentenceIndex)}
                className="text-xs text-orange-600 hover:text-orange-800 hover:underline"
              >
                #{s.sentenceIndex + 1}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

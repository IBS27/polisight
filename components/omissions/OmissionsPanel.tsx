'use client';

import { OmissionCard } from './OmissionCard';
import { AlertTriangle } from 'lucide-react';

// ============================================
// Types
// ============================================

interface Omission {
  id: string;
  type: 'data_source' | 'timeframe' | 'stakeholder' | 'cost' | 'counterargument' | 'implementation' | 'historical_context' | 'alternative';
  method: 'deterministic' | 'llm_detected' | 'pattern_match';
  description: string;
  whyItMatters?: string;
  relatedSentences?: Array<{ sentenceIndex: number }>;
}

interface OmissionsPanelProps {
  omissions: Omission[];
  onSentenceClick?: (index: number) => void;
}

// ============================================
// Component
// ============================================

export function OmissionsPanel({ omissions, onSentenceClick }: OmissionsPanelProps) {
  if (omissions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No omissions detected</p>
        <p className="text-xs mt-1">
          Run omission detection to identify missing information
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">
          Potential Omissions ({omissions.length})
        </h3>
      </div>

      {omissions.map((omission) => (
        <OmissionCard
          key={omission.id}
          id={omission.id}
          type={omission.type}
          method={omission.method}
          description={omission.description}
          whyItMatters={omission.whyItMatters}
          relatedSentences={omission.relatedSentences}
          onSentenceClick={onSentenceClick}
        />
      ))}

      <p className="text-xs text-gray-500 mt-4">
        Omissions are areas where the article may lack important information.
        This is not necessarily a criticism—some omissions may be intentional or
        appropriate for the article&apos;s scope.
      </p>
    </div>
  );
}

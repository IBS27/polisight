'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, User } from 'lucide-react';

// ============================================
// Types
// ============================================

interface MissingInput {
  field: string;
  fieldLabel: string;
  reason: string;
  impact: string;
  isRequired: boolean;
}

interface MissingInputsPromptProps {
  missingInputs: MissingInput[];
  reason: string;
  profileId?: string;
}

// ============================================
// Component
// ============================================

export function MissingInputsPrompt({
  missingInputs,
  reason,
  profileId,
}: MissingInputsPromptProps) {
  const requiredInputs = missingInputs.filter(i => i.isRequired);
  const optionalInputs = missingInputs.filter(i => !i.isRequired);

  return (
    <Card className="border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600" />
          <CardTitle className="text-sm text-yellow-800">
            More Information Needed
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-yellow-700">{reason}</p>

        {requiredInputs.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-yellow-800 mb-2">
              Required Information
            </h4>
            <ul className="space-y-2">
              {requiredInputs.map((input) => (
                <li
                  key={input.field}
                  className="bg-white rounded p-2 border border-yellow-200"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {input.fieldLabel}
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {input.reason}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {optionalInputs.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-yellow-800 mb-2">
              Optional (For Better Estimates)
            </h4>
            <ul className="space-y-1 text-xs text-gray-600">
              {optionalInputs.map((input) => (
                <li key={input.field}>• {input.fieldLabel}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-2">
          <Link href={profileId ? `/profile?id=${profileId}` : '/profile'}>
            <Button className="w-full" size="sm">
              <User className="w-4 h-4 mr-2" />
              Complete Your Profile
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

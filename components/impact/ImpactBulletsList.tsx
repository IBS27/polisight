'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, TrendingUp, TrendingDown, Minus, User } from 'lucide-react';
import Link from 'next/link';
import type { ImpactBullet } from '@/lib/schemas/impact-bullets';

// ============================================
// Types
// ============================================

export interface ImpactBulletsData {
  bullets: ImpactBullet[];
  summary: string;
}

interface ImpactBulletsListProps {
  data: ImpactBulletsData | null;
  isLoading?: boolean;
  hasProfile: boolean;
  profileId?: string;
  onCalculate?: () => void;
}

// ============================================
// Helper Components
// ============================================

function SentimentIcon({ sentiment }: { sentiment: ImpactBullet['sentiment'] }) {
  switch (sentiment) {
    case 'positive':
      return <TrendingUp className="w-5 h-5 text-green-500 flex-shrink-0" />;
    case 'negative':
      return <TrendingDown className="w-5 h-5 text-red-500 flex-shrink-0" />;
    case 'neutral':
      return <Minus className="w-5 h-5 text-gray-400 flex-shrink-0" />;
  }
}

// ============================================
// Main Component
// ============================================

export function ImpactBulletsList({
  data,
  isLoading,
  hasProfile,
  profileId,
  onCalculate,
}: ImpactBulletsListProps) {
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
            <CardTitle className="text-lg">Analyzing Your Impact...</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-6 bg-gray-200 rounded w-full" />
            <div className="h-6 bg-gray-200 rounded w-5/6" />
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
            See how this policy could affect you based on your profile.
          </p>
          <Button onClick={onCalculate} disabled={!onCalculate}>
            <Calculator className="w-4 h-4 mr-2" />
            Analyze My Impact
          </Button>
        </CardContent>
      </Card>
    );
  }

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
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm font-medium text-gray-700 bg-gray-50 p-3 rounded-lg">
          {data.summary}
        </p>

        {/* Bullet Points */}
        <ul className="space-y-3">
          {data.bullets.map((bullet, index) => (
            <li key={index} className="flex items-start gap-3">
              <SentimentIcon sentiment={bullet.sentiment} />
              <span className="text-sm text-gray-800">{bullet.text}</span>
            </li>
          ))}
        </ul>

        {data.bullets.length === 0 && (
          <p className="text-center text-gray-500 py-4">
            No specific impacts identified for your profile.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

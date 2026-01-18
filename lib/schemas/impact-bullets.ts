import { z } from 'zod';

// ============================================
// Simple Impact Bullet Schema
// ============================================

export const ImpactBulletSchema = z.object({
  text: z.string().min(1),
  sentiment: z.enum(['positive', 'negative', 'neutral']),
});

export type ImpactBullet = z.infer<typeof ImpactBulletSchema>;

// ============================================
// LLM Response Schema
// ============================================

export const ImpactBulletsLLMResponseSchema = z.object({
  bullets: z.array(ImpactBulletSchema),
  summary: z.string(),
});

export type ImpactBulletsLLMResponse = z.infer<typeof ImpactBulletsLLMResponseSchema>;

// ============================================
// Full Response Schema (for API/UI)
// ============================================

export const ImpactBulletsResponseSchema = z.object({
  bullets: z.array(ImpactBulletSchema),
  summary: z.string(),
});

export type ImpactBulletsResponse = z.infer<typeof ImpactBulletsResponseSchema>;

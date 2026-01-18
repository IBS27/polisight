# Polisight - Claude Code Guidelines

## Project Overview

Polisight is a political literacy web app that analyzes policy articles to help users understand how policies affect them personally. It extracts articles, analyzes arguments, identifies omissions, and calculates personalized impact scores.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (Postgres)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Validation**: Zod v4
- **LLM Gateway**: OpenRouter (unified access to multiple models)

## Architecture

### LLM Services (all via OpenRouter)

| Service | File | Model | Purpose |
|---------|------|-------|---------|
| Article Extraction | `lib/services/article-extractor.ts` | `x-ai/grok-4.1-fast:online` | Extract article content from URLs |
| Argument Analysis | `lib/services/gemini.ts` | `google/gemini-2.5-flash-preview-05-20` | Analyze claims, evidence, rhetoric |
| Context/Research | `lib/services/perplexity.ts` | `perplexity/sonar-pro` | Real-time fact-checking, citations |

### Key Directories

```
app/
├── api/articles/          # Article ingestion & analysis endpoints
├── articles/[id]/         # Article detail page
└── profile/               # User profile management

lib/
├── schemas/               # Zod schemas (core.ts, analysis.ts, etc.)
├── services/              # LLM and external API integrations
└── supabase/              # Supabase client utilities

components/
├── analysis/              # Argument analysis UI
├── impact/                # Impact score visualization
├── omissions/             # Missing context display
└── provenance/            # Data lineage tracking
```

## Critical Configuration Notes

### OpenRouter Model Configuration

**IMPORTANT: Grok requires `:online` suffix for live web access**

```typescript
// WRONG - Returns cached/training data, NOT live content
const model = 'x-ai/grok-4.1-fast';

// CORRECT - Enables live URL fetching
const model = 'x-ai/grok-4.1-fast:online';
```

Without the `:online` suffix, Grok will return content from its training data instead of actually fetching the URL. This causes articles to have wrong/outdated content.

### Next.js API Route Timeouts

Long-running operations (like article extraction) need explicit timeout configuration:

```typescript
// app/api/articles/route.ts
export const maxDuration = 60; // seconds
```

### Fetch Timeout Handling

Always use AbortController for external API calls:

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 60000);

try {
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
  // ...
} catch (error) {
  clearTimeout(timeoutId);
  if (error.name === 'AbortError') {
    // Handle timeout
  }
}
```

## Common Mistakes to Avoid

### 1. TypeScript: Unknown Types in JSX

**WRONG** - `&&` short-circuit with unknown types:
```typescript
{item.field && <span>{item.field}</span>}
// Error: 'item.field' is of type 'unknown'
```

**CORRECT** - Use ternary with type check:
```typescript
{item.field ? <span>{String(item.field)}</span> : null}
```

### 2. useSearchParams() Requires Suspense

```typescript
// WRONG - Will error
export default function Page() {
  const searchParams = useSearchParams(); // Error!
}

// CORRECT - Wrap in Suspense
function PageContent() {
  const searchParams = useSearchParams();
  return <div>...</div>;
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <PageContent />
    </Suspense>
  );
}
```

### 3. Database Enum Constraints

When adding new values to the `api_provider` enum:
1. Update Zod schema in `lib/schemas/core.ts`
2. Update database constraint via migration

```sql
ALTER TABLE provenance_logs DROP CONSTRAINT provenance_logs_api_provider_check;
ALTER TABLE provenance_logs ADD CONSTRAINT provenance_logs_api_provider_check
  CHECK (api_provider IN ('openrouter', 'perplexity', 'grok'));
```

### 4. Error Handling in Article Extraction

Use the `ArticleExtractorError` class from `lib/services/article-extractor.ts`:

```typescript
import { ArticleExtractorError } from '@/lib/services/article-extractor';

try {
  const article = await extractArticle(url);
} catch (error) {
  if (error instanceof ArticleExtractorError) {
    // Handle extraction-specific errors (timeout, invalid URL, etc.)
  }
}
```

### 5. OpenRouter Headers

Always include required headers for OpenRouter:

```typescript
headers: {
  'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
  'Content-Type': 'application/json',
  'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'X-Title': 'Polisight',
}
```

## Environment Variables

```env
# Required
OPENROUTER_API_KEY=         # For all LLM calls (Grok, Gemini, Perplexity)
NEXT_PUBLIC_SUPABASE_URL=   # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Supabase anon key

# Optional
NEXT_PUBLIC_APP_URL=        # App URL for OpenRouter referer header
```

## Database Schema

Key tables:
- `articles` - Ingested articles with extracted content
- `sentence_spans` - Individual sentences for granular analysis
- `arguments` - Extracted claims and evidence
- `impact_scores` - Personalized impact calculations
- `provenance_logs` - Full audit trail of all operations

## Provenance Tracking

All operations should log to `provenance_logs` for transparency:

```typescript
const logger = createTimedLogger('article', articleId, articleId);
await logger.log('created', 'Article ingested from URL', {
  inputData: { url },
  outputData: { title, sentenceCount },
  apiProvider: 'grok',
});
```

## Running the Project

```bash
pnpm install
pnpm dev
```

Ensure Supabase is configured and migrations are applied via MCP or CLI.

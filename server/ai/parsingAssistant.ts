import Anthropic from '@anthropic-ai/sdk';

/**
 * AI-Assisted Parsing for malformed or ambiguous awesome list resources
 * Uses Claude Haiku 4.5 for cost-effective edge case handling
 */

interface ParsedResourceAI {
  title: string;
  url: string;
  description: string;
  category?: string;
  subcategory?: string;
  skip?: boolean;
}

interface ParsingContext {
  previousCategory?: string;
  previousSubcategory?: string;
  lineNumber?: number;
}

/**
 * Use Claude AI to parse ambiguous or malformed resource lines
 * @param line - The markdown line that failed standard parsing
 * @param context - Context from surrounding lines (current category/subcategory)
 * @returns Parsed resource or null if unparseable
 */
export async function parseAmbiguousResource(
  line: string,
  context: ParsingContext = {}
): Promise<ParsedResourceAI | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn('ANTHROPIC_API_KEY not set, skipping AI parsing');
    return null;
  }

  const client = new Anthropic({
    apiKey: apiKey,
  });

  const prompt = `Parse this markdown line from an awesome list into structured data.

Line: ${line}

Context:
- Previous category: ${context.previousCategory || 'Unknown'}
- Previous subcategory: ${context.previousSubcategory || 'Unknown'}
- Line number: ${context.lineNumber || 'Unknown'}

Task: Extract the resource information. An awesome list resource typically has:
1. Title (the link text in [brackets])
2. URL (the link target in parentheses)
3. Description (text after the link, usually after a dash or colon)

Handle these edge cases:
- Bold titles: **[Title](url)** - Remove markdown formatting
- Missing descriptions: [Title](url) with no description text
- Malformed URLs: Fix protocol if missing (add https://)
- Badges in descriptions: [![...](...)(...)] - These can be kept or stripped
- Multiple separators: -, –, :, or none

Respond with JSON only:
{
  "title": "...",
  "url": "...",
  "description": "...",
  "category": "..." (only if this line appears to be a category header),
  "subcategory": "..." (only if this line appears to be a subcategory header),
  "skip": true (if the line is not a valid resource or header - e.g., navigation links, footnotes)
}

If you're uncertain or the line is clearly not a resource, respond with: {"skip": true}

IMPORTANT: Respond with ONLY the JSON object, no explanations or markdown formatting.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Clean response (remove markdown code blocks if present)
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    const parsed = JSON.parse(cleanedText);

    // Log successful AI parsing
    console.log(`✅ AI parsed: "${parsed.title || 'skipped'}" (line: ${context.lineNumber})`);

    return parsed;
  } catch (error: any) {
    console.error(`❌ AI parsing failed for line ${context.lineNumber}:`, error.message);
    return null;
  }
}

/**
 * Batch parse multiple ambiguous lines (more cost-efficient)
 * @param lines - Array of lines with their context
 * @returns Array of parsed resources
 */
export async function parseBatchAmbiguous(
  lines: Array<{ line: string; context: ParsingContext }>
): Promise<Array<ParsedResourceAI | null>> {
  // For now, parse sequentially (batch API calls could be added for efficiency)
  const results: Array<ParsedResourceAI | null> = [];

  for (const { line, context } of lines) {
    const result = await parseAmbiguousResource(line, context);
    results.push(result);

    // Rate limiting: max 5 requests per second
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return results;
}

/**
 * Estimate cost of AI parsing
 * @param lineCount - Number of lines to parse
 * @returns Estimated cost in USD
 */
export function estimateAICost(lineCount: number): number {
  // Claude Haiku 4.5 pricing (approximate):
  // Input: $0.25 per million tokens (~200 tokens per line)
  // Output: $1.25 per million tokens (~100 tokens per response)
  // Total per line: ~300 tokens = $0.0004 per line

  const costPerLine = 0.0004;
  return lineCount * costPerLine;
}

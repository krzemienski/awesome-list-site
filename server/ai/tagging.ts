import { z } from 'zod';
import {
  createStructuredMessage,
  isAnthropicConfigured,
  resolveFlowModel,
  StructuredOutputError,
} from './anthropicConfig';

interface AITagSuggestion {
  tags: string[];
  category: string;
  subcategory?: string;
  subSubcategory?: string;
  confidence: number;
}

const TagSuggestionSchema = z.object({
  tags: z.array(z.string()).describe('3-5 relevant tags: video technologies, codecs, streaming, processing features'),
  category: z.string().describe('Primary video/multimedia category, e.g. "Video Processing", "Streaming", "Codecs", "Players", "Editing"'),
  subcategory: z.string().nullable().describe('Subcategory if applicable, else null'),
  subSubcategory: z.string().nullable().describe('More specific topic under the subcategory if applicable, else null'),
  confidence: z.number().describe('Confidence score 0-1'),
});

const TAGGING_SYSTEM_PROMPT =
  'You are an expert at categorizing and tagging video/multimedia software tools and applications. ' +
  'Focus on video processing, streaming, codecs, and multimedia technologies. ' +
  'Provide accurate, useful tags that help users discover video-related resources.';

/**
 * Generate AI-powered tags for a resource using Claude (structured output).
 * Falls back to rule-based tagging — loudly — when AI is unavailable or fails.
 */
export async function generateResourceTags(
  title: string,
  description: string,
  url: string
): Promise<AITagSuggestion> {
  if (!isAnthropicConfigured()) {
    console.warn('AI tagging skipped: Anthropic is not configured; using rule-based tags');
    return generateFallbackTags(title, description, url);
  }

  const prompt = `Analyze this video/multimedia software resource and suggest relevant tags and categorization:

Title: ${title}
Description: ${description}
URL: ${url}`;

  try {
    const { data } = await createStructuredMessage(TagSuggestionSchema, {
      model: resolveFlowModel('tagging'),
      system: TAGGING_SYSTEM_PROMPT,
      user: prompt,
      maxTokens: 600,
      timeoutMs: 30_000,
    });

    return {
      tags: data.tags.slice(0, 8).map((t) => t.trim()).filter(Boolean),
      category: data.category || 'Video Tools',
      subcategory: data.subcategory ?? undefined,
      subSubcategory: data.subSubcategory ?? undefined,
      confidence: Math.max(0, Math.min(1, data.confidence)),
    };
  } catch (error: unknown) {
    const detail =
      error instanceof StructuredOutputError
        ? `${error.reason}: ${error.message}`
        : error instanceof Error
          ? error.message
          : 'Unknown error';
    console.warn(`AI tagging failed (${detail}); using rule-based tags`);
    return generateFallbackTags(title, description, url);
  }
}

/**
 * Fallback rule-based tagging when AI is not available
 */
function generateFallbackTags(title: string, description: string, url: string): AITagSuggestion {
  const text = `${title} ${description}`.toLowerCase();
  const tags: string[] = [];
  
  // Video technology detection
  if (text.includes('ffmpeg')) tags.push('ffmpeg');
  if (text.includes('h264') || text.includes('h.264')) tags.push('h264');
  if (text.includes('h265') || text.includes('h.265') || text.includes('hevc')) tags.push('h265');
  if (text.includes('vp9') || text.includes('vp8')) tags.push('vp9');
  if (text.includes('av1')) tags.push('av1');
  if (text.includes('webrtc')) tags.push('webrtc');
  if (text.includes('hls')) tags.push('hls');
  if (text.includes('dash')) tags.push('dash');
  if (text.includes('rtmp')) tags.push('rtmp');
  
  // Video use case detection
  if (text.includes('stream') || text.includes('live')) tags.push('streaming');
  if (text.includes('transcode') || text.includes('convert')) tags.push('transcoding');
  if (text.includes('edit') || text.includes('cutting')) tags.push('editing');
  if (text.includes('player') || text.includes('playback')) tags.push('player');
  if (text.includes('record') || text.includes('capture')) tags.push('recording');
  if (text.includes('compress') || text.includes('encoding')) tags.push('compression');
  
  // Category detection
  let category = 'Video Tools';
  if (text.includes('stream') || text.includes('live')) category = 'Streaming';
  else if (text.includes('edit') || text.includes('cutting')) category = 'Video Editing';
  else if (text.includes('player') || text.includes('playback')) category = 'Video Players';
  else if (text.includes('transcode') || text.includes('convert')) category = 'Video Processing';
  else if (text.includes('codec') || text.includes('h264') || text.includes('h265')) category = 'Codecs';
  
  return {
    tags: tags.slice(0, 5), // Limit to 5 tags
    category,
    confidence: 0.6 // Lower confidence for rule-based
  };
}
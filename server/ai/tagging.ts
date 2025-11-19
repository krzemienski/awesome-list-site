import Anthropic from '@anthropic-ai/sdk';

// Use Anthropic for AI-powered features
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface AITagSuggestion {
  tags: string[];
  category: string;
  subcategory?: string;
  confidence: number;
}

/**
 * Generate AI-powered tags for a resource using Anthropic Claude
 */
export async function generateResourceTags(
  title: string,
  description: string,
  url: string
): Promise<AITagSuggestion> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured');
    }

    const prompt = `Analyze this video/multimedia software resource and suggest relevant tags and categorization:

Title: ${title}
Description: ${description}
URL: ${url}

Please provide:
1. 3-5 relevant tags (video technologies, codecs, streaming, processing features)
2. A primary category focusing on video/multimedia (e.g., "Video Processing", "Streaming", "Codecs", "Players", "Editing")
3. A subcategory if applicable
4. Confidence score (0-1)

Respond with JSON in this format:
{
  "tags": ["tag1", "tag2", "tag3"],
  "category": "category name",
  "subcategory": "subcategory name or null",
  "confidence": 0.85
}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022', // Claude 3.5 Sonnet (October 2024 release - latest)
      system: "You are an expert at categorizing and tagging video/multimedia software tools and applications. Focus on video processing, streaming, codecs, and multimedia technologies. Provide accurate, useful tags that help users discover video-related resources.",
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300
    });

    const result = JSON.parse((response.content[0] as any).text || '{}');
    
    return {
      tags: result.tags || [],
      category: result.category || 'Video Tools',
      subcategory: result.subcategory,
      confidence: Math.max(0, Math.min(1, result.confidence || 0.5))
    };

  } catch (error: any) {
    console.warn('AI tagging failed:', error.message);
    
    // Fallback to simple rule-based tagging
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
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
 * Generate AI-powered tags for a resource using OpenAI
 */
export async function generateResourceTags(
  title: string,
  description: string,
  url: string
): Promise<AITagSuggestion> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `Analyze this software resource and suggest relevant tags and categorization:

Title: ${title}
Description: ${description}
URL: ${url}

Please provide:
1. 3-5 relevant tags (technologies, use cases, features)
2. A primary category (e.g., "Analytics", "Communication", "Development Tools")
3. A subcategory if applicable
4. Confidence score (0-1)

Respond with JSON in this format:
{
  "tags": ["tag1", "tag2", "tag3"],
  "category": "category name",
  "subcategory": "subcategory name or null",
  "confidence": 0.85
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert at categorizing and tagging software tools and applications. Provide accurate, useful tags that help users discover resources."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 300
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      tags: result.tags || [],
      category: result.category || 'Miscellaneous',
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
  
  // Technology detection
  if (text.includes('docker')) tags.push('docker');
  if (text.includes('kubernetes') || text.includes('k8s')) tags.push('kubernetes');
  if (text.includes('javascript') || text.includes('js')) tags.push('javascript');
  if (text.includes('python')) tags.push('python');
  if (text.includes('golang') || text.includes('go ')) tags.push('go');
  if (text.includes('react')) tags.push('react');
  if (text.includes('vue')) tags.push('vue');
  
  // Use case detection
  if (text.includes('monitor') || text.includes('observ')) tags.push('monitoring');
  if (text.includes('analytics') || text.includes('metrics')) tags.push('analytics');
  if (text.includes('backup')) tags.push('backup');
  if (text.includes('security') || text.includes('auth')) tags.push('security');
  if (text.includes('database') || text.includes('db')) tags.push('database');
  
  // Category detection
  let category = 'Miscellaneous';
  if (text.includes('monitor') || text.includes('observ')) category = 'Monitoring';
  else if (text.includes('analytics')) category = 'Analytics';
  else if (text.includes('communication') || text.includes('chat')) category = 'Communication';
  else if (text.includes('development') || text.includes('code')) category = 'Development Tools';
  
  return {
    tags: tags.slice(0, 5), // Limit to 5 tags
    category,
    confidence: 0.6 // Lower confidence for rule-based
  };
}
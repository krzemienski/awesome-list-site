# AI-Powered Features Guide

The dashboard includes AI-powered enhancements for automatic tagging, categorization, and content analysis using Anthropic's Claude models.

## Overview

AI features automatically enhance your awesome list resources with:
- **Smart Tagging**: Generates relevant tags based on content analysis
- **Auto Categorization**: Intelligently categorizes resources
- **Enhanced Descriptions**: Improves resource descriptions for better searchability
- **Quality Scoring**: Provides confidence ratings for AI suggestions

## Setup and Configuration

### 1. Enable AI Features

Edit `awesome-list.config.yaml`:

```yaml
features:
  ai_tags: true           # Enable AI-powered tagging
  ai_descriptions: true   # Enable description enhancement
  ai_categories: true     # Enable smart categorization
```

### 2. Configure Anthropic API Key

#### Option A: GitHub Repository Secrets (Recommended)
1. Go to your repository Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Name: `ANTHROPIC_API_KEY`
4. Value: Your Anthropic API key (starts with `sk-ant-`)

#### Option B: Local Development
```bash
export ANTHROPIC_API_KEY="sk-ant-your-api-key-here"
npm run dev
```

### 3. Get Your Anthropic API Key

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

## AI Model Configuration

### Default Model Settings

The system uses Claude Sonnet by default:

```typescript
// Current configuration in server/ai/tagging.ts
model: 'claude-3-5-sonnet-20241022'  // Latest Claude model
max_tokens: 300                       // Optimized for tagging tasks
```

### Available Models and Pricing

#### Claude 3.5 Sonnet (Recommended)
- **Model**: `claude-3-5-sonnet-20241022`
- **Cost**: $3 per million input tokens, $15 per million output tokens
- **Best for**: General purpose tagging and categorization
- **Speed**: Fast responses (1-3 seconds)

#### Claude 3 Haiku (Budget Option)
- **Model**: `claude-3-haiku-20240307`
- **Cost**: $0.25 per million input tokens, $1.25 per million output tokens
- **Best for**: Simple tagging tasks
- **Speed**: Very fast (under 1 second)

#### Claude 3 Opus (Premium Option)
- **Model**: `claude-3-opus-20240229`
- **Cost**: $15 per million input tokens, $75 per million output tokens
- **Best for**: Complex analysis and high-quality descriptions
- **Speed**: Slower (3-5 seconds)

### Cost Estimation

For a typical awesome list with 1,000 resources:

#### Claude 3.5 Sonnet (Default)
- **Input**: ~500 tokens per resource = 500,000 tokens
- **Output**: ~100 tokens per resource = 100,000 tokens
- **Total Cost**: (500k × $3/M) + (100k × $15/M) = **$3.00**

#### Claude 3 Haiku (Budget)
- **Input**: 500,000 tokens
- **Output**: 100,000 tokens
- **Total Cost**: (500k × $0.25/M) + (100k × $1.25/M) = **$0.25**

#### Claude 3 Opus (Premium)
- **Input**: 500,000 tokens
- **Output**: 100,000 tokens
- **Total Cost**: (500k × $15/M) + (100k × $75/M) = **$15.00**

### Change AI Model

To use a different model, modify `server/ai/tagging.ts`:

```typescript
const response = await anthropic.messages.create({
  model: 'claude-3-haiku-20240307',  // Change to desired model
  // ... rest of configuration
});
```

## AI Features in Detail

### 1. Smart Tagging

The AI analyzes each resource and generates relevant tags:

```typescript
// Example AI tag generation
{
  "tags": ["ffmpeg", "video-processing", "transcoding", "open-source"],
  "category": "Video Processing",
  "subcategory": "Transcoding Tools",
  "confidence": 0.92
}
```

**What gets analyzed:**
- Resource title and description
- URL patterns and domain information
- Repository topics and README content
- Existing categories in the awesome list

### 2. Auto Categorization

AI intelligently categorizes resources based on:
- Functionality and use case
- Technology stack
- Target audience
- Implementation complexity

**Example categories for different awesome lists:**
- **Awesome Python**: Web Frameworks, Data Science, Machine Learning, DevOps
- **Awesome JavaScript**: Frontend Frameworks, Node.js Libraries, Build Tools
- **Awesome Video**: Codecs, Streaming, Processing, Players, Editing Tools

### 3. Enhanced Descriptions

AI improves resource descriptions by:
- Standardizing format and length
- Adding technical context
- Highlighting key features
- Improving searchability

### 4. Quality Scoring

Each AI suggestion includes a confidence score:
- **0.9-1.0**: High confidence, reliable suggestions
- **0.7-0.8**: Good confidence, mostly accurate
- **0.5-0.6**: Medium confidence, review recommended
- **Below 0.5**: Low confidence, fallback to rule-based system

## Fallback System

When AI is unavailable or API key is missing, the system automatically falls back to rule-based tagging:

```typescript
// Fallback tags based on keyword detection
if (text.includes('react')) tags.push('react');
if (text.includes('python')) tags.push('python');
if (text.includes('api')) tags.push('api');
```

**Fallback features:**
- Keyword-based tagging
- URL pattern analysis
- Technology detection
- Basic categorization rules

## Performance Optimization

### Batch Processing
AI requests are batched to optimize API usage:
- Processes 10 resources per batch
- Implements exponential backoff for rate limits
- Caches results to avoid duplicate requests

### Caching Strategy
```typescript
// AI results are cached locally
const cacheKey = `ai_tags_${resource.url}_${resource.title}`;
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

### Rate Limiting
- Maximum 1000 requests per hour
- Automatic retry with exponential backoff
- Graceful degradation to fallback system

## Usage Analytics

Track AI feature usage in your analytics:

```typescript
// Tracked events
- ai_tag_generation_success
- ai_tag_generation_failure
- ai_fallback_used
- ai_confidence_scores
```

## Best Practices

### 1. API Key Security
- Never commit API keys to version control
- Use repository secrets for GitHub Actions
- Rotate keys periodically
- Monitor usage in Anthropic console

### 2. Cost Management
- Start with Claude Haiku for budget-conscious deployments
- Monitor token usage in Anthropic console
- Set up billing alerts
- Use caching to avoid duplicate requests

### 3. Quality Control
- Review AI suggestions with low confidence scores
- Maintain manual overrides for critical resources
- Test with smaller lists before full deployment
- Monitor user feedback on tag relevance

### 4. Performance Monitoring
- Track AI response times
- Monitor fallback usage rates
- Analyze confidence score distributions
- Set up alerts for API failures

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   ```bash
   # Verify key format
   echo $ANTHROPIC_API_KEY | grep "sk-ant-"
   
   # Test API access
   curl -H "x-api-key: $ANTHROPIC_API_KEY" \
        -H "anthropic-version: 2023-06-01" \
        https://api.anthropic.com/v1/messages
   ```

2. **High API Costs**
   - Switch to Claude Haiku model
   - Reduce max_tokens parameter
   - Implement more aggressive caching
   - Process only new/updated resources

3. **Poor Tag Quality**
   - Increase confidence threshold
   - Customize prompts for your domain
   - Add manual tag overrides
   - Use domain-specific examples

4. **Rate Limiting**
   - Implement exponential backoff
   - Reduce batch sizes
   - Add delays between requests
   - Monitor Anthropic console limits

### Debug Mode

Enable detailed logging:

```bash
export AI_DEBUG=true
npm run dev
```

This shows:
- AI request/response details
- Confidence scores
- Fallback trigger reasons
- Performance metrics

## Future Enhancements

Planned AI features:
- **Multi-language Support**: Tag generation in multiple languages
- **Custom Models**: Fine-tuned models for specific domains
- **Image Analysis**: AI analysis of repository screenshots
- **Trend Detection**: Identification of emerging technologies
- **Quality Scoring**: AI-based resource quality assessment

## Cost Monitoring

Set up monitoring to track AI usage:

1. **Anthropic Console**: Monitor token usage and costs
2. **GitHub Actions**: Track build costs with AI enabled
3. **Custom Analytics**: Log AI usage in your dashboard
4. **Billing Alerts**: Set up spending notifications

Example monthly costs for different list sizes:

| List Size | Claude Haiku | Claude Sonnet | Claude Opus |
|-----------|--------------|---------------|-------------|
| 100       | $0.025       | $0.30         | $1.50       |
| 500       | $0.125       | $1.50         | $7.50       |
| 1,000     | $0.25        | $3.00         | $15.00      |
| 5,000     | $1.25        | $15.00        | $75.00      |

*Costs are estimates based on typical resource content length*
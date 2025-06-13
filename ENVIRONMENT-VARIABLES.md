# Environment Variables Configuration

This document outlines all environment variables used by the Awesome List Dashboard and how to configure them for different deployment scenarios.

## Required Variables

### ANTHROPIC_API_KEY
**Purpose**: Enables AI-powered tagging and categorization features
**Format**: `sk-ant-api03-...` (starts with sk-ant-)
**Cost Impact**: See AI Features pricing below

**Setup:**
1. Create account at [console.anthropic.com](https://console.anthropic.com)
2. Generate API key in the API Keys section
3. Add to repository secrets or environment

**GitHub Repository Setup:**
```bash
# Go to: Settings > Secrets and variables > Actions
# Add new repository secret:
Name: ANTHROPIC_API_KEY
Value: sk-ant-your-actual-key-here
```

**Local Development:**
```bash
export ANTHROPIC_API_KEY="sk-ant-your-actual-key-here"
npm run dev
```

## Optional Variables

### VITE_GA_MEASUREMENT_ID
**Purpose**: Google Analytics 4 tracking
**Format**: `G-XXXXXXXXXX`
**Default**: G-383541848 (demo tracking ID)

```bash
# Repository secret for production
VITE_GA_MEASUREMENT_ID=G-YOUR-MEASUREMENT-ID

# Local development
export VITE_GA_MEASUREMENT_ID="G-YOUR-MEASUREMENT-ID"
```

### VITE_SITE_TITLE
**Purpose**: Overrides site title from config
**Default**: Uses awesome-list.config.yaml value

### VITE_SITE_DESCRIPTION  
**Purpose**: Overrides site description from config
**Default**: Uses awesome-list.config.yaml value

### VITE_SITE_URL
**Purpose**: Overrides site URL from config
**Default**: Uses awesome-list.config.yaml value

### VITE_DEFAULT_THEME
**Purpose**: Sets default theme (red, blue, green, purple)
**Default**: "red"

## Build-Time Variables

### NODE_ENV
**Purpose**: Controls build mode
**Values**: "development" | "production"
**Set automatically**: GitHub Actions sets to "production"

### VITE_STATIC_BUILD
**Purpose**: Enables static build optimizations
**Values**: "true" | "false"
**Set automatically**: GitHub Actions sets to "true"

### NODE_OPTIONS
**Purpose**: Controls Node.js memory allocation
**Default**: "--max-old-space-size=8192" (8GB)
**Used for**: Complex Vite builds with large dependencies

## AI Model Configuration

The AI features support different models with varying costs and capabilities:

### Cost Per 1,000 Resources

| Model | API Cost | Quality | Speed | Recommended For |
|-------|----------|---------|-------|-----------------|
| Claude 3 Haiku | $0.25 | Good | Fast | Budget deployments |
| Claude 3.5 Sonnet | $3.00 | Excellent | Medium | Production (default) |
| Claude 3 Opus | $15.00 | Premium | Slow | High-quality analysis |

### Model Selection

To change the AI model, modify `server/ai/tagging.ts`:

```typescript
// Budget option - Claude Haiku
model: 'claude-3-haiku-20240307'

// Default - Claude 3.5 Sonnet  
model: 'claude-3-5-sonnet-20241022'

// Premium - Claude Opus
model: 'claude-3-opus-20240229'
```

## Repository Secrets Setup

### GitHub Actions Deployment

Required secrets for automated deployment:

1. **ANTHROPIC_API_KEY** (Optional but recommended)
   - Enables AI features
   - Get from console.anthropic.com
   - Cost varies by model choice

2. **GA_MEASUREMENT_ID** (Optional)
   - Google Analytics tracking
   - Format: G-XXXXXXXXXX
   - Free with Google Analytics account

### Setting Up Secrets

1. Go to your repository on GitHub
2. Navigate to Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add each secret with exact name and value

## Environment Variable Priority

Variables are resolved in this order (highest to lowest priority):

1. Repository secrets (GitHub Actions)
2. Local environment variables  
3. .env files (local development only)
4. awesome-list.config.yaml defaults
5. Application defaults

## Local Development Setup

Create a `.env` file (not committed to git):

```bash
# .env (local development only)
ANTHROPIC_API_KEY=sk-ant-your-key-here
VITE_GA_MEASUREMENT_ID=G-YOUR-ID-HERE
VITE_DEFAULT_THEME=red
```

## Production Deployment Variables

GitHub Actions automatically sets these during deployment:

```bash
NODE_ENV=production
VITE_STATIC_BUILD=true
NODE_OPTIONS=--max-old-space-size=16384
VITE_GA_MEASUREMENT_ID=${secrets.GA_MEASUREMENT_ID}
VITE_SITE_TITLE="Your Dashboard Title"
VITE_SITE_DESCRIPTION="Your dashboard description"
VITE_SITE_URL="https://yourusername.github.io/your-repo"
VITE_DEFAULT_THEME=red
```

## AI Feature Cost Management

### Monthly Cost Estimates

For different list sizes and update frequencies:

**Small List (100 resources, monthly updates):**
- Haiku: $0.025/month
- Sonnet: $0.30/month  
- Opus: $1.50/month

**Medium List (1,000 resources, weekly updates):**
- Haiku: $1.00/month
- Sonnet: $12.00/month
- Opus: $60.00/month

**Large List (5,000 resources, daily updates):**
- Haiku: $37.50/month
- Sonnet: $450.00/month
- Opus: $2,250.00/month

### Cost Optimization

1. **Use Claude Haiku for budget deployments**
2. **Cache AI results** to avoid re-processing unchanged resources
3. **Process only new/updated resources** on incremental builds
4. **Set confidence thresholds** to fallback to rule-based tagging

### Monitoring Usage

Track your Anthropic usage:
1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Check Usage section for token consumption
3. Set up billing alerts for cost control
4. Monitor request patterns in dashboard analytics

## Troubleshooting

### API Key Issues

**Invalid API Key:**
```bash
# Test your key
curl -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     https://api.anthropic.com/v1/messages
```

**Key Not Found:**
- Verify secret name exactly matches: `ANTHROPIC_API_KEY`
- Check repository permissions
- Ensure key starts with `sk-ant-`

### Build Issues

**Environment variables not available:**
- VITE_ prefix required for client-side variables
- Check GitHub Actions logs for variable values
- Verify secrets are set in repository settings

**Memory issues during build:**
- Increase NODE_OPTIONS memory allocation
- Use --max-old-space-size=16384 or higher
- Monitor GitHub Actions runner memory usage

### AI Feature Debugging

Enable debug logging:
```bash
export AI_DEBUG=true
export ANTHROPIC_API_KEY=your-key
npm run dev
```

This shows:
- API request/response details
- Token usage per request
- Confidence scores
- Fallback trigger reasons

## Security Best Practices

1. **Never commit API keys to version control**
2. **Use repository secrets for production**
3. **Rotate API keys periodically**
4. **Monitor usage for unexpected spikes**
5. **Set up billing alerts in Anthropic console**
6. **Use least-privilege access patterns**

## Migration Guide

### From Other AI Providers

If migrating from OpenAI or other providers:

1. Update environment variable names
2. Modify model references in code
3. Adjust prompt formats for Claude
4. Update cost calculations
5. Test tag quality and adjust prompts

### Disabling AI Features

To deploy without AI features:

```yaml
# awesome-list.config.yaml
features:
  ai_tags: false
  ai_descriptions: false
  ai_categories: false
```

The system automatically falls back to rule-based tagging when AI is disabled.
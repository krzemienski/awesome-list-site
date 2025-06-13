# Example Configurations

Complete configuration examples for deploying different types of awesome lists with AI-enhanced features.

## Awesome Python Dashboard

Perfect for Python developers and data scientists:

```yaml
# awesome-list.config.yaml
site:
  title: "Awesome Python Dashboard"
  description: "A comprehensive collection of Python libraries, frameworks, and tools"
  url: "https://yourusername.github.io/awesome-python-dashboard"
  author: "Your Name"

source:
  url: "https://raw.githubusercontent.com/vinta/awesome-python/master/README.md"
  format: "markdown"
  refresh_interval: 3600

theme:
  default: "dark"
  primary_color: "#306998"  # Python blue
  custom_themes:
    - name: "Python"
      primary: "#306998"
      secondary: "#FFD43B"
      background: "#f8fafc"

analytics:
  google_analytics: "G-YOUR-MEASUREMENT-ID"

features:
  search: true
  categories: true
  ai_tags: true           # Cost: ~$3/month for 1000 resources
  ai_descriptions: true
  pagination: true
  items_per_page: 24
```

**Expected AI tags**: `web-framework`, `data-science`, `machine-learning`, `django`, `flask`, `pandas`, `numpy`

**Monthly AI cost**: $3 (Claude Sonnet) or $0.25 (Claude Haiku)

## Awesome JavaScript Dashboard

For frontend and Node.js developers:

```yaml
site:
  title: "Awesome JavaScript Dashboard"
  description: "Modern JavaScript libraries, frameworks, and development tools"
  url: "https://yourusername.github.io/awesome-js-dashboard"

source:
  url: "https://raw.githubusercontent.com/sorrycc/awesome-javascript/master/README.md"
  format: "markdown"

theme:
  primary_color: "#f7df1e"  # JavaScript yellow

features:
  ai_tags: true
  ai_categories: true
```

**Expected AI categories**: `Frontend Frameworks`, `Node.js Libraries`, `Build Tools`, `Testing`, `UI Components`

## Awesome Machine Learning Dashboard

For AI/ML researchers and practitioners:

```yaml
site:
  title: "Awesome Machine Learning Dashboard"
  description: "Curated machine learning frameworks, libraries, and resources"
  url: "https://yourusername.github.io/awesome-ml-dashboard"

source:
  url: "https://raw.githubusercontent.com/josephmisiti/awesome-machine-learning/master/README.md"
  format: "markdown"

theme:
  primary_color: "#ff6b6b"  # ML red
  
features:
  ai_tags: true
  ai_descriptions: true
  ai_categories: true
  items_per_page: 36      # More items for research browsing
```

**Expected AI tags**: `deep-learning`, `neural-networks`, `pytorch`, `tensorflow`, `computer-vision`, `nlp`

**Budget consideration**: ML lists are large (~2000 resources), consider Claude Haiku ($0.50/month) vs Sonnet ($6/month)

## Awesome DevOps Dashboard

For infrastructure and operations teams:

```yaml
site:
  title: "Awesome DevOps Dashboard"
  description: "Essential DevOps tools, practices, and automation resources"
  url: "https://yourusername.github.io/awesome-devops-dashboard"

source:
  url: "https://raw.githubusercontent.com/awesome-soft/awesome-devops/master/README.md"
  format: "markdown"

theme:
  primary_color: "#326ce5"  # Docker blue
  custom_themes:
    - name: "Kubernetes"
      primary: "#326ce5"
      secondary: "#ffffff"
      background: "#f6f8fa"

features:
  ai_tags: true
  ai_categories: true
  search: true
  categories: true
```

**Expected AI categories**: `Container Orchestration`, `CI/CD`, `Monitoring`, `Infrastructure as Code`, `Security`

## Multi-List Dashboard Example

Deploy multiple awesome lists in one dashboard:

```yaml
site:
  title: "Programming Resources Dashboard"
  description: "Comprehensive programming languages and tools collection"

source:
  url: "https://raw.githubusercontent.com/vinta/awesome-python/master/README.md"
  format: "markdown"
  additional_lists:
    - name: "Awesome JavaScript"
      url: "https://raw.githubusercontent.com/sorrycc/awesome-javascript/master/README.md"
      category: "Frontend"
      icon: "💛"
    - name: "Awesome Go"
      url: "https://raw.githubusercontent.com/avelino/awesome-go/main/README.md"
      category: "Backend"
      icon: "🐹"
    - name: "Awesome Rust"
      url: "https://raw.githubusercontent.com/rust-unofficial/awesome-rust/main/README.md"
      category: "Systems"
      icon: "🦀"

features:
  list_switcher: true     # Enable list switching UI
  ai_tags: true
  ai_categories: true
```

**AI cost scaling**: 4 lists × 1000 resources × $3 = $12/month (Sonnet) or $1/month (Haiku)

## Budget-Optimized Configuration

Minimize AI costs while maintaining functionality:

```yaml
site:
  title: "Budget Awesome List"
  description: "Cost-effective awesome list deployment"

source:
  url: "https://raw.githubusercontent.com/your/awesome-list/README.md"

# Cost optimization settings
features:
  ai_tags: true           # Enable with budget model
  ai_descriptions: false  # Disable to reduce token usage
  ai_categories: true
  search: true
  categories: true

# Use fallback for less critical features
performance:
  cache_duration: 7200    # Longer caching
```

**Server configuration for budget model**:
```typescript
// In server/ai/tagging.ts, change model to:
model: 'claude-3-haiku-20240307'  // Budget option
max_tokens: 150                   // Reduced token usage
```

**Expected cost**: $0.25/month for 1000 resources

## Enterprise Configuration

High-quality AI features for production use:

```yaml
site:
  title: "Enterprise Awesome Dashboard"
  description: "Premium awesome list with enhanced AI features"

source:
  url: "https://raw.githubusercontent.com/your/enterprise-list/README.md"

analytics:
  google_analytics: "G-YOUR-ENTERPRISE-ID"
  events:
    - resource_clicks
    - category_views
    - search_queries
    - ai_tag_usage
    - download_tracking

features:
  ai_tags: true
  ai_descriptions: true
  ai_categories: true
  analytics_dashboard: true
  resource_previews: true

# Premium AI settings
performance:
  service_worker: true
  cache_duration: 3600
  lazy_loading: true

seo:
  keywords: "enterprise, tools, curated, resources"
  og_image: "https://yourdomain.com/og-image.png"
```

**Server configuration for premium model**:
```typescript
// Use Claude Opus for highest quality
model: 'claude-3-opus-20240229'
max_tokens: 500
```

**Expected cost**: $15/month for enhanced quality and detailed analysis

## Domain-Specific Configurations

### Awesome Security Dashboard
```yaml
theme:
  primary_color: "#dc2626"  # Security red

features:
  ai_tags: true
# AI will generate security-focused tags like:
# "penetration-testing", "vulnerability-scanning", "encryption", "compliance"
```

### Awesome Design Dashboard
```yaml
theme:
  primary_color: "#8b5cf6"  # Design purple
  
features:
  resource_previews: true   # Important for design tools
  ai_descriptions: true     # Enhanced descriptions for creative tools
```

### Awesome Data Science Dashboard
```yaml
features:
  ai_categories: true
  items_per_page: 48       # Data scientists browse more resources
# AI categories: "Data Visualization", "Statistical Analysis", "Big Data", "ETL Tools"
```

## Repository Secrets Setup

For any configuration, add these secrets to your GitHub repository:

```bash
# Required for AI features
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Optional for analytics
GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Optional for custom domain
CUSTOM_DOMAIN=your-domain.com
```

## Testing Your Configuration

Before deploying, test locally:

```bash
# Clone your fork
git clone https://github.com/yourusername/your-awesome-dashboard
cd your-awesome-dashboard

# Edit awesome-list.config.yaml with your settings

# Set environment variables
export ANTHROPIC_API_KEY="your-key"
export VITE_GA_MEASUREMENT_ID="your-ga-id"

# Test locally
npm install
npm run dev

# Deploy when ready
./build-deploy.sh
```

## Configuration Validation

Verify your configuration works:

1. **Data Loading**: Check if your awesome list URL is accessible
2. **AI Features**: Monitor AI tag generation in build logs
3. **Analytics**: Verify tracking after 24-48 hours
4. **Performance**: Test mobile responsiveness and loading speed

## Common Configuration Mistakes

1. **Wrong URL format**: Use raw GitHub URLs, not regular repository URLs
2. **Missing VITE_ prefix**: Client-side variables need VITE_ prefix
3. **Invalid YAML**: Check indentation and syntax
4. **Case sensitivity**: Repository secret names must match exactly
5. **API key format**: Anthropic keys start with `sk-ant-`

## Migration from Existing Lists

Convert your current awesome list deployment:

1. Fork this repository
2. Copy your configuration to `awesome-list.config.yaml`
3. Update repository secrets
4. Run `./build-deploy.sh`
5. Update DNS/domain settings if needed

The AI features will automatically enhance your existing content with smart tags and categories.
import { storage } from "../storage";
import { claudeService } from "../ai/claudeService";

interface JourneyTemplate {
  title: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedDuration: string;
  category: string;
  searchKeywords: string[];
}

interface GeneratedStep {
  stepNumber: number;
  title: string;
  description: string;
  resourceIds: string[];
}

interface GeneratedJourney {
  title: string;
  description: string;
  difficulty: string;
  estimatedDuration: string;
  steps: GeneratedStep[];
}

const journeyTemplates: JourneyTemplate[] = [
  {
    title: "Video Streaming Fundamentals",
    difficulty: "beginner",
    estimatedDuration: "8-10 hours",
    category: "Intro & Learning",
    searchKeywords: ["intro", "fundamental", "beginner", "learning", "tutorial", "basics"]
  },
  {
    title: "Building Your First Streaming Platform",
    difficulty: "intermediate",
    estimatedDuration: "15-20 hours",
    category: "Infrastructure & Delivery",
    searchKeywords: ["platform", "server", "cdn", "encoding", "infrastructure", "delivery"]
  },
  {
    title: "FFMPEG Mastery",
    difficulty: "intermediate",
    estimatedDuration: "12-15 hours",
    category: "Encoding & Codecs",
    searchKeywords: ["ffmpeg", "transcode", "encoding", "filter", "command"]
  },
  {
    title: "Advanced Live Streaming Architecture",
    difficulty: "advanced",
    estimatedDuration: "20-25 hours",
    category: "Protocols & Transport",
    searchKeywords: ["live", "streaming", "low latency", "real-time", "webrtc", "rtmp"]
  },
  {
    title: "DRM & Content Protection",
    difficulty: "advanced",
    estimatedDuration: "10-12 hours",
    category: "General Tools",
    searchKeywords: ["drm", "widevine", "playready", "fairplay", "encryption", "protection"]
  }
];

async function getRelevantResources(keywords: string[], category: string, limit: number = 30): Promise<any[]> {
  const { resources } = await storage.listResources({
    status: "approved",
    limit: limit * 3 // Get more to filter later
  });

  // Score resources based on keyword relevance
  const scoredResources = resources.map(resource => {
    const text = `${resource.title} ${resource.description} ${resource.category}`.toLowerCase();
    let score = 0;
    
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += 10;
        // Bonus for title matches
        if (resource.title.toLowerCase().includes(keyword.toLowerCase())) {
          score += 5;
        }
      }
    }
    
    // Bonus for category match
    if (resource.category.toLowerCase() === category.toLowerCase()) {
      score += 3;
    }
    
    return { resource, score };
  });

  // Try keyword matching first
  let topResources = scoredResources
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => ({
      id: item.resource.id,
      title: item.resource.title,
      description: item.resource.description,
      category: item.resource.category,
      subcategory: item.resource.subcategory
    }));

  // If no keyword matches, fallback to ANY resources from the category
  if (topResources.length === 0) {
    console.warn(`⚠️  No keyword matches for ${category}, using any category resources`);
    topResources = resources
      .filter(r => r.category.toLowerCase() === category.toLowerCase())
      .slice(0, limit)
      .map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        subcategory: r.subcategory
      }));
  }

  // If still nothing, use any approved resources
  if (topResources.length === 0) {
    console.warn(`❌ NO RESOURCES FOUND for category: ${category}, using any approved resources`);
    topResources = resources
      .slice(0, limit)
      .map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        subcategory: r.subcategory
      }));
  }

  return topResources;
}

async function generateJourneyWithClaude(
  template: JourneyTemplate,
  relevantResources: any[]
): Promise<GeneratedJourney | null> {
  if (!claudeService.isAvailable()) {
    console.log("⚠️  Claude service not available, using fallback generation");
    return generateJourneyFallback(template, relevantResources);
  }

  const prompt = `You are creating a learning journey for video streaming education.

Journey Title: "${template.title}"
Difficulty: ${template.difficulty}
Estimated Duration: ${template.estimatedDuration}

Based on these video resources:
${JSON.stringify(relevantResources.slice(0, 25), null, 2)}

Create a detailed learning journey with 6-8 steps. Each step should:
- Have a clear learning objective
- Reference 2-4 relevant resources by their ID from the list above
- Build progressively on previous steps
- Include practical outcomes

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "title": "Journey Title",
  "description": "Detailed 2-3 sentence description of what learners will achieve",
  "difficulty": "${template.difficulty}",
  "estimatedDuration": "${template.estimatedDuration}",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step Title",
      "description": "What the learner will accomplish in this step",
      "resourceIds": [123, 456]
    }
  ]
}`;

  try {
    console.log(`🤖 Generating journey with Claude: ${template.title}...`);
    const response = await claudeService.generateResponse(
      prompt,
      3000,
      "You are an expert in video streaming technology and educational curriculum design. Return ONLY valid JSON, no markdown formatting or code blocks."
    );

    if (!response) {
      console.log("❌ Claude returned null response, using fallback");
      return generateJourneyFallback(template, relevantResources);
    }

    // Clean up response - remove markdown code blocks if present
    let cleanedResponse = response.trim();
    cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '');
    cleanedResponse = cleanedResponse.replace(/^```\s*/i, '');
    cleanedResponse = cleanedResponse.replace(/\s*```$/i, '');
    cleanedResponse = cleanedResponse.trim();

    const journeyData = JSON.parse(cleanedResponse);
    
    // Validate the structure
    if (!journeyData.title || !journeyData.steps || !Array.isArray(journeyData.steps)) {
      console.log("❌ Invalid journey structure from Claude, using fallback");
      return generateJourneyFallback(template, relevantResources);
    }

    // Validate resource IDs exist
    const validResourceIds = new Set(relevantResources.map(r => r.id));
    journeyData.steps = journeyData.steps.map((step: GeneratedStep) => ({
      ...step,
      resourceIds: (step.resourceIds || []).filter(id => validResourceIds.has(id))
    }));

    // Count total valid resource IDs across all steps
    const totalValidResourceIds = journeyData.steps.reduce(
      (sum: number, step: any) => sum + (step.resourceIds?.length || 0),
      0
    );

    // Validate minimum steps with resources
    if (totalValidResourceIds < 3) {
      console.error(`❌ Journey "${journeyData.title}" has only ${totalValidResourceIds} valid resource references (minimum 3 required)`);
      console.error(`   Attempting broader resource selection with fallback...`);
      return generateJourneyFallback(template, relevantResources);
    }

    console.log(`✅ Generated ${journeyData.steps.length} steps with ${totalValidResourceIds} total resources`);
    return journeyData;

  } catch (error) {
    console.error(`❌ Error generating journey with Claude:`, error);
    return generateJourneyFallback(template, relevantResources);
  }
}

function generateJourneyFallback(
  template: JourneyTemplate,
  relevantResources: any[]
): GeneratedJourney {
  console.log(`📝 Using fallback generation for: ${template.title}`);
  
  // Ensure we have enough resources
  if (relevantResources.length === 0) {
    console.error(`❌ Cannot generate fallback journey - no resources available`);
    throw new Error(`No resources available for journey: ${template.title}`);
  }

  // Ensure we create 3-6 logical steps based on available resources
  const stepsCount = Math.min(6, Math.max(3, relevantResources.length));
  
  // Ensure at least 1 resource per step (improved distribution)
  const resourcesPerStep = Math.max(1, Math.floor(relevantResources.length / stepsCount));
  
  const steps: GeneratedStep[] = [];

  const stepTitles: { [key: string]: string[] } = {
    "Video Streaming Fundamentals": [
      "Introduction to Video Streaming",
      "Understanding Video Codecs",
      "Streaming Protocols Overview",
      "Basic Player Setup",
      "Video Formats and Containers",
      "Putting It All Together"
    ],
    "Building Your First Streaming Platform": [
      "Platform Architecture Planning",
      "Setting Up Streaming Servers",
      "Encoding Pipeline Setup",
      "CDN Integration",
      "Player Implementation",
      "Testing and Optimization"
    ],
    "FFMPEG Mastery": [
      "FFMPEG Fundamentals",
      "Video Transcoding Techniques",
      "Audio Processing",
      "Filters and Effects",
      "Performance Optimization",
      "Advanced Workflows"
    ],
    "Advanced Live Streaming Architecture": [
      "Live Streaming Fundamentals",
      "Low-Latency Protocols",
      "Scalability Patterns",
      "Monitoring and Analytics",
      "Edge Computing Integration",
      "Production Best Practices"
    ],
    "DRM & Content Protection": [
      "DRM Fundamentals",
      "Widevine Integration",
      "PlayReady Implementation",
      "FairPlay Setup",
      "Multi-DRM Strategy",
      "Security Best Practices"
    ]
  };

  const titles = stepTitles[template.title] || [
    "Foundation Concepts",
    "Core Technologies",
    "Practical Implementation",
    "Advanced Techniques",
    "Optimization Strategies",
    "Best Practices"
  ];

  // Distribute resources evenly across steps
  let resourceIndex = 0;
  for (let i = 0; i < stepsCount; i++) {
    // Calculate how many resources to assign to this step
    const remainingSteps = stepsCount - i;
    const remainingResources = relevantResources.length - resourceIndex;
    const resourcesToAssign = Math.max(1, Math.ceil(remainingResources / remainingSteps));
    
    // Get resources for this step (limit to 3 per step to avoid bloat)
    const stepResources = relevantResources.slice(resourceIndex, resourceIndex + Math.min(resourcesToAssign, 3));
    const resourceIds = stepResources.map(r => r.id).filter(id => id);
    
    // Only create step if it has at least one valid resource
    if (resourceIds.length > 0) {
      steps.push({
        stepNumber: i + 1,
        title: titles[i] || `Step ${i + 1}`,
        description: `Learn about ${titles[i]} through curated resources and practical examples.`,
        resourceIds: resourceIds
      });
      
      resourceIndex += stepResources.length;
    } else {
      // This shouldn't happen with proper resource allocation, but log it
      console.warn(`⚠️  Step ${i + 1} has no resources, skipping`);
    }
  }

  // Final validation - ensure we have at least 3 total resource references
  const totalResourceIds = steps.reduce((sum, step) => sum + step.resourceIds.length, 0);
  if (totalResourceIds < 3) {
    console.error(`❌ Fallback journey only has ${totalResourceIds} resources (minimum 3 required)`);
    throw new Error(`Insufficient resources for journey: ${template.title}`);
  }

  console.log(`✅ Fallback generated ${steps.length} steps with ${totalResourceIds} total resources`);

  return {
    title: template.title,
    description: `A comprehensive ${template.difficulty} level journey through ${template.category.toLowerCase()}. Master the essential concepts and practical skills needed to excel in this area.`,
    difficulty: template.difficulty,
    estimatedDuration: template.estimatedDuration,
    steps: steps
  };
}

async function createJourney(journeyData: GeneratedJourney, category: string) {
  console.log(`\n📚 Creating journey: ${journeyData.title}`);
  
  // Create the journey
  const journey = await storage.createLearningJourney({
    title: journeyData.title,
    description: journeyData.description,
    difficulty: journeyData.difficulty,
    estimatedDuration: journeyData.estimatedDuration,
    category: category,
    status: "published"
  });

  console.log(`✅ Created journey #${journey.id}`);

  // Create journey steps
  let stepCount = 0;
  let skippedSteps = 0;
  for (const step of journeyData.steps) {
    // Create a journey step for each resource ID
    // This allows multiple resources per logical step
    if (step.resourceIds && step.resourceIds.length > 0) {
      for (const resourceId of step.resourceIds) {
        await storage.createJourneyStep({
          journeyId: journey.id,
          stepNumber: step.stepNumber,
          title: step.title,
          description: step.description,
          resourceId: resourceId,
          isOptional: false
        });
        stepCount++;
      }
    } else {
      // Skip steps with no valid resources - don't create with undefined resourceId
      console.warn(`⚠️  Skipping step "${step.title}" - no resources available`);
      skippedSteps++;
    }
  }

  // CRITICAL VALIDATION: Check distinct stepNumbers (not total rows)
  const createdSteps = await storage.listJourneySteps(journey.id);
  const uniqueStepNumbers = new Set(createdSteps.map(s => s.stepNumber));

  if (uniqueStepNumbers.size === 0) {
    console.error(`❌ Journey "${journey.title}" has no valid steps!`);
    console.error(`   Deleting empty journey...`);

    // Delete the empty journey
    await storage.deleteLearningJourney(journey.id);

    console.error(`   ⚠️  Please review resource selection for this category`);
    throw new Error(`Journey "${journey.title}" has no valid steps and was deleted`);
  }

  if (uniqueStepNumbers.size < 3) {
    console.error(`❌ Journey "${journey.title}" has only ${uniqueStepNumbers.size} logical steps (minimum 3 required)`);
    console.error(`   Deleting invalid journey...`);

    // Delete the invalid journey
    await storage.deleteLearningJourney(journey.id);

    console.error(`   ⚠️  Please review resource selection for this category`);
    throw new Error(`Failed to create valid journey: ${journey.title}`);
  }

  console.log(`✅ Created journey "${journey.title}" with ${uniqueStepNumbers.size} logical steps (${createdSteps.length} total resources)`);
  if (skippedSteps > 0) {
    console.log(`⚠️  Skipped ${skippedSteps} logical steps without resources`);
  }
  return journey;
}

async function seedJourneys() {
  console.log("🌱 Starting Learning Journey Seeding Process\n");
  console.log("=" .repeat(60));

  const results = {
    created: 0,
    skipped: 0,
    failed: 0
  };

  for (const template of journeyTemplates) {
    try {
      console.log(`\n\n🎯 Processing: ${template.title}`);
      console.log(`   Difficulty: ${template.difficulty}`);
      console.log(`   Duration: ${template.estimatedDuration}`);

      // Check if journey already exists
      const existingJourneys = await storage.listLearningJourneys(template.category);
      const exists = existingJourneys.some(j => j.title === template.title);

      if (exists) {
        console.log(`⏭️  Journey already exists, skipping...`);
        results.skipped++;
        continue;
      }

      // Get relevant resources
      console.log(`🔍 Finding relevant resources...`);
      const relevantResources = await getRelevantResources(template.searchKeywords, template.category, 30);
      console.log(`   Found ${relevantResources.length} relevant resources`);

      if (relevantResources.length === 0) {
        console.log(`⚠️  No resources found for this journey, skipping...`);
        results.skipped++;
        continue;
      }

      // Generate journey with Claude
      const journeyData = await generateJourneyWithClaude(template, relevantResources);

      if (!journeyData) {
        console.log(`❌ Failed to generate journey data`);
        results.failed++;
        continue;
      }

      // Create journey in database
      await createJourney(journeyData, template.category);
      results.created++;

    } catch (error) {
      console.error(`❌ Error processing journey ${template.title}:`, error);
      results.failed++;
    }
  }

  console.log("\n\n" + "=".repeat(60));
  console.log("🎉 Seeding Complete!");
  console.log("=".repeat(60));
  console.log(`✅ Created: ${results.created} journeys`);
  console.log(`⏭️  Skipped: ${results.skipped} journeys`);
  console.log(`❌ Failed: ${results.failed} journeys`);
  console.log("=".repeat(60));
}

// Run the seeding process
seedJourneys()
  .then(() => {
    console.log("\n✨ All done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });

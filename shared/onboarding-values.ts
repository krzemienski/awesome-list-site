/**
 * Runtime values and dependency-free types shared by browser and server.
 *
 * Keep Zod schemas in onboarding.ts. Browser components import this module so
 * reading preference constants does not pull the validation engine into the
 * anonymous application entry.
 */
export const ONBOARDING_STATUS_VALUES = [
  "not_started",
  "in_progress",
  "completed",
  "dismissed",
] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUS_VALUES)[number];

export const SKILL_LEVEL_VALUES = [
  "beginner",
  "intermediate",
  "advanced",
] as const;
export type LearningSkillLevel = (typeof SKILL_LEVEL_VALUES)[number];

export const LEARNING_GOAL_OPTIONS = [
  { value: "learn-fundamentals", label: "Learn the fundamentals" },
  { value: "build-video-apps", label: "Build video applications" },
  { value: "improve-streaming", label: "Improve streaming experiences" },
  { value: "optimize-encoding", label: "Optimize encoding and quality" },
  { value: "operate-infrastructure", label: "Operate video infrastructure" },
  { value: "keep-current", label: "Keep up with standards and tools" },
] as const;
export const LEARNING_GOAL_VALUES = LEARNING_GOAL_OPTIONS.map(
  (option) => option.value,
) as [
  (typeof LEARNING_GOAL_OPTIONS)[number]["value"],
  ...(typeof LEARNING_GOAL_OPTIONS)[number]["value"][],
];
export type LearningGoal = (typeof LEARNING_GOAL_VALUES)[number];

// These values match first-class resources.resource_format values. The subset
// is deliberately limited to formats people meaningfully choose for learning.
export const LEARNING_FORMAT_OPTIONS = [
  { value: "video", label: "Videos" },
  { value: "course", label: "Courses" },
  { value: "article", label: "Articles" },
  { value: "book", label: "Books" },
  { value: "specification", label: "Specifications" },
  { value: "tool", label: "Hands-on tools" },
  { value: "library", label: "Libraries and SDKs" },
  { value: "community", label: "Community resources" },
] as const;
export const LEARNING_FORMAT_VALUES = LEARNING_FORMAT_OPTIONS.map(
  (option) => option.value,
) as [
  (typeof LEARNING_FORMAT_OPTIONS)[number]["value"],
  ...(typeof LEARNING_FORMAT_OPTIONS)[number]["value"][],
];
export type LearningFormat = (typeof LEARNING_FORMAT_VALUES)[number];

const LEARNING_GOAL_VALUE_SET = new Set<string>(LEARNING_GOAL_VALUES);
const LEARNING_FORMAT_VALUE_SET = new Set<string>(LEARNING_FORMAT_VALUES);

const LEGACY_GOAL_EXACT_MAP: Record<string, LearningGoal> = {
  "learn video encoding fundamentals": "learn-fundamentals",
  "master ffmpeg command line": "optimize-encoding",
  "build streaming applications": "build-video-apps",
  "optimize video performance": "optimize-encoding",
  "implement adaptive streaming": "improve-streaming",
  "understand video compression": "optimize-encoding",
  "deploy video infrastructure": "operate-infrastructure",
  "develop mobile video apps": "build-video-apps",
  "learn drm implementation": "build-video-apps",
  "master video analytics": "operate-infrastructure",
  "master video streaming protocols": "improve-streaming",
};

const LEGACY_FORMAT_MAP: Record<string, LearningFormat> = {
  documentation: "specification",
  docs: "specification",
  reference: "specification",
  references: "specification",
  spec: "specification",
  specifications: "specification",
  tutorial: "course",
  tutorials: "course",
  training: "course",
  video: "video",
  videos: "video",
  tool: "tool",
  tools: "tool",
  library: "library",
  libraries: "library",
  sdk: "library",
  sdks: "library",
  framework: "library",
  frameworks: "library",
  article: "article",
  articles: "article",
  blog: "article",
  blogs: "article",
  "case study": "article",
  "case studies": "article",
  course: "course",
  courses: "course",
  book: "book",
  books: "book",
  ebook: "book",
  ebooks: "book",
  community: "community",
  "community resource": "community",
  "community resources": "community",
};

function inferLegacyGoal(value: string): LearningGoal | null {
  const normalized = value.trim().toLowerCase();
  if (LEARNING_GOAL_VALUE_SET.has(normalized)) return normalized as LearningGoal;
  if (LEGACY_GOAL_EXACT_MAP[normalized]) return LEGACY_GOAL_EXACT_MAP[normalized];
  if (/(fundamental|beginner|getting started|introduction|basics)/.test(normalized)) {
    return "learn-fundamentals";
  }
  if (/(ffmpeg|encod|codec|compress|quality|bitrate|transcod)/.test(normalized)) {
    return "optimize-encoding";
  }
  if (/(stream|hls|dash|webrtc|latency|playback|buffer)/.test(normalized)) {
    return "improve-streaming";
  }
  if (/(infrastructure|deploy|cloud|cdn|operat|analytics|monitor)/.test(normalized)) {
    return "operate-infrastructure";
  }
  if (/(app|application|mobile|drm|sdk|api|player)/.test(normalized)) {
    return "build-video-apps";
  }
  if (/(standard|current|news|industry|emerging|release)/.test(normalized)) {
    return "keep-current";
  }
  return null;
}

export function normalizeLearningGoals(values: readonly unknown[]): LearningGoal[] {
  const normalized = values
    .filter((value): value is string => typeof value === "string")
    .map(inferLegacyGoal)
    .filter((value): value is LearningGoal => value !== null);
  return [...new Set(normalized)];
}

export function normalizeLearningFormats(values: readonly unknown[]): LearningFormat[] {
  const normalized = values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase())
    .map((value): LearningFormat | null => {
      if (LEARNING_FORMAT_VALUE_SET.has(value)) return value as LearningFormat;
      return LEGACY_FORMAT_MAP[value] ?? null;
    })
    .filter((value): value is LearningFormat => value !== null);
  return [...new Set(normalized)];
}

export const TIME_COMMITMENT_OPTIONS = [
  { value: "daily", label: "A little most days" },
  { value: "weekly", label: "One focused session each week" },
  { value: "flexible", label: "Whenever time allows" },
] as const;
export const TIME_COMMITMENT_VALUES = TIME_COMMITMENT_OPTIONS.map(
  (option) => option.value,
) as [
  (typeof TIME_COMMITMENT_OPTIONS)[number]["value"],
  ...(typeof TIME_COMMITMENT_OPTIONS)[number]["value"][],
];
export type LearningTimeCommitment = (typeof TIME_COMMITMENT_VALUES)[number];

export const ONBOARDING_STEP_COUNT = 5;

export interface LearningPreferencesValues {
  preferredCategories: string[];
  skillLevel: LearningSkillLevel;
  learningGoals: LearningGoal[];
  preferredResourceTypes: LearningFormat[];
  timeCommitment: LearningTimeCommitment;
}

export type LearningPreferencesUpdate = Partial<LearningPreferencesValues> & {
  expectedRevision?: number | null;
  onboardingStatus?: OnboardingStatus;
  onboardingStep?: number;
};

export const DEFAULT_LEARNING_PREFERENCES: LearningPreferencesValues = {
  preferredCategories: [],
  skillLevel: "beginner",
  learningGoals: [],
  preferredResourceTypes: [],
  timeCommitment: "flexible",
};

export function hasMeaningfulLearningPreferences(
  values:
    | Pick<
        LearningPreferencesValues,
        "preferredCategories" | "learningGoals" | "preferredResourceTypes"
      >
    | null
    | undefined,
): boolean {
  return Boolean(
    values &&
      (values.preferredCategories.length > 0 ||
        values.learningGoals.length > 0 ||
        values.preferredResourceTypes.length > 0),
  );
}
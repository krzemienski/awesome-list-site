import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Brain, BookOpen, Sparkles } from "lucide-react";
import RecommendationCard from "./RecommendationCard";
import LearningPathCard from "./LearningPathCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface Resource {
  id: string;
  name: string;
  url: string;
  description?: string;
  category: string;
  tags?: string[];
  confidence?: number;
  matchReason?: string;
  isAIBased?: boolean;
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  duration: string;
  resourceCount: number;
  matchPercentage: number;
  resources: Resource[];
  objectives: string[];
}

interface AIRecommendationsPanelProps {
  resources?: Resource[];
  learningPaths?: LearningPath[];
  className?: string;
  onResourceClick?: (resource: Resource) => void;
  onLearningPathStart?: (path: LearningPath) => void;
}

// Mock data for demonstration - will be replaced with actual AI recommendations
const mockRecommendations: Resource[] = [
  {
    id: "1",
    name: "FFmpeg",
    url: "https://ffmpeg.org",
    description: "A complete, cross-platform solution to record, convert and stream audio and video.",
    category: "Media Tools",
    confidence: 95,
    matchReason: "Essential tool for video processing",
    isAIBased: true,
    tags: ["video", "audio", "conversion"]
  },
  {
    id: "2",
    name: "WebRTC",
    url: "https://webrtc.org",
    description: "Real-time communication for the web",
    category: "Protocols & Transport",
    confidence: 85,
    matchReason: "Based on your interest in streaming",
    isAIBased: true,
    tags: ["streaming", "real-time", "p2p"]
  },
  {
    id: "3",
    name: "HLS.js",
    url: "https://github.com/video-dev/hls.js",
    description: "JavaScript HLS client using Media Source Extension",
    category: "Players & Clients",
    confidence: 78,
    matchReason: "Popular in web video streaming",
    isAIBased: false,
    tags: ["javascript", "streaming", "hls"]
  }
];

const mockLearningPaths: LearningPath[] = [
  {
    id: "1",
    title: "Video Streaming Fundamentals",
    description: "Master the basics of video streaming, from codecs to delivery protocols",
    difficulty: "beginner",
    duration: "20h",
    resourceCount: 6,
    matchPercentage: 92,
    resources: [],
    objectives: [
      "Understand video codecs and containers",
      "Learn about streaming protocols",
      "Build a basic streaming application"
    ]
  },
  {
    id: "2",
    title: "Advanced Video Processing",
    description: "Deep dive into video encoding, transcoding, and optimization",
    difficulty: "advanced",
    duration: "40h",
    resourceCount: 12,
    matchPercentage: 75,
    resources: [],
    objectives: [
      "Master FFmpeg and video processing tools",
      "Optimize video quality and file size",
      "Implement adaptive bitrate streaming"
    ]
  }
];

export default function AIRecommendationsPanel({
  resources = mockRecommendations,
  learningPaths = mockLearningPaths,
  className,
  onResourceClick,
  onLearningPathStart
}: AIRecommendationsPanelProps) {
  const [activeTab, setActiveTab] = useState("resources");
  const isMobile = useIsMobile();

  const handleResourceClick = (resource: Resource) => {
    if (onResourceClick) {
      onResourceClick(resource);
    } else {
      window.open(resource.url, '_blank');
    }
  };

  const handleLearningPathStart = (path: LearningPath) => {
    if (onLearningPathStart) {
      onLearningPathStart(path);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-pink-500" />
        <h2 className="text-lg font-semibold">AI Recommendations</h2>
        <Badge variant="secondary" className="ml-auto">
          <Brain className="h-3 w-3 mr-1" />
          Personalized
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="paths" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Learning Paths
          </TabsTrigger>
        </TabsList>

        {/* Resources Tab */}
        <TabsContent value="resources" className="flex-1 mt-0">
          <ScrollArea className={cn(
            "w-full",
            isMobile ? "h-[calc(100vh-240px)]" : "h-[500px]"
          )}>
            <div className="space-y-3 pr-4">
              {resources.length > 0 ? (
                resources.map((resource) => (
                  <RecommendationCard
                    key={resource.id}
                    resource={resource}
                    onClick={() => handleResourceClick(resource)}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recommendations available yet.</p>
                  <p className="text-sm mt-2">Complete your profile to get personalized suggestions.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Learning Paths Tab */}
        <TabsContent value="paths" className="flex-1 mt-0">
          <ScrollArea className={cn(
            "w-full",
            isMobile ? "h-[calc(100vh-240px)]" : "h-[500px]"
          )}>
            <div className="space-y-3 pr-4">
              {learningPaths.length > 0 ? (
                learningPaths.map((path) => (
                  <LearningPathCard
                    key={path.id}
                    learningPath={path}
                    onStart={() => handleLearningPathStart(path)}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No learning paths available yet.</p>
                  <p className="text-sm mt-2">We're curating personalized paths based on your interests.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
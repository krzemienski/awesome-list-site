import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, Target, ChevronRight, Award, BarChart } from "lucide-react";
import { cn } from "@/lib/utils";

interface LearningPath {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  duration: string;
  resourceCount: number;
  matchPercentage: number;
  objectives?: string[];
}

interface LearningPathCardProps {
  learningPath: LearningPath;
  onStart?: () => void;
  onViewDetails?: () => void;
  className?: string;
}

export default function LearningPathCard({ 
  learningPath, 
  onStart,
  onViewDetails,
  className 
}: LearningPathCardProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-500/10 text-green-500 border-green-500/30";
      case "intermediate":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
      case "advanced":
        return "bg-red-500/10 text-red-500 border-red-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-500";
    if (percentage >= 60) return "text-yellow-500";
    return "text-orange-500";
  };

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all hover:border-cyan-500/50",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-base">{learningPath.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {learningPath.description}
              </p>
            </div>
          </div>

          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Difficulty Badge */}
            <Badge 
              variant="outline"
              className={cn("text-xs capitalize", getDifficultyColor(learningPath.difficulty))}
            >
              <Award className="h-3 w-3 mr-1" />
              {learningPath.difficulty}
            </Badge>

            {/* Duration */}
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {learningPath.duration}
            </Badge>

            {/* Resource Count */}
            <Badge variant="secondary" className="text-xs">
              <BookOpen className="h-3 w-3 mr-1" />
              {learningPath.resourceCount} resources
            </Badge>

            {/* Match Percentage */}
            <Badge 
              variant="outline"
              className={cn(
                "text-xs bg-gradient-to-r from-pink-500/10 to-cyan-500/10 border-pink-500/30",
                getMatchColor(learningPath.matchPercentage)
              )}
            >
              <BarChart className="h-3 w-3 mr-1" />
              {learningPath.matchPercentage}% match
            </Badge>
          </div>

          {/* Objectives */}
          {learningPath.objectives && learningPath.objectives.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Learning Objectives:
              </p>
              <ul className="space-y-1">
                {learningPath.objectives.slice(0, 3).map((objective, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Target className="h-3 w-3 mt-0.5 flex-shrink-0 text-cyan-500" />
                    <span className="line-clamp-1">{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 mt-2">
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white border-0"
              onClick={onStart}
            >
              Start Learning
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            {onViewDetails && (
              <Button 
                variant="outline" 
                size="sm"
                className="border-cyan-500/50 hover:bg-cyan-500/10 hover:border-cyan-500"
                onClick={onViewDetails}
              >
                View Details
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
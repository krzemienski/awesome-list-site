import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings, 
  User, 
  Target, 
  Clock, 
  BookOpen, 
  Brain,
  Plus,
  X
} from "lucide-react";

interface UserProfile {
  userId: string;
  preferredCategories: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  learningGoals: string[];
  preferredResourceTypes: string[];
  timeCommitment: 'daily' | 'weekly' | 'flexible';
  viewHistory: string[];
  bookmarks: string[];
  completedResources: string[];
  ratings: Record<string, number>;
}

interface UserPreferencesProps {
  userProfile: UserProfile;
  onProfileUpdate: (profile: Partial<UserProfile>) => void;
  availableCategories: string[];
}

const RESOURCE_TYPES = [
  'Documentation',
  'Tutorial',
  'Video',
  'Tool',
  'Library',
  'Framework',
  'Article',
  'Course',
  'Book',
  'Reference'
];

const COMMON_LEARNING_GOALS = [
  'Learn video encoding fundamentals',
  'Master FFmpeg command line',
  'Build streaming applications',
  'Optimize video performance',
  'Implement adaptive streaming',
  'Understand video compression',
  'Deploy video infrastructure',
  'Develop mobile video apps',
  'Learn DRM implementation',
  'Master video analytics'
];

export default function UserPreferences({ 
  userProfile, 
  onProfileUpdate, 
  availableCategories 
}: UserPreferencesProps) {
  const [localProfile, setLocalProfile] = useState<UserProfile>(userProfile);
  const [newGoal, setNewGoal] = useState("");
  const [isOpen, setIsOpen] = useState(() => {
    // Persist dialog state to prevent disappearing on scroll
    const saved = sessionStorage.getItem('awesome-user-preferences-open');
    return saved === 'true';
  });

  useEffect(() => {
    setLocalProfile(userProfile);
  }, [userProfile]);

  const handleSave = () => {
    // Pass only the fields we want to update to avoid overwriting other fields
    onProfileUpdate({
      preferredCategories: localProfile.preferredCategories,
      skillLevel: localProfile.skillLevel,
      learningGoals: localProfile.learningGoals,
      preferredResourceTypes: localProfile.preferredResourceTypes,
      timeCommitment: localProfile.timeCommitment
    });
    setIsOpen(false);
    sessionStorage.setItem('awesome-user-preferences-open', 'false');
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsOpen(open);
    sessionStorage.setItem('awesome-user-preferences-open', open.toString());
  };

  const handleCategoryToggle = (category: string) => {
    setLocalProfile(prev => ({
      ...prev,
      preferredCategories: prev.preferredCategories.includes(category)
        ? prev.preferredCategories.filter(c => c !== category)
        : [...prev.preferredCategories, category]
    }));
  };

  const handleResourceTypeToggle = (type: string) => {
    setLocalProfile(prev => ({
      ...prev,
      preferredResourceTypes: prev.preferredResourceTypes.includes(type)
        ? prev.preferredResourceTypes.filter(t => t !== type)
        : [...prev.preferredResourceTypes, type]
    }));
  };

  const handleAddLearningGoal = (goal: string) => {
    if (goal && !localProfile.learningGoals.includes(goal)) {
      setLocalProfile(prev => ({
        ...prev,
        learningGoals: [...prev.learningGoals, goal]
      }));
    }
  };

  const handleRemoveLearningGoal = (goal: string) => {
    setLocalProfile(prev => ({
      ...prev,
      learningGoals: prev.learningGoals.filter(g => g !== goal)
    }));
  };

  const addCustomGoal = () => {
    if (newGoal.trim()) {
      handleAddLearningGoal(newGoal.trim());
      setNewGoal("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2 touch-optimized min-h-[44px] sm:min-h-auto"
        >
          <Settings className="h-4 w-4" />
          Preferences
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden touch-optimized w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Personalization Settings
          </DialogTitle>
          <DialogDescription>
            Customize your learning preferences to get personalized AI-powered recommendations
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="flex items-center gap-1 touch-optimized min-h-[44px] sm:min-h-auto">
                <User className="h-3 w-3" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex items-center gap-1 touch-optimized min-h-[44px] sm:min-h-auto">
                <BookOpen className="h-3 w-3" />
                Interests
              </TabsTrigger>
              <TabsTrigger value="goals" className="flex items-center gap-1 touch-optimized min-h-[44px] sm:min-h-auto">
                <Target className="h-3 w-3" />
                Goals
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-1 touch-optimized min-h-[44px] sm:min-h-auto">
                <Clock className="h-3 w-3" />
                Style
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="skillLevel">Skill Level</Label>
                  <Select 
                    data-testid="skill-level-select"
                    value={localProfile.skillLevel} 
                    onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => {
                      setLocalProfile(prev => ({ ...prev, skillLevel: value }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner - New to video development</SelectItem>
                      <SelectItem value="intermediate">Intermediate - Some experience</SelectItem>
                      <SelectItem value="advanced">Advanced - Experienced developer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="timeCommitment">Learning Schedule</Label>
                  <Select 
                    data-testid="learning-schedule-select"
                    value={localProfile.timeCommitment} 
                    onValueChange={(value: 'daily' | 'weekly' | 'flexible') => 
                      setLocalProfile(prev => ({ ...prev, timeCommitment: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily - Regular daily learning</SelectItem>
                      <SelectItem value="weekly">Weekly - Weekend sessions</SelectItem>
                      <SelectItem value="flexible">Flexible - Learn when I can</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-muted">
                  <h4 className="font-medium mb-2">Your Learning Profile</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Interests:</span>
                      <br />
                      {localProfile.preferredCategories.length} categories
                    </div>
                    <div>
                      <span className="text-muted-foreground">Goals:</span>
                      <br />
                      {localProfile.learningGoals.length} learning goals
                    </div>
                    <div>
                      <span className="text-muted-foreground">Experience:</span>
                      <br />
                      {localProfile.viewHistory.length} resources viewed
                    </div>
                    <div>
                      <span className="text-muted-foreground">Bookmarks:</span>
                      <br />
                      {localProfile.bookmarks.length} saved resources
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="categories" className="space-y-4 mt-4">
              <div>
                <Label>Preferred Categories</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select categories you're most interested in learning about
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {availableCategories.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={category}
                        checked={localProfile.preferredCategories.includes(category)}
                        onCheckedChange={() => handleCategoryToggle(category)}
                      />
                      <Label 
                        htmlFor={category}
                        className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {localProfile.preferredCategories.length > 0 && (
                <div>
                  <Label>Selected Categories ({localProfile.preferredCategories.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {localProfile.preferredCategories.map((category) => (
                      <Badge 
                        key={category} 
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleCategoryToggle(category)}
                      >
                        {category}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="goals" className="space-y-4 mt-4">
              <div>
                <Label>Learning Goals</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  What do you want to achieve? This helps us recommend the right resources.
                </p>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Quick Add</Label>
                    <div className="grid grid-cols-1 gap-2 mt-1">
                      {COMMON_LEARNING_GOALS.filter(goal => 
                        !localProfile.learningGoals.includes(goal)
                      ).slice(0, 5).map((goal) => (
                        <Button
                          key={goal}
                          variant="outline"
                          size="sm"
                          className="justify-start h-auto p-2 text-left"
                          onClick={() => handleAddLearningGoal(goal)}
                        >
                          <Plus className="h-3 w-3 mr-2 flex-shrink-0" />
                          <span className="text-sm">{goal}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label className="text-sm font-medium">Custom Goal</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder="Enter your learning goal..."
                        value={newGoal}
                        onChange={(e) => setNewGoal(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCustomGoal()}
                      />
                      <Button onClick={addCustomGoal} size="sm">
                        Add
                      </Button>
                    </div>
                  </div>

                  {localProfile.learningGoals.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Your Goals ({localProfile.learningGoals.length})</Label>
                      <div className="space-y-2 mt-2">
                        {localProfile.learningGoals.map((goal, index) => (
                          <div 
                            key={index}
                            className="flex items-center justify-between p-2 bg-muted rounded"
                          >
                            <span className="text-sm">{goal}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveLearningGoal(goal)}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-4 mt-4">
              <div>
                <Label>Preferred Resource Types</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  What types of resources do you prefer to learn from?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {RESOURCE_TYPES.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={localProfile.preferredResourceTypes.includes(type)}
                        onCheckedChange={() => handleResourceTypeToggle(type)}
                      />
                      <Label 
                        htmlFor={type}
                        className="text-sm cursor-pointer"
                      >
                        {type}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {localProfile.preferredResourceTypes.length > 0 && (
                <div>
                  <Label>Selected Types ({localProfile.preferredResourceTypes.length})</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {localProfile.preferredResourceTypes.map((type) => (
                      <Badge 
                        key={type} 
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleResourceTypeToggle(type)}
                      >
                        {type}
                        <X className="h-3 w-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              <div className="p-4 bg-blue-50 dark:bg-blue-950">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  How Recommendations Work
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Your preferences shape what we recommend</li>
                  <li>• We track your interaction patterns to improve suggestions</li>
                  <li>• Learning paths are created based on your skill level and goals</li>
                  <li>• Recommendations get better as you use the platform more</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => {
            setIsOpen(false);
            sessionStorage.setItem('awesome-user-preferences-open', 'false');
          }}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
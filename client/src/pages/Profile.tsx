import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  User, 
  Heart, 
  Bookmark, 
  Trophy, 
  Target, 
  Clock, 
  TrendingUp, 
  Settings, 
  LogOut,
  Mail,
  Calendar,
  ExternalLink,
  Star,
  FileText,
  Edit,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import FavoriteButton from "@/components/resource/FavoriteButton";
import BookmarkButton from "@/components/resource/BookmarkButton";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

interface ProfileProps {
  user?: any;
}

interface Favorite {
  id: string;
  resourceId: string;
  resourceName: string;
  resourceUrl: string;
  category: string;
  addedAt: string;
}

interface BookmarkItem {
  id: string;
  resourceId: string;
  resourceName: string;
  resourceUrl: string;
  category: string;
  notes?: string;
  addedAt: string;
}

interface LearningProgress {
  totalResources: number;
  completedResources: number;
  currentPath?: string;
  streakDays: number;
  totalTimeSpent: string;
  skillLevel: string;
}

interface SubmittedResource {
  id: number;
  title: string;
  url: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
}

interface ResourceEdit {
  id: number;
  resourceId: number;
  status: string;
  proposedChanges: Record<string, { old: any; new: any }>;
  createdAt: string;
}

interface UserSubmissions {
  resources: SubmittedResource[];
  edits: ResourceEdit[];
  totalResources: number;
  totalEdits: number;
}

interface UserJourney {
  id: number;
  journeyId: number;
  userId: string;
  currentStepId?: number;
  completedAt?: string;
  lastAccessedAt: string;
  journey?: {
    id: number;
    title: string;
    description: string;
    difficulty: string;
    estimatedDuration?: string;
  };
}

export default function Profile({ user }: ProfileProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const { logout } = useAuth();

  // Fetch favorites
  const { data: favorites, isLoading: favoritesLoading } = useQuery<Favorite[]>({
    queryKey: ['/api/favorites'],
    enabled: !!user
  });

  // Fetch bookmarks
  const { data: bookmarks, isLoading: bookmarksLoading } = useQuery<BookmarkItem[]>({
    queryKey: ['/api/bookmarks'],
    enabled: !!user
  });

  // Fetch learning progress
  const { data: progress, isLoading: progressLoading } = useQuery<LearningProgress>({
    queryKey: ['/api/user/progress'],
    enabled: !!user
  });

  // Fetch user submissions
  const { data: submissions, isLoading: submissionsLoading } = useQuery<UserSubmissions>({
    queryKey: ['/api/user/submissions'],
    enabled: !!user
  });

  // Fetch user's learning journeys
  const { data: userJourneys, isLoading: journeysLoading } = useQuery<UserJourney[]>({
    queryKey: ['/api/user/journeys'],
    enabled: !!user
  });

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const stats = [
    {
      label: "Favorites",
      value: favorites?.length || 0,
      icon: Heart,
      color: "text-pink-500"
    },
    {
      label: "Bookmarks",
      value: bookmarks?.length || 0,
      icon: Bookmark,
      color: "text-cyan-500"
    },
    {
      label: "Learning Streak",
      value: `${progress?.streakDays || 0}d`,
      icon: Trophy,
      color: "text-yellow-500"
    },
    {
      label: "Resources Viewed",
      value: progress?.completedResources || 0,
      icon: Target,
      color: "text-green-500"
    }
  ];

  if (!user) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p className="text-muted-foreground">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
        <Avatar className="h-24 w-24 border-2 border-pink-500">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="text-xl bg-gradient-to-br from-pink-500 to-cyan-500 text-white">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-3xl font-bold mb-2">{user.name || "User"}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground justify-center sm:justify-start">
            {user.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {user.email}
              </span>
            )}
            {user.createdAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
              </span>
            )}
            {progress?.skillLevel && (
              <Badge variant="secondary" className="capitalize">
                {progress.skillLevel}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" size="sm" onClick={() => logout()}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`h-8 w-8 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
          <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Learning Progress
              </CardTitle>
              <CardDescription>
                Track your learning journey and achievements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {progressLoading ? (
                <div className="space-y-3" aria-busy={true} aria-live="polite">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Resources Completed</span>
                      <span className="font-medium">
                        {progress?.completedResources || 0} / {progress?.totalResources || 0}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-pink-500 to-cyan-500 transition-all"
                        style={{
                          width: `${((progress?.completedResources || 0) / (progress?.totalResources || 1)) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Current Learning Path */}
                  {progress?.currentPath && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm font-medium mb-1">Current Learning Path</p>
                      <p className="text-lg">{progress.currentPath}</p>
                    </div>
                  )}

                  {/* Time Spent */}
                  {progress?.totalTimeSpent && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Total time spent: {progress.totalTimeSpent}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Learning Journeys */}
          <Card data-testid="card-learning-journeys">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Learning Journeys
              </CardTitle>
              <CardDescription>
                Your enrolled learning paths and progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {journeysLoading ? (
                <div className="space-y-3" aria-busy={true} aria-live="polite">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : userJourneys && userJourneys.length > 0 ? (
                <div className="space-y-3">
                  {userJourneys.map((userJourney) => (
                    <div
                      key={userJourney.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      data-testid={`journey-${userJourney.journeyId}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium">{userJourney.journey?.title || 'Learning Journey'}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {userJourney.journey?.description}
                          </p>
                        </div>
                        {userJourney.completedAt && (
                          <Badge variant="default" className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                        {userJourney.journey?.difficulty && (
                          <Badge variant="secondary" className="capitalize">
                            {userJourney.journey.difficulty}
                          </Badge>
                        )}
                        {userJourney.journey?.estimatedDuration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {userJourney.journey.estimatedDuration}
                          </span>
                        )}
                        <span className="ml-auto">
                          Last accessed {formatDistanceToNow(new Date(userJourney.lastAccessedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No learning journeys started yet</p>
                  <p className="text-sm mt-2">Start a learning path to track your progress!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Favorites Tab */}
        <TabsContent value="favorites">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                Your Favorites
              </CardTitle>
              <CardDescription>
                Resources you've marked as favorites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {favoritesLoading ? (
                  <div className="space-y-3" aria-busy={true} aria-live="polite">
                    {Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : favorites && favorites.length > 0 ? (
                  <div className="space-y-3">
                    {favorites.map((favorite) => (
                      <div
                        key={favorite.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{favorite.resourceName}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {favorite.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Added {formatDistanceToNow(new Date(favorite.addedAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <FavoriteButton
                              resourceId={favorite.resourceId}
                              isFavorited={true}
                              size="sm"
                              showCount={false}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a href={favorite.resourceUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No favorites yet</p>
                    <p className="text-sm mt-2">Start exploring and favorite resources you like!</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bookmarks Tab */}
        <TabsContent value="bookmarks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-cyan-500" />
                Your Bookmarks
              </CardTitle>
              <CardDescription>
                Resources you've saved for later
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {bookmarksLoading ? (
                  <div className="space-y-3" aria-busy={true} aria-live="polite">
                    {Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : bookmarks && bookmarks.length > 0 ? (
                  <div className="space-y-3">
                    {bookmarks.map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{bookmark.resourceName}</h4>
                            {bookmark.notes && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {bookmark.notes}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {bookmark.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Added {formatDistanceToNow(new Date(bookmark.addedAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <BookmarkButton
                              resourceId={bookmark.resourceId}
                              isBookmarked={true}
                              notes={bookmark.notes}
                              size="sm"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a href={bookmark.resourceUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No bookmarks yet</p>
                    <p className="text-sm mt-2">Save resources to read later!</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Submissions Tab */}
        <TabsContent value="submissions" data-testid="tab-submissions">
          <div className="space-y-4">
            {/* Submitted Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-pink-500" />
                  Submitted Resources
                </CardTitle>
                <CardDescription>
                  Resources you've submitted for review
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  {submissionsLoading ? (
                    <div className="space-y-3" aria-busy={true} aria-live="polite">
                      {Array(2).fill(0).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : submissions && submissions.resources.length > 0 ? (
                    <div className="space-y-3">
                      {submissions.resources.map((resource) => (
                        <div
                          key={resource.id}
                          className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          data-testid={`submitted-resource-${resource.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium truncate">{resource.title}</h4>
                                {resource.status === 'pending' && (
                                  <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                                {resource.status === 'approved' && (
                                  <Badge variant="outline" className="text-green-500 border-green-500">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Approved
                                  </Badge>
                                )}
                                {resource.status === 'rejected' && (
                                  <Badge variant="outline" className="text-red-500 border-red-500">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Rejected
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {resource.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  {resource.category}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Submitted {formatDistanceToNow(new Date(resource.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              data-testid={`button-view-resource-${resource.id}`}
                            >
                              <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No submitted resources</p>
                      <p className="text-sm mt-2">Submit a resource to get started!</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Suggested Edits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-cyan-500" />
                  Suggested Edits
                </CardTitle>
                <CardDescription>
                  Your edit suggestions for existing resources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  {submissionsLoading ? (
                    <div className="space-y-3" aria-busy={true} aria-live="polite">
                      {Array(2).fill(0).map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                      ))}
                    </div>
                  ) : submissions && submissions.edits.length > 0 ? (
                    <div className="space-y-3">
                      {submissions.edits.map((edit) => (
                        <div
                          key={edit.id}
                          className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          data-testid={`suggested-edit-${edit.id}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium">Edit #{edit.id}</span>
                                {edit.status === 'pending' && (
                                  <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                                {edit.status === 'approved' && (
                                  <Badge variant="outline" className="text-green-500 border-green-500">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Approved
                                  </Badge>
                                )}
                                {edit.status === 'rejected' && (
                                  <Badge variant="outline" className="text-red-500 border-red-500">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Rejected
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm space-y-1">
                                {edit.proposedChanges && (
                                  <div className="mt-2 space-y-1">
                                    <p className="text-xs text-muted-foreground font-medium">Changes:</p>
                                    {Object.entries(edit.proposedChanges as Record<string, any>).map(([field, changeData]) => {
                                      // Handle both formats: direct values or {old, new} objects
                                      const isObjectFormat = changeData && typeof changeData === 'object' && ('old' in changeData || 'new' in changeData);
                                      
                                      if (!isObjectFormat) return null;
                                      
                                      const change = changeData as { old?: any; new?: any };
                                      const oldValue = Array.isArray(change.old) ? change.old.join(', ') : String(change.old ?? '');
                                      const newValue = Array.isArray(change.new) ? change.new.join(', ') : String(change.new ?? '');
                                      
                                      return (
                                        <div key={field} className="text-xs pl-2">
                                          <span className="text-pink-500">{field}:</span>{' '}
                                          <span className="line-through opacity-60">{oldValue}</span>
                                          {' → '}
                                          <span className="text-cyan-500">{newValue}</span>
                                        </div>
                                      );
                                    }).filter(Boolean)}
                                  </div>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Submitted {formatDistanceToNow(new Date(edit.createdAt), { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Edit className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No suggested edits</p>
                      <p className="text-sm mt-2">Help improve resources by suggesting edits!</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
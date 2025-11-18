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
  Star
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
          <Button variant="outline" size="sm" onClick={logout}>
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
          <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
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
                <div className="space-y-3">
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

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest interactions with resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground text-center py-8">
                No recent activity to show
              </div>
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
                  <div className="space-y-3">
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
                  <div className="space-y-3">
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
      </Tabs>
    </div>
  );
}
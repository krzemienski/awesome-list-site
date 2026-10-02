import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getInitials } from "@/lib/utils";
import { usePopstateParams, writeFilterParams } from "@/lib/url-filter-state";
import {
  queryUnavailableReason,
  type QueryUnavailableReason,
} from "@/lib/query-availability";
import { hasVisibleChars } from "@shared/validation";
import { useToast } from "@/hooks/use-toast";
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
  ArrowRight,
  ExternalLink,
  Star,
  FileText,
  Pencil,
  BookOpen,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import FavoriteButton from "@/components/resource/FavoriteButton";
import BookmarkButton from "@/components/resource/BookmarkButton";
import AIRecommendationsPanel from "@/components/ui/ai-recommendations-panel";
import AccountSecurityCard from "@/components/profile/AccountSecurityCard";
import ContinueLearningPreview from "@/components/learning/ContinueLearningPreview";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { useLocation, Link } from "wouter";
import SEOHead from "@/components/layout/SEOHead";
import "@/styles/pages/account.css";

interface ProfileProps {
  user?: any;
}

interface Favorite {
  id: number;
  title: string;
  url: string;
  category: string;
  favoritedAt: string;
}

interface BookmarkItem {
  id: number;
  title: string;
  url: string;
  category: string;
  notes?: string;
  bookmarkedAt: string;
}

interface LearningProgress {
  totalResources: number;
  completedResources: number;
  currentPath?: string;
  streakDays: number;
  totalTimeSpent: string;
  skillLevel: string;
}

interface ContributorSummaryResponse {
  summary: {
    total: number;
    pending: number;
    acceptedContributions: number;
    publicResources: number;
    recordedViews: number;
  };
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

const PROFILE_TABS = ["overview", "favorites", "bookmarks", "submissions", "security"];

// Stands in for a list or summary that couldn't be fetched, so the page never
// claims "No favorites yet" or zero counts it hasn't actually loaded.
function UnavailableNotice({
  reason,
  subject,
  onRetry,
}: {
  reason: QueryUnavailableReason;
  subject: string;
  onRetry: () => void;
}) {
  return (
    <Alert variant={reason === "error" ? "destructive" : "default"} data-testid={`profile-${reason}`}>
      <AlertTitle>
        {reason === "offline" ? "You’re offline" : `Couldn’t load your ${subject}`}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        {reason === "offline" && (
          <p>Your {subject} will load when your connection is back.</p>
        )}
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function readProfileTab(params: URLSearchParams): string {
  const tab = params.get("tab");
  return tab && PROFILE_TABS.includes(tab) ? tab : "overview";
}

export default function Profile({ user }: ProfileProps) {
  // Run17 BUG-055: /favorites redirects here with ?tab=favorites — honor a
  // valid ?tab= on first render so the link lands on the right collection.
  const [activeTab, setActiveTab] = useState(() =>
    readProfileTab(new URLSearchParams(window.location.search)),
  );
  // Tab clicks write ?tab= (push) so reload/share restore the tab and Back
  // steps through tab changes, matching the shared URL-state convention.
  const handleTabChange = (next: string) => {
    setActiveTab(next);
    writeFilterParams({ tab: next === "overview" ? null : next });
  };
  usePopstateParams((params) => setActiveTab(readProfileTab(params)));
  const { logout, logoutAll, logoutError, isLoggingOut } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Run15 BUG-049: self-service display-name edit.
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  // Run17 BUG-011: inline validation message (empty save is rejected, not
  // silently fallen back to the email local-part).
  const [nameError, setNameError] = useState<string | null>(null);
  // The dialog has no DialogTrigger, so Radix can't return focus on close.
  const editNameButtonRef = useRef<HTMLButtonElement>(null);

  const openNameDialog = () => {
    // Best-effort prefill from the combined display name.
    const parts = (user?.name || "").trim().split(/\s+/);
    setEditFirstName(parts[0] === user?.email?.split("@")[0] ? "" : parts[0] || "");
    setEditLastName(parts.slice(1).join(" "));
    setNameError(null);
    setNameDialogOpen(true);
  };

  const handleSaveName = () => {
    if (!editFirstName.trim() && !editLastName.trim()) {
      setNameError("Enter at least a first or last name.");
      return;
    }
    // Run21 R4-049/077: a zero-width-only name would render as an invisible
    // identity — reject inline with an explicit message (the server enforces
    // the same rule via the shared validator).
    // BUG-062 (run25): compare against the RAW value, not trim() — a
    // whitespace-only field is non-empty input with no visible characters
    // and used to silently clear the stored name under a success toast.
    // Only a genuinely empty field means "clear this name".
    if (
      (editFirstName !== "" && !hasVisibleChars(editFirstName)) ||
      (editLastName !== "" && !hasVisibleChars(editLastName))
    ) {
      setNameError("Name must contain visible characters.");
      return;
    }
    setNameError(null);
    updateNameMutation.mutate();
  };

  const updateNameMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/user/profile", {
        method: "PATCH",
        body: JSON.stringify({
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setNameDialogOpen(false);
      toast({ title: "Name updated", description: "Your display name has been saved." });
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't update name",
        description: err?.message?.replace(/^\d+:\s*/, "") || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Run22 BUG-020: private account/data-deletion request channel — no public
  // GitHub issue (and no personal data exposure) required.
  const [deletionDialogOpen, setDeletionDialogOpen] = useState(false);

  const requestDeletionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/user/deletion-request", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setDeletionDialogOpen(false);
      toast({
        title: "Deletion request submitted",
        description:
          "A maintainer will process your request privately. You can withdraw it any time before it's processed.",
      });
    },
    onError: (err: any) => {
      setDeletionDialogOpen(false);
      toast({
        title: "Couldn't submit deletion request",
        description: err?.message?.replace(/^\d+:\s*/, "") || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const withdrawDeletionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/user/deletion-request", { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Deletion request withdrawn",
        description: "Your account will not be deleted.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't withdraw request",
        description: err?.message?.replace(/^\d+:\s*/, "") || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Fetch favorites
  const favoritesQuery = useQuery<Favorite[]>({
    queryKey: ['/api/favorites'],
    enabled: !!user
  });

  // Fetch bookmarks
  const bookmarksQuery = useQuery<BookmarkItem[]>({
    queryKey: ['/api/bookmarks'],
    enabled: !!user
  });

  // Fetch learning progress
  const progressQuery = useQuery<LearningProgress>({
    queryKey: ['/api/user/progress'],
    enabled: !!user
  });

  // Compact contribution summary. The full filtered timeline lives at
  // /contributions so profile no longer maintains two divergent lists.
  const contributionsQuery = useQuery<ContributorSummaryResponse>({
    queryKey: ['/api/user/contributions?limit=1'],
    enabled: !!user
  });

  // Fetch user's learning journeys
  const { data: userJourneys, isLoading: journeysLoading } = useQuery<UserJourney[]>({
    queryKey: ['/api/user/journeys'],
    enabled: !!user
  });

  const { data: favorites, isLoading: favoritesLoading } = favoritesQuery;
  const { data: bookmarks, isLoading: bookmarksLoading } = bookmarksQuery;
  const { data: contributions, isLoading: contributionsLoading } = contributionsQuery;
  const { data: progress, isLoading: progressLoading } = progressQuery;
  const progressUnavailable = queryUnavailableReason(progressQuery);
  const favoritesUnavailable = queryUnavailableReason(favoritesQuery);
  const bookmarksUnavailable = queryUnavailableReason(bookmarksQuery);
  const contributionsUnavailable = queryUnavailableReason(contributionsQuery);

  const stats = [
    {
      label: "Favorites",
      value: favorites ? favorites.length : "—",
      icon: Heart,
      color: "text-primary"
    },
    {
      label: "Bookmarks",
      value: bookmarks ? bookmarks.length : "—",
      icon: Bookmark,
      color: "text-primary"
    },
    {
      label: "Learning Streak",
      value: progress ? `${progress.streakDays || 0}d` : "—",
      icon: Trophy,
      color: "account-stat--secondary",
      // BUG-052 (run14): streak counts consecutive days signed in, not
      // resources viewed — say so, or "2d streak / 0 viewed" reads broken.
      hint: "Consecutive days signed in",
    },
    {
      // Run15 BUG-017: the server counts completed learning journeys here,
      // not viewed resources — label it honestly.
      label: "Journeys Completed",
      value: progress ? progress.completedResources || 0 : "—",
      icon: Target,
      color: "account-stat--accent",
      hint: "Learning journeys finished",
    }
  ];

  if (!user) {
    return (
      <div className="account-page account-page--form py-8 px-4 text-center">
        <p className="text-muted-foreground">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="account-page account-page--wide py-8 px-4">
      <SEOHead
        title="Profile"
        description="Your Awesome Video profile, bookmarks, and learning progress."
        noindex
      />
      {/* Header */}
      {/* R5-026 (run24): in the 640–1024 band the single-row layout squeezed
          the identity column to nothing (name invisible) and let the email
          text run under the Settings/Logout buttons. sm:flex-wrap +
          basis-full on the actions row gives the buttons their OWN row in
          that band; from lg the original one-row layout returns. */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap lg:flex-nowrap items-center gap-6 mb-8">
        <Avatar
          className="account-avatar h-24 w-24"
        >
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback
            className="account-avatar-fallback text-xl font-display font-medium tracking-tight"
          >
            {getInitials(user.name, user.email)}
          </AvatarFallback>
        </Avatar>

        {/* R4-040: min-w-0 lets this column shrink (so the long name truncates)
            instead of shoving the Settings/Logout buttons off-viewport in the
            768–812px tablet band. */}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <div className="eyebrow mb-2" aria-hidden>// Profile</div>
          <h1 className="display-h text-3xl sm:text-4xl mb-2 flex items-center gap-2 justify-center sm:justify-start min-w-0">
            {/* Run17 BUG-012: truncate — CSS defense for names at the 50-char cap */}
            <span className="truncate">{user.name || "User"}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Edit display name"
              data-testid="button-edit-name"
              ref={editNameButtonRef}
              onClick={openNameDialog}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </h1>
          <div className="account-profile-meta flex flex-wrap items-center gap-4 text-sm justify-center sm:justify-start">
            {user.email && (
              <span className="flex items-center gap-1 min-w-0 max-w-full">
                <Mail className="h-4 w-4 shrink-0" />
                {/* R5-026 (run24): long emails must wrap inside the column,
                    never overflow under the action buttons. */}
                <span className="break-all">{user.email}</span>
              </span>
            )}
            {user.createdAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
              </span>
            )}
            {progress?.skillLevel && (
              <Badge variant="chip" className="capitalize">
                {progress.skillLevel}
              </Badge>
            )}
          </div>
        </div>
        
        {/* R4-040: shrink-0 keeps the buttons at full size and flex-wrap lets
            them drop below the header (never clip off-viewport) in the
            768–812px tablet band. */}
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start lg:justify-end shrink-0 sm:basis-full lg:basis-auto">
          {/* Run15 BUG-005: Settings was a dead button. R4-046: route it to the
              /settings hub (account/appearance/security) rather than dropping
              users straight onto the theme-only page. */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/settings")}
            data-testid="button-profile-settings"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" size="sm" onClick={() => logout()} disabled={isLoggingOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={isLoggingOut}
                data-testid="button-logout-all"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out all devices
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent data-testid="dialog-logout-all-confirm">
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out on every device?</AlertDialogTitle>
                <AlertDialogDescription>
                  This ends every session for this account, including this one.
                  You will need to sign in again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-logout-all-cancel">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => logoutAll()}
                  data-testid="button-logout-all-confirm"
                >
                  Sign out all devices
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {logoutError ? (
          <Alert
            variant="destructive"
            className="sm:basis-full"
            data-testid="profile-logout-error"
          >
            <AlertTitle>Sign out failed</AlertTitle>
            <AlertDescription>{logoutError}</AlertDescription>
          </Alert>
        ) : null}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          // NB-041 (run18): a "0d" streak reads as broken for new users — show
          // onboarding copy instead of the empty number.
          const isEmptyStreak =
            stat.label === "Learning Streak" && !!progress && !progress.streakDays;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <Icon className={`h-8 w-8 ${stat.color}`} />
                <div>
                  {isEmptyStreak ? (
                    <>
                      <p className="text-sm font-semibold" data-testid="text-streak-onboarding">
                        Start your streak — come back tomorrow!
                      </p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      {/* BUG-052 (run14): explain what feeds the metric. */}
                      {"hint" in stat && stat.hint && (
                        <p className="account-stat-hint" data-testid={`stat-hint-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                          {stat.hint}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        {/* Run17 BUG-014: fixed 5-col grid garbled/clipped labels at ≤768px —
            wrap on small screens, grid only from lg up. */}
        <TabsList className="w-full flex flex-wrap justify-start lg:grid lg:grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
          <TabsTrigger value="bookmarks">Bookmarks</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
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
              ) : progressUnavailable ? (
                <UnavailableNotice
                  reason={progressUnavailable}
                  subject="learning progress"
                  onRetry={() => void progressQuery.refetch()}
                />
              ) : (
                <div className="space-y-4">
                  {/* Progress Bar — Run15 BUG-017: the server metric counts
                      completed learning journeys, and "0 / 1822 resources"
                      read as broken. Compare journeys completed vs journeys
                      started instead. */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Journeys Completed</span>
                      {/* BUG-063 (run25): "1 / 5 started" read as "1 of 5
                          started" (an enrollment count) when the numerator is
                          COMPLETED journeys and the denominator is STARTED
                          ones. Spell both units out. */}
                      <span className="font-medium" data-testid="text-journeys-progress">
                        {progress?.completedResources || 0} completed of {userJourneys?.length || 0} started
                      </span>
                    </div>
                    <div className="account-progress h-2">
                      <div
                        className="account-progress-fill h-full"
                        style={{
                          width: `${((progress?.completedResources || 0) / (userJourneys?.length || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Current Learning Path */}
                  {progress?.currentPath && (
                    <div className="account-profile-callout p-4">
                      <p className="text-sm font-medium mb-1">Current Learning Path</p>
                      <p className="text-lg">{progress.currentPath}</p>
                    </div>
                  )}

                  {/* Time Spent — Run22 BUG-043: server computes estimated
                      learning time from journey estimated_duration × completed
                      step fraction (no wall-clock tracking exists), so the
                      label says "estimated" and the row hides at zero instead
                      of pinning a hardcoded "0h 0m". */}
                  {progress?.totalTimeSpent && progress.totalTimeSpent !== '0h 0m' && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {/* BUG-063 (run25): this is a SUM over every started
                          journey — say so, or it reads as the current path's
                          duration and contradicts the journey's own label. */}
                      <span>Estimated learning time across your journeys: {progress.totalTimeSpent}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compact resume module backed by the same server summary as the
              dedicated dashboard. It only mounts on this authenticated page. */}
          <ContinueLearningPreview />

          {/* Same server-authoritative response and feedback mutation path used
              on Home, Recommendations, and Advanced. */}
          <div data-testid="card-recommendations">
            <AIRecommendationsPanel />
          </div>
        </TabsContent>

        {/* Favorites Tab */}
        <TabsContent value="favorites">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Your Favorites
              </CardTitle>
              <CardDescription>
                Resources you've marked as favorites
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea
                className="h-[400px] pr-4"
                // C3-V4-01: NB-018 — without this the table box sizes to the
                // row's content and clips the trailing actions at 390px.
                viewportClassName="[&>div]:!block [&>div]:!w-full [&>div]:!min-w-0"
              >
                {favoritesLoading ? (
                  <div className="space-y-3" aria-busy={true} aria-live="polite">
                    {Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : favoritesUnavailable ? (
                  <UnavailableNotice
                    reason={favoritesUnavailable}
                    subject="favorites"
                    onRetry={() => void favoritesQuery.refetch()}
                  />
                ) : favorites && favorites.length > 0 ? (
                  <div className="space-y-3">
                    {favorites.map((favorite) => (
                      <div
                        key={favorite.id}
                        className="account-list-item p-3"
                      >
                        {/* C5-V4-01: below sm the category/date row spans the
                            full width under the actions; in the narrow title
                            column the nowrap chip ran under Remove. */}
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2">
                          <div className="min-w-0">
                            {/* Run15 BUG-006: title links to the in-app resource page. */}
                            <h4 className="font-medium truncate">
                              <Link
                                href={`/resource/${favorite.id}`}
                                className="inline-block max-w-full truncate align-middle min-h-[32px] leading-8 hover:underline"
                                data-testid={`link-favorite-${favorite.id}`}
                              >
                                {favorite.title}
                              </Link>
                            </h4>
                          </div>
                          <div className="flex items-center gap-1 sm:row-span-2">
                            <FavoriteButton
                              resourceId={String(favorite.id)}
                              isFavorited={true}
                              size="sm"
                              showCount={false}
                              resourceTitle={favorite.title}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a
                                href={favorite.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Open ${favorite.title} in a new tab`}
                              >
                                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                              </a>
                            </Button>
                          </div>
                          <div className="col-span-2 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 sm:col-span-1">
                            <Badge variant="secondary" className="max-w-full whitespace-normal text-xs">
                              {favorite.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Added {formatDistanceToNow(new Date(favorite.favoritedAt), { addSuffix: true })}
                            </span>
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
                <Bookmark className="h-5 w-5 text-muted-foreground" />
                Your Bookmarks
              </CardTitle>
              <CardDescription>
                Resources you've saved for later
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea
                className="h-[400px] pr-4"
                // C3-V4-01: NB-018 — without this the table box sizes to the
                // row's content and clips the trailing actions at 390px.
                viewportClassName="[&>div]:!block [&>div]:!w-full [&>div]:!min-w-0"
              >
                {bookmarksLoading ? (
                  <div className="space-y-3" aria-busy={true} aria-live="polite">
                    {Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : bookmarksUnavailable ? (
                  <UnavailableNotice
                    reason={bookmarksUnavailable}
                    subject="bookmarks"
                    onRetry={() => void bookmarksQuery.refetch()}
                  />
                ) : bookmarks && bookmarks.length > 0 ? (
                  <div className="space-y-3">
                    {bookmarks.map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className="account-list-item p-3"
                      >
                        {/* C5-V4-01: same layout as the Favorites rows above. */}
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2">
                          <div className="min-w-0">
                            {/* Run15 BUG-006: title links to the in-app resource page. */}
                            <h4 className="font-medium truncate">
                              <Link
                                href={`/resource/${bookmark.id}`}
                                className="inline-block max-w-full truncate align-middle min-h-[32px] leading-8 hover:underline"
                                data-testid={`link-bookmark-${bookmark.id}`}
                              >
                                {bookmark.title}
                              </Link>
                            </h4>
                            {bookmark.notes && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {bookmark.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 sm:row-span-2">
                            <BookmarkButton
                              resourceId={String(bookmark.id)}
                              isBookmarked={true}
                              notes={bookmark.notes}
                              size="sm"
                              resourceTitle={bookmark.title}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a
                                href={bookmark.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Open ${bookmark.title} in a new tab`}
                              >
                                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                              </a>
                            </Button>
                          </div>
                          <div className="col-span-2 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 sm:col-span-1">
                            <Badge variant="secondary" className="max-w-full whitespace-normal text-xs">
                              {bookmark.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Added {formatDistanceToNow(new Date(bookmark.bookmarkedAt), { addSuffix: true })}
                            </span>
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

        {/* Contributions Tab */}
        <TabsContent value="submissions" data-testid="tab-submissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Contribution impact
              </CardTitle>
              <CardDescription>
                Resource submissions and edit suggestions now share one private timeline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {contributionsLoading ? (
                <div className="grid gap-3 sm:grid-cols-3" aria-busy="true" aria-label="Loading contribution summary">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 w-full" />
                  ))}
                </div>
              ) : contributionsUnavailable ? (
                <UnavailableNotice
                  reason={contributionsUnavailable}
                  subject="contribution summary"
                  onRetry={() => void contributionsQuery.refetch()}
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ["Accepted", contributions?.summary.acceptedContributions ?? 0, "Approved submissions and edits"],
                    ["Awaiting review", contributions?.summary.pending ?? 0, "Still pending moderation"],
                    ["Live resources", contributions?.summary.publicResources ?? 0, "Public resources you improved"],
                  ].map(([label, value, hint]) => (
                    <div key={label} className="account-profile-metric p-4">
                      <p className="font-mono text-2xl font-semibold tabular-nums">{value}</p>
                      <p className="mt-1 text-sm font-medium">{label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="account-profile-divider flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Review statuses, outcomes, submitted details, and recorded impact.
                </p>
                <Button asChild data-testid="link-open-contributions">
                  <Link href="/contributions">
                    Open contribution dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" data-testid="tab-security">
          <div className="space-y-6">
            <AccountSecurityCard />

            {/* Run22 BUG-020: private account/data-deletion request — no
                public GitHub issue (or personal-data exposure) required. */}
            <Card data-testid="card-account-deletion">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Delete account &amp; data
                </CardTitle>
                <CardDescription>
                  Request permanent deletion of your account and personal data.
                  Requests are handled privately by a maintainer — nothing is
                  posted publicly.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {user?.deletionRequestedAt ? (
                  <>
                    <p className="text-sm" data-testid="text-deletion-pending">
                      Your deletion request from{" "}
                      {new Date(user.deletionRequestedAt).toLocaleDateString()}{" "}
                      is pending. A maintainer will process it privately. You
                      can withdraw it any time before then.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => withdrawDeletionMutation.mutate()}
                      aria-disabled={withdrawDeletionMutation.isPending}
                      onClickCapture={(e) => {
                        if (withdrawDeletionMutation.isPending) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      data-testid="button-withdraw-deletion"
                    >
                      {withdrawDeletionMutation.isPending
                        ? "Withdrawing…"
                        : "Withdraw deletion request"}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Approved resources you submitted stay in the directory
                      but are detached from your identity.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => setDeletionDialogOpen(true)}
                      data-testid="button-request-deletion"
                    >
                      Request account deletion
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <AlertDialog open={deletionDialogOpen} onOpenChange={setDeletionDialogOpen}>
            <AlertDialogContent data-testid="dialog-deletion-confirm">
              <AlertDialogHeader>
                <AlertDialogTitle>Request account deletion?</AlertDialogTitle>
                <AlertDialogDescription>
                  This submits a private deletion request for your account and
                  personal data. A maintainer will process it; you can withdraw
                  the request any time before it's completed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-deletion-cancel">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => requestDeletionMutation.mutate()}
                  aria-disabled={requestDeletionMutation.isPending}
                  data-testid="button-deletion-confirm"
                >
                  {requestDeletionMutation.isPending
                    ? "Submitting…"
                    : "Request deletion"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>
      </Tabs>

      {/* Run15 BUG-049: display-name edit dialog */}
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            editNameButtonRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit display name</DialogTitle>
            <DialogDescription>
              This is the name shown on your profile. Enter at least a first or
              last name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-first-name">First name</Label>
              <Input
                id="edit-first-name"
                value={editFirstName}
                maxLength={50}
                onChange={(e) => setEditFirstName(e.target.value)}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "edit-name-error" : undefined}
                data-testid="input-first-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-last-name">Last name</Label>
              <Input
                id="edit-last-name"
                value={editLastName}
                maxLength={50}
                onChange={(e) => setEditLastName(e.target.value)}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "edit-name-error" : undefined}
                data-testid="input-last-name"
              />
            </div>
            {nameError && (
              <p
                id="edit-name-error"
                className="text-sm text-destructive"
                role="alert"
                data-testid="text-name-error"
              >
                {nameError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNameDialogOpen(false)}
              disabled={updateNameMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveName}
              disabled={updateNameMutation.isPending}
              data-testid="button-save-name"
            >
              {updateNameMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

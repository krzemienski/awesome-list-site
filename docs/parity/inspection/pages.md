# Phase 0 pages inventory

## Assigned complete-read scope
client/src/pages/About.tsx
client/src/pages/AdminDashboard.tsx
client/src/pages/Advanced.tsx
client/src/pages/BookmarksGate.tsx
client/src/pages/Bookmarks.tsx
client/src/pages/Categories.tsx
client/src/pages/Category.tsx
client/src/pages/CodeOfConduct.tsx
client/src/pages/ContinueLearning.tsx
client/src/pages/Contributions.tsx
client/src/pages/DesignSystemShowcase.tsx
client/src/pages/ErrorPage.tsx
client/src/pages/GuestBookmarks.tsx
client/src/pages/Home.tsx
client/src/pages/JourneyDetail.tsx
client/src/pages/Journeys.tsx
client/src/pages/not-found.tsx
client/src/pages/Notifications.tsx
client/src/pages/Onboarding.tsx
client/src/pages/Privacy.tsx
client/src/pages/Profile.tsx
client/src/pages/PublicCollection.tsx
client/src/pages/Recommendations.tsx
client/src/pages/ResourceDetail.tsx
client/src/pages/Search.tsx
client/src/pages/Settings.tsx
client/src/pages/Subcategory.tsx
client/src/pages/SubmitResource.tsx
client/src/pages/SubSubcategory.tsx
client/src/pages/TagLanding.tsx
client/src/pages/TaxonomyListing.tsx
client/src/pages/Terms.tsx
client/src/pages/ThemeSettings.tsx

## App route declarations (source line context)
18:import ErrorPage from "@/pages/ErrorPage";
20:import AdminGuard from "@/components/auth/AdminGuard";
21:import AuthGuard from "@/components/auth/AuthGuard";
24:import NotFound from "@/pages/not-found";
70:function RouteFallback() {
137:class RouteErrorBoundary extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
140:  static getDerivedStateFromError(error: Error): Partial<RouteErrorBoundaryState> {
311:const KNOWN_ROUTE_PATTERNS: RegExp[] = [
373:  return <Redirect to={`${to}${suffix}`} replace />;
376:function SignInPage() {
393:function SignUpPage() {
516:  const isKnownRoute = KNOWN_ROUTE_PATTERNS.some((re) => re.test(location));
524:    <RouteErrorBoundary location={location}>
578:    return <ErrorPage error={error} />;
584:  // /api/auth/user. Auth-gated routes are safe because AuthGuard/AdminGuard
595:        <NotFound />
626:      <RouteErrorBoundary location={location}>
627:      <Suspense fallback={<RouteFallback />}>
629:        <Route path="/" component={() => {
631:          if (q && q.trim()) return <Redirect to={`/search?q=${encodeURIComponent(q.trim())}`} replace />;
636:        <Route path="/sign-in/*?" component={SignInPage} />
637:        <Route path="/sign-up/*?" component={SignUpPage} />
638:        <Route path="/logout" component={Logout} />
640:        <Route path="/login" component={() => <LegacyAuthRedirect to="/sign-in" />} />
641:        <Route path="/register" component={() => <LegacyAuthRedirect to="/sign-up" />} />
642:        <Route path="/forgot-password" component={() => <LegacyAuthRedirect to="/sign-in" />} />
643:        <Route path="/reset-password" component={() => <LegacyAuthRedirect to="/sign-in" />} />
644:        <Route path="/auth/login" component={() => <LegacyAuthRedirect to="/sign-in" />} />
645:        <Route path="/auth/register" component={() => <LegacyAuthRedirect to="/sign-up" />} />
646:        <Route path="/signup" component={() => <LegacyAuthRedirect to="/sign-up" />} />
647:        <Route path="/explore">
648:          <Redirect to="/search" replace />
650:        <Route path="/resource" component={() => {
652:          return <Redirect to={q && q.trim() ? `/search?q=${encodeURIComponent(q.trim())}` : "/search"} replace />;
654:        <Route path="/category/:slug/:subSlug">
655:          {(params) => <Redirect to={`/subcategory/${params.subSlug}`} replace />}
657:        <Route path="/category/:slug" component={Category} />
658:        <Route path="/tag">
659:          <Redirect to="/categories" replace />
661:        <Route path="/tag/:slug" component={TagLanding} />
662:        <Route path="/categories" component={() => (
670:        <Route path="/category">
671:          <Redirect to="/" replace />
673:        <Route path="/subcategory/:slug" component={Subcategory} />
674:        <Route path="/recommendations" component={Recommendations} />
675:        <Route path="/search" component={Search} />
676:        <Route path="/sub-subcategory/:slug" component={SubSubcategory} />
677:        <Route path="/subsubcategory/:slug">
678:          {(params) => <Redirect to={`/sub-subcategory/${params.slug}`} replace />}
680:        <Route path="/resource/:id" component={ResourceDetail} />
681:        <Route path="/about" component={About} />
682:        <Route path="/terms" component={Terms} />
683:        <Route path="/privacy" component={Privacy} />
684:        <Route path="/code-of-conduct" component={CodeOfConduct} />
685:        <Route path="/advanced" component={Advanced} />
686:        <Route path="/submit" component={SubmitResource} />
687:        <Route path="/journeys" component={Journeys} />
688:        <Route path="/journey/:id" component={JourneyDetail} />
689:        <Route path="/continue-learning" component={ContinueLearning} />
690:        <Route path="/journey">
691:          <Redirect to="/journeys" replace />
693:        <Route path="/collection/:shareId">
696:        <Route path="/profile" component={() => (<AuthGuard><Profile user={user} /></AuthGuard>)} />
697:        <Route path="/contributions" component={() => (<AuthGuard><Contributions /></AuthGuard>)} />
698:        <Route path="/bookmarks" component={BookmarksGate} />
699:        <Route path="/notifications" component={() => (
700:          <AuthGuard>
702:          </AuthGuard>
706:        <Route path="/favorites">
707:          <Redirect to="/profile?tab=favorites" replace />
709:        <Route path="/account">
710:          <Redirect to="/profile" replace />
712:        <Route path="/admin" component={() => (
713:          <AdminGuard>
714:            <Suspense fallback={<RouteFallback />}>
717:          </AdminGuard>
721:        <Route path="/admin/:section" component={() => (
722:          <AdminGuard>
723:            <Suspense fallback={<RouteFallback />}>
726:          </AdminGuard>
728:        <Route path="/settings/theme" component={ThemeSettings} />
729:        <Route path="/design-system" component={DesignSystemShowcase} />
730:        <Route path="/settings" component={Settings} />
731:        <Route path="/onboarding" component={() => (
732:          <AuthGuard>
734:          </AuthGuard>
736:        <Route>
737:          <NotFound />
828:      <Router />

## Page exports and key selectors
### client/src/pages/About.tsx
27:export default function About() {
31:    queryKey: ["awesome-list-data"],
103:                data-testid="link-about-deletion"
117:                data-testid="link-about-github-issues"
### client/src/pages/AdminDashboard.tsx
63:export default function AdminDashboard() {
64:  const { stats, isLoading, error } = useAdmin();
65:  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
144:              <p className="text-sm text-[var(--text)] mb-3" data-testid="text-admin-forbidden">
149:              <WLink href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] underline" data-testid="link-admin-home">
158:              <WLink href="/sign-in" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] underline" data-testid="link-admin-login">
168:  if (isLoading) {
192:              <p className="text-[var(--text)] mb-3" data-testid="text-session-expired">
198:                data-testid="link-session-expired-login"
233:      <AdminStats stats={stats} isLoading={isLoading} onNavigate={handleTabChange} />
248:            <TabsTrigger value="approvals" className="whitespace-nowrap" data-testid="tab-approvals">
251:            <TabsTrigger value="edits" className="whitespace-nowrap" data-testid="tab-edits">
254:            <TabsTrigger value="enrichment" className="whitespace-nowrap" data-testid="tab-enrichment">
258:            <TabsTrigger value="researcher" className="whitespace-nowrap" data-testid="tab-researcher">
262:            <TabsTrigger value="export" className="whitespace-nowrap" data-testid="tab-export">Export</TabsTrigger>
263:            <TabsTrigger value="database" className="whitespace-nowrap" data-testid="tab-database">Database</TabsTrigger>
264:            <TabsTrigger value="resources" className="whitespace-nowrap" data-testid="tab-resources">Resources</TabsTrigger>
265:            <TabsTrigger value="categories" className="whitespace-nowrap" data-testid="tab-categories">Categories</TabsTrigger>
266:            <TabsTrigger value="subcategories" className="whitespace-nowrap" data-testid="tab-subcategories">Subcategories</TabsTrigger>
267:            <TabsTrigger value="subsubcategories" className="whitespace-nowrap" data-testid="tab-subsubcategories">Sub-Subcats</TabsTrigger>
268:            <TabsTrigger value="journeys" className="whitespace-nowrap" data-testid="tab-journeys">
272:            <TabsTrigger value="users" className="whitespace-nowrap" data-testid="tab-users">Users</TabsTrigger>
273:            <TabsTrigger value="github" className="whitespace-nowrap" data-testid="tab-github">GitHub</TabsTrigger>
274:            <TabsTrigger value="linkhealth" className="whitespace-nowrap" data-testid="tab-linkhealth">
278:            <TabsTrigger value="digests" className="whitespace-nowrap" data-testid="tab-digests">
282:            <TabsTrigger value="audit" className="whitespace-nowrap" data-testid="tab-audit">Audit</TabsTrigger>
288:        <TabsContent value="approvals" data-testid="content-approvals">
292:        <TabsContent value="edits" data-testid="content-edits">
296:        <TabsContent value="enrichment" data-testid="content-enrichment">
316:        <TabsContent value="categories" data-testid="content-categories">
320:        <TabsContent value="subcategories" data-testid="content-subcategories">
324:        <TabsContent value="subsubcategories" data-testid="content-subsubcategories">
328:        <TabsContent value="journeys" data-testid="content-journeys">
344:        <TabsContent value="digests" data-testid="content-digests">
### client/src/pages/Advanced.tsx
38:export default function Advanced() {
40:  // tabs serializes back to the URL (replaceState — wouter useLocation is
86:  const { data: awesomeList, isLoading, isError, refetch, isFetching } = useQuery<AwesomeList>({
87:    queryKey: ["awesome-list-data"],
94:  if (isLoading && tab !== "recommendations") {
111:  if (isError && tab !== "recommendations") {
118:          data-testid="advanced-error"
128:            onClick={() => { if (!isFetching) void refetch(); }}
130:            data-testid="button-advanced-retry"
310:                      aria-label={`Select ${item.format} export format`}
312:                      data-testid={`button-format-${item.value}`}
352:            {/* BUG-011 (run19) linked this to /search because an empty query
353:                used to browse the full catalog; audit2 BUG-019 made empty
359:              data-testid="link-browse-all-resources"
### client/src/pages/BookmarksGate.tsx
8:export default function BookmarksGate() {
9:  const { isAuthenticated, isLoading } = useAuth();
11:  if (isLoading) {
### client/src/pages/Bookmarks.tsx
110:export default function Bookmarks() {
130:    isLoading: bookmarksLoading,
133:    queryKey: ["/api/bookmarks"],
138:    isLoading: collectionsLoading,
141:    queryKey: ["/api/collections?includeArchived=true"],
147:      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] }),
148:      queryClient.invalidateQueries({ queryKey: ["/api/collections?includeArchived=true"] }),
401:        aria-label="Library summary"
434:        <aside className="hidden lg:block" aria-label="Bookmark collections">
471:                <div className="flex" aria-label={`Reorder ${collection.name}`}>
476:                    aria-label={`Move ${collection.name} up`}
486:                    aria-label={`Move ${collection.name} down`}
520:            <section className="border bg-card p-4" aria-label="Selected collection controls">
628:          <section className="grid gap-3 border bg-card p-4 sm:grid-cols-3" aria-label="Library filters">
667:            <section className="space-y-3 border bg-muted/25 p-4" aria-label="Bulk bookmark actions">
679:                    aria-label="Select all visible bookmarks"
693:                      <SelectTrigger aria-label="Bulk queue status"><SelectValue /></SelectTrigger>
711:                      <SelectTrigger aria-label="Move to collection"><SelectValue placeholder="Choose collection" /></SelectTrigger>
743:                      aria-label="Personal tag for selected bookmarks"
794:                  data-testid={`bookmark-card-${resource.id}`}
808:                        aria-label={`Select ${resource.title}`}
824:                      <SelectTrigger className="w-[9.5rem]" aria-label={`Queue status for ${resource.title}`}>
895:                  Your learning library is empty
### client/src/pages/Categories.tsx
21:  isLoading: boolean;
23:  // instead of the misleading empty state.
74:export default function Categories({ nav, isLoading, error, onRetry }: CategoriesProps) {
156:            R5-024 (run24): hidden while loading errored or the list is empty —
158:        {!error && (isLoading || categories.length > 0) && (
170:              data-testid="select-sort"
179:                  data-testid={`select-sort-${option.value}`}
197:          data-testid="categories-error-card"
208:            data-testid="button-categories-retry"
213:      ) : isLoading ? (
### client/src/pages/Category.tsx
3:export default function Category() {
### client/src/pages/CodeOfConduct.tsx
9:export default function CodeOfConduct() {
17:        <h1 className="display-h text-2xl sm:text-3xl flex items-center gap-2" data-testid="heading-code-of-conduct">
67:                data-testid="link-code-of-conduct-report"
### client/src/pages/ContinueLearning.tsx
56:    <Card className="flex h-full flex-col" data-testid={`card-active-journey-${item.journeyId}`}>
80:            aria-label={`${item.title} progress: ${item.progressPercent}%`}
81:            data-testid={`progress-active-journey-${item.journeyId}`}
102:            data-testid={`button-resume-journey-${item.journeyId}`}
122:      data-testid={`link-recent-resource-${item.resourceId}`}
163:export default function ContinueLearning() {
164:  const { isAuthenticated, isLoading: authLoading } = useAuth();
167:    isLoading,
168:    isError,
187:        <Card className="overflow-hidden text-center" data-testid="continue-learning-sign-in">
214:  if (isLoading) {
223:  if (isError || !data) {
227:        <Alert variant="destructive" data-testid="continue-learning-error">
235:              onClick={() => refetch()}
237:              data-testid="button-retry-continue-learning"
251:  const preferredCategory = data.emptyState.preferredCategories[0];
273:        <Card className="overflow-hidden" data-testid="continue-learning-empty">
283:                : data.emptyState.skillLevel
284:                  ? `Choose a ${data.emptyState.skillLevel} journey or open a resource that interests you. Your next visit will resume here.`
310:        <section aria-labelledby="active-learning-heading">
346:        <section aria-labelledby="recent-resources-heading">
365:        <section aria-labelledby="completed-learning-heading">
377:              <Card key={item.progressId} data-testid={`card-completed-journey-${item.journeyId}`}>
400:        <section aria-labelledby="suggested-learning-heading">
### client/src/pages/Contributions.tsx
237:      data-testid={`status-${status}`}
261:      data-testid={`contribution-${item.kind}-${item.id}`}
279:                <span data-testid={`changed-at-${item.kind}-${item.id}`}>
379:                  data-testid={`link-public-${item.kind}-${item.id}`}
393:                data-testid={`button-withdraw-${item.kind}-${item.id}`}
406:export default function Contributions() {
447:    queryKey: ["/api/user/contributions", queryUrl],
474:        queryKey: ["/api/user/contributions"],
487:        queryKey: ["/api/user/contributions"],
619:      <section aria-labelledby="impact-heading" className="mb-8">
643:                  {query.isLoading ? (
648:                      data-testid={`metric-${metric.label
665:      <section aria-labelledby="timeline-heading">
690:                  aria-label="Search your contributions"
692:                  data-testid="input-contributions-search"
701:                  aria-label="Filter by contribution type"
702:                  data-testid="select-contribution-type"
718:                  aria-label="Filter by status"
719:                  data-testid="select-contribution-status"
741:                  aria-label="Sort contributions"
742:                  data-testid="select-contribution-sort"
756:          <Alert className="mb-4" data-testid="notice-contribution-page-adjusted">
772:        {query.isLoading ? (
776:            aria-label="Loading contributions"
794:        ) : query.isError ? (
804:                onClick={() => query.refetch()}
806:                data-testid="button-retry-contributions"
843:                  data-testid="button-clear-contribution-filters"
854:              data-testid="text-contribution-count"
893:        <AlertDialogContent data-testid="dialog-withdraw-contribution">
912:              data-testid="button-confirm-withdraw-contribution"
### client/src/pages/DesignSystemShowcase.tsx
155:export default function DesignSystemShowcase() {
201:          data-testid="link-back-theme-settings"
208:          <h1 className="display-h text-3xl" data-testid="text-ds-title">Design System</h1>
214:          <span className="text-[color:var(--text-3)]" data-testid="text-ds-active">
221:      <section aria-label="System switcher" className="no-print space-y-4" data-testid="ds-system-switcher">
236:                data-testid={`ds-system-${id}`}
254:      <section aria-label="Accent ramp" className="no-print space-y-4" data-testid="ds-accent-ramp">
269:                data-testid={`ds-accent-${a.id}`}
293:      <section aria-label="Product profiles" className="space-y-4" data-testid="ds-product-profiles">
317:      <section aria-label="Token catalog" className="space-y-4" data-testid="ds-token-catalog">
327:            <Card key={g.group} className="p-4 sm:p-5 bg-[var(--surface)] border-[color:var(--border)]" data-testid={`ds-token-group-${g.group.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
338:                      data-testid={`ds-token-value-${t.name.replace(/^--/, "")}`}
360:      <section aria-label="Type scale" className="space-y-4" data-testid="ds-type-scale">
393:      <section aria-label="Core components" className="space-y-4" data-testid="ds-components">
398:        <p className="text-xs text-[color:var(--text-2)] -mt-2" data-testid="ds-display-only-note">
417:              <Button size="icon" variant="outline" aria-label="Icon button">
457:                <Switch checked aria-label="Example switch" /> Switch
460:                <Checkbox checked aria-label="Example checkbox" /> Checkbox
498:      <section aria-label="Skin notes" className="space-y-4" data-testid="ds-skin-notes">
### client/src/pages/ErrorPage.tsx
10:export default function ErrorPage({ error }: ErrorPageProps) {
### client/src/pages/GuestBookmarks.tsx
3:import { Link, useLocation } from "wouter";
24:export default function GuestBookmarks() {
25:  const [, setLocation] = useLocation();
50:      queryKey: [`/api/resources/${entry.id}`],
82:      queryClient.invalidateQueries({ queryKey: [`/api/resources/${id}`] });
116:              data-testid="button-guest-empty-signin"
144:        <p className="mt-2 text-muted-foreground" data-testid="text-guest-save-count">
151:        aria-label="Keep your saved resources"
153:        data-testid="banner-guest-signin-prompt"
172:              data-testid="button-guest-create-account"
180:              data-testid="button-guest-signin"
189:            data-testid="text-guest-storage-warning"
197:          <p className="mt-3 text-sm text-muted-foreground" data-testid="text-guest-cap-notice">
208:          data-testid="banner-guest-load-failed"
221:            data-testid="button-guest-retry-failed"
229:        aria-label="Saved resources"
### client/src/pages/Home.tsx
60:      aria-label={label}
61:      data-testid="home-account-feature-skeleton"
71:      aria-label="Loading filter controls"
72:      data-testid="filter-controls-skeleton"
149:export default function Home({ nav, navLoading }: HomeProps) {
154:    isLoading: preferencesLoading,
191:  // alias, comma lists, and whitespace/empty chunks all resolve identically
198:  // BUG-064 (run27): a present-but-empty tag filter (?tags=+++ or ?tags=)
201:  const [emptyTagParamNotice, setEmptyTagParamNotice] = useState(() => {
214:  // R2-M25: sort survives refresh via ?sort= URL param. wouter's useLocation()
244:    isLoading: corpusLoading,
247:    queryKey: ["awesome-list-data"],
257:    queryKey: ["/api/tags"],
337:  const isLoading = navLoading || (tagFilterActive && !awesomeList && corpusLoading);
339:  if (isLoading) {
369:          <Button onClick={() => window.location.reload()} data-testid="button-retry-catalog">
415:      {emptyTagParamNotice && selectedTags.length === 0 && (
419:          data-testid="notice-empty-tag-param"
421:          <span>The tag filter in the link you followed was empty, so it was ignored.</span>
426:            data-testid="button-dismiss-empty-tag-param"
436:          data-testid="card-onboarding-invitation"
455:                  data-testid="link-continue-onboarding"
488:                data-testid="button-dismiss-onboarding-invitation"
510:          data-testid="empty-categories"
519:            data-testid="button-clear-filters"
527:        data-testid="list-categories"
567:                    data-testid={`text-category-teaser-${category.slug}`}
587:            data-testid="link-recommendations-heading"
634:              <Button asChild variant="outline" className="w-full sm:w-auto" data-testid="button-browse-recommendations">
### client/src/pages/JourneyDetail.tsx
3:import { useParams, useLocation, Link } from "wouter";
79:export default function JourneyDetail() {
80:  const { id } = useParams<{ id: string }>();
81:  const [, setLocation] = useLocation();
86:  const { data: journey, isLoading: journeyLoading } = useQuery<Journey>({
87:    queryKey: [`/api/journeys/${id}`],
89:      const response = await fetch(`/api/journeys/${id}`);
133:      queryClient.invalidateQueries({ queryKey: [`/api/journeys/${id}`] });
134:      queryClient.invalidateQueries({ queryKey: ['/api/journeys'] });
137:      queryClient.invalidateQueries({ queryKey: ['/api/user/journeys'] });
138:      queryClient.invalidateQueries({ queryKey: ['/api/user/continue-learning'] });
199:      await queryClient.cancelQueries({ queryKey: [`/api/journeys/${id}`] });
282:      queryClient.invalidateQueries({ queryKey: [`/api/journeys/${id}`] });
283:      queryClient.invalidateQueries({ queryKey: ['/api/journeys'] });
285:      queryClient.invalidateQueries({ queryKey: ['/api/user/journeys'] });
286:      queryClient.invalidateQueries({ queryKey: ['/api/user/continue-learning'] });
358:            Journey not found. It may have been removed or archived.
427:        data-testid="button-back-to-journeys"
441:              data-testid="icon-journey-header"
447:                data-testid="badge-journey-difficulty"
456:                  data-testid="badge-journey-completed"
498:                  aria-label={`${journey.title} progress: ${progressPercent}%`}
499:                  data-testid="progress-bar-journey"
529:                  data-testid="button-login-journey"
540:              data-testid="button-start-journey"
577:                  data-testid={`card-step-${step.stepNumber}`}
628:                                    data-testid={`link-resource-${resource.id}`}
649:                                    aria-label={`Open ${resource.title} on its source site (new tab)`}
650:                                    data-testid={`link-resource-external-${resource.id}`}
687:                            data-testid={`button-complete-step-${step.stepNumber}`}
710:                            data-testid={`button-uncomplete-step-${step.stepNumber}`}
### client/src/pages/Journeys.tsx
4:import { useLocation, Link } from "wouter";
36:  // grouped-step accounting as completedStepCount); null when complete/empty.
40:export default function Journeys() {
41:  const [, setLocation] = useLocation();
64:  const { data: journeys = [], isLoading: journeysLoading } = useQuery<Journey[]>({
65:    queryKey: ['/api/journeys'],
97:      queryClient.invalidateQueries({ queryKey: ['/api/journeys'] });
98:      queryClient.invalidateQueries({ queryKey: [`/api/journeys/${journey.id}`] });
99:      queryClient.invalidateQueries({ queryKey: ['/api/user/journeys'] });
100:      queryClient.invalidateQueries({ queryKey: ['/api/user/continue-learning'] });
136:  // Get unique categories from journeys. Filter out empty/nullish values:
137:  // Radix <SelectItem> throws at render time on an empty-string value, and with
204:            <SelectTrigger className="w-full sm:w-[200px]" aria-label="Filter by category" data-testid="select-category-filter">
229:                  the H1, so the empty state and card titles are now h2s. */}
241:                data-testid="button-clear-filter"
268:                data-testid={`card-journey-${journey.id}`}
276:                      data-testid={`icon-journey-${journey.id}`}
281:                      data-testid={`badge-difficulty-${journey.id}`}
299:                      data-testid={`link-journey-title-${journey.id}`}
308:                    data-testid={`description-journey-${journey.id}`}
349:                          aria-label={`${journey.title} progress: ${progressPercent}%`}
350:                          data-testid={`progressbar-journey-${journey.id}`}
377:                    data-testid={`button-view-journey-${journey.id}`}
381:                    aria-label={`${
### client/src/pages/not-found.tsx
26:export default function NotFound({ suggestion }: NotFoundProps) {
66:                data-testid="link-did-you-mean"
83:            <Link href="/categories" data-testid="link-browse-categories">
89:            <Link href="/" data-testid="link-go-home">
### client/src/pages/Notifications.tsx
15:export default function Notifications() {
16:  const query = useQuery<NotificationResponse>({ queryKey: ["/api/notifications?limit=50"] });
21:      void queryClient.invalidateQueries({ queryKey: ["/api/notifications?limit=50"] });
28:      void queryClient.invalidateQueries({ queryKey: ["/api/notifications?limit=50"] });
38:    {query.isLoading ? <Card><CardContent className="space-y-3 p-5" aria-busy="true"><div className="skeleton h-20 w-full" /><div className="skeleton h-20 w-full" /><div className="skeleton h-20 w-full" /></CardContent></Card> : query.isError ? <Card><CardContent className="p-8 text-center" role="alert"><RefreshCw className="mx-auto h-8 w-8 text-[var(--accent)]" /><p className="mt-3 text-sm text-[color:var(--text-2)]">We couldn’t load your notifications.</p><Button variant="outline" className="mt-4 min-h-[44px]" onClick={() => void query.refetch()}>Try again</Button></CardContent></Card> : !query.data?.notifications.length ? <Card><CardContent className="p-10 text-center"><Inbox className="mx-auto h-9 w-9 text-[var(--accent)]" /><h2 className="mt-4 font-display text-xl">Nothing here yet</h2><p className="mx-auto mt-2 max-w-sm text-sm text-[color:var(--text-2)]">When you opt in to updates and something matches your choices, it will appear in this quiet inbox.</p><Link href="/settings" className="mt-5 inline-flex min-h-[44px] items-center text-sm font-semibold text-[var(--accent)] underline underline-offset-4">Review notification choices</Link></CardContent></Card> : <Card><CardHeader className="border-b border-[var(--border)]"><CardTitle className="text-base">{query.data.unreadCount ? `${query.data.unreadCount} unread` : "All caught up"}</CardTitle></CardHeader><CardContent className="p-0"><ul>{query.data.notifications.map((notification) => <li key={notification.id} className={`border-b border-[var(--border)] last:border-0 ${notification.readAt ? "" : "bg-[color-mix(in_srgb,var(--accent)_5%,transparent)]"}`}><div className="flex gap-3 p-4 sm:p-5"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notification.readAt ? "bg-[var(--border-strong)]" : "bg-[var(--accent)]"}`} aria-label={notification.readAt ? "Read" : "Unread"} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><span className="eyebrow">{kindLabel[notification.kind] ?? notification.kind}</span><time className="text-xs text-[color:var(--text-3)]" dateTime={notification.createdAt}>{formatDate(notification.createdAt)}</time></div><h2 className="mt-1 text-sm font-semibold">{notification.title}</h2><p className="mt-1 text-sm text-[color:var(--text-2)]">{notification.description}</p><div className="mt-3 flex flex-wrap items-center gap-2"><Link href={notification.href} onClick={() => { if (!notification.readAt) readMutation.mutate(notification.id); }} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-[var(--accent)] underline underline-offset-4">Open target</Link>{!notification.readAt ? <Button variant="ghost" className="min-h-[44px] px-2 text-xs" onClick={() => readMutation.mutate(notification.id)} disabled={readMutation.isPending}><Check className="mr-1.5 h-3.5 w-3.5" />Mark read</Button> : <span className="text-xs text-[color:var(--text-3)]">Read</span>}</div></div></div></li>)}</ul></CardContent></Card>}
### client/src/pages/Onboarding.tsx
52:export default function Onboarding() {
56:    isLoading: preferencesLoading,
57:    isError: preferencesError,
64:    isLoading: categoriesLoading,
65:    isError: categoriesError,
68:    queryKey: ["/api/categories"],
381:          data-testid="button-skip-onboarding"
387:      <div aria-label={`Step ${step} of ${ONBOARDING_STEP_COUNT}`}>
429:          data-testid="button-onboarding-back"
440:            data-testid="button-onboarding-next"
451:            data-testid="button-onboarding-save"
### client/src/pages/Privacy.tsx
8:export default function Privacy() {
16:        <h1 className="display-h text-2xl sm:text-3xl flex items-center gap-2" data-testid="heading-privacy">
76:                data-testid="button-privacy-cookie-settings"
92:              <table className="block w-full text-left text-xs sm:table sm:text-sm border-collapse" data-testid="table-cookies">
191:                data-testid="link-privacy-deletion"
204:                data-testid="link-privacy-github-issues"
232:                data-testid="link-privacy-contact"
### client/src/pages/Profile.tsx
61:import { useLocation, Link } from "wouter";
119:export default function Profile({ user }: ProfileProps) {
129:  const [, setLocation] = useLocation();
136:  // Run17 BUG-011: inline validation message (empty save is rejected, not
158:    // whitespace-only field is non-empty input with no visible characters
160:    // Only a genuinely empty field means "clear this name".
183:      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
205:      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
228:      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
244:  const { data: favorites, isLoading: favoritesLoading } = useQuery<Favorite[]>({
245:    queryKey: ['/api/favorites'],
250:  const { data: bookmarks, isLoading: bookmarksLoading } = useQuery<BookmarkItem[]>({
251:    queryKey: ['/api/bookmarks'],
256:  const { data: progress, isLoading: progressLoading } = useQuery<LearningProgress>({
257:    queryKey: ['/api/user/progress'],
265:    isLoading: contributionsLoading,
266:    isError: contributionsError,
269:    queryKey: ['/api/user/contributions?limit=1'],
274:  const { data: userJourneys, isLoading: journeysLoading } = useQuery<UserJourney[]>({
275:    queryKey: ['/api/user/journeys'],
369:              aria-label="Edit display name"
370:              data-testid="button-edit-name"
410:            data-testid="button-profile-settings"
432:            data-testid="button-logout-all"
442:            data-testid="profile-logout-error"
455:          // onboarding copy instead of the empty number.
465:                      <p className="text-sm font-semibold" data-testid="text-streak-onboarding">
476:                        <p className="text-[10px] text-muted-foreground/70" data-testid={`stat-hint-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
533:                      <span className="font-medium" data-testid="text-journeys-progress">
584:          <div data-testid="card-recommendations">
623:                                data-testid={`link-favorite-${favorite.id}`}
704:                                data-testid={`link-bookmark-${bookmark.id}`}
757:        <TabsContent value="submissions" data-testid="tab-submissions">
770:                <div className="grid gap-3 sm:grid-cols-3" aria-busy="true" aria-label="Loading contribution summary">
803:                <Button asChild data-testid="link-open-contributions">
815:        <TabsContent value="security" data-testid="tab-security">
821:            <Card data-testid="card-account-deletion">
835:                    <p className="text-sm" data-testid="text-deletion-pending">
851:                      data-testid="button-withdraw-deletion"
867:                      data-testid="button-request-deletion"
878:            <AlertDialogContent data-testid="dialog-deletion-confirm">
888:                <AlertDialogCancel data-testid="button-deletion-cancel">
894:                  data-testid="button-deletion-confirm"
924:                data-testid="input-first-name"
934:                data-testid="input-last-name"
941:                data-testid="text-name-error"
958:              data-testid="button-save-name"
### client/src/pages/PublicCollection.tsx
22:export default function PublicCollection({ shareId }: { shareId: string }) {
24:  const { data, isLoading, error } = useQuery<PublicCollectionData>({
25:    queryKey: [url],
31:  if (isLoading) {
62:            <h1 className="text-2xl font-semibold mb-2">Collection not found</h1>
68:              <Button asChild data-testid="button-collection-browse">
71:              <Button asChild variant="outline" data-testid="button-collection-journeys">
### client/src/pages/Recommendations.tsx
14:export default function Recommendations() {
20:    isLoading: anonLoading,
21:    isError: anonError,
26:    queryKey: ["/api/recommendations", "anonymous"],
95:                  <Button variant="outline" onClick={() => void refetch()} data-testid="button-retry-recommendations">
137:              <Button asChild className="w-full sm:w-auto" data-testid="button-login-to-get-started">
### client/src/pages/ResourceDetail.tsx
1:import { useParams, Link, useLocation } from "wouter";
56:export default function ResourceDetail() {
57:  const { id } = useParams<{ id: string }>();
61:  const [, setLocation] = useLocation();
65:  const { data: resource, isLoading, error } = useQuery<Resource>({
66:    queryKey: ['/api/resources', id],
68:      const response = await fetch(`/api/resources/${id}`, { credentials: 'include' });
69:      if (!response.ok) throw new Error('Resource not found');
76:    queryKey: ['/api/favorites'],
84:    queryKey: ['/api/bookmarks'],
106:    queryKey: ["awesome-list-nav"],
132:    queryKey: ['/api/resources', id, 'related'],
134:      const response = await fetch(`/api/resources/${id}/related`, { credentials: 'include' });
162:  const { data: collections = [], isLoading: collectionsLoading } =
164:      queryKey: ["/api/collections?includeArchived=true"],
201:      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
225:                queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
227:              data-testid="button-undo-bookmark-removal"
262:            queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
264:              queryKey: ["/api/collections?includeArchived=true"],
282:      queryClient.invalidateQueries({ queryKey: ['/api/bookmarks'] });
370:      queryClient.invalidateQueries({ queryKey: ["/api/user/continue-learning"] });
496:  if (isLoading) {
528:        <Card className="w-full max-w-lg" data-testid="resource-not-found">
541:              <Link href="/categories" data-testid="link-not-found-categories">
546:              <Link href="/search" data-testid="link-not-found-search">
571:          data-testid="button-back"
597:            data-testid="button-favorite"
600:            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
613:            data-testid="button-bookmark"
616:            aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
625:            data-testid="button-share"
627:            aria-label="Share this resource"
636:            data-testid="button-suggest-edit"
638:            aria-label="Suggest an edit"
651:          <span className="min-w-0 italic" data-testid="text-bookmark-notes">
659:            aria-label="Edit bookmark notes"
660:            data-testid="button-edit-bookmark-notes"
736:                      <h1 className="display-h text-xl sm:text-2xl md:text-3xl" data-testid="text-resource-title">
746:                            data-testid="badge-category"
759:                              data-testid="badge-subcategory"
765:                          <Badge variant="outline" data-testid="badge-subcategory">
776:                              data-testid="badge-sub-subcategory"
782:                          <Badge variant="outline" data-testid="badge-sub-subcategory">
803:                      data-testid="button-visit"
822:                <CardDescription className="text-base leading-relaxed" data-testid="text-description">
934:                  data-testid="link-url"
955:                            data-testid={`tag-link-${index}`}
994:                    <Button asChild variant="outline" data-testid="button-edit-admin">
1017:              endpoint returns no matches, show an explicit empty state instead
1036:                  data-testid="related-empty-state"
1047:                    data-testid={`related-resource-${related.id}`}
1087:                    <Link href={`/category/${slugify(resource.category)}`} data-testid="link-view-all-category">
### client/src/pages/Search.tsx
44:export default function Search() {
193:  const query = useQuery<{ resources: DbResource[]; total: number; facets: ResourceSearchFacets; search?: { mode: "fts" | "fuzzy"; suggestion?: string } }>({ queryKey: [queryUrl], queryFn: () => apiRequest(queryUrl, { method: "GET" }), staleTime: 60_000 });
221:    if (!pendingResultsFocusRef.current || query.isLoading || !data) return;
225:  }, [data, query.isLoading]);
235:      <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="relative min-w-0 flex-1"><SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input ref={inputRef} value={input} onChange={e => { pristine.current = false; setInput(e.target.value); }} onMouseDown={() => { pristine.current = false; }} onKeyDown={e => { if (e.key === "/" && pristine.current && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); window.dispatchEvent(new Event("awesome:open-search-palette")); } if (e.key === "Escape" && input) { e.preventDefault(); setInput(""); } pristine.current = false; }} placeholder="Search resources..." className="min-h-11 pl-10" aria-label="Search resources" data-testid="input-search-page" /></div>
236:        <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Sort</span><Select value={state.sort} onValueChange={v => update("sort", v)}><SelectTrigger className="min-h-11 w-36" aria-label="Sort results" data-testid="select-search-sort"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(sortLabels).map(([v, text]) => <SelectItem key={v} value={v}>{text}</SelectItem>)}</SelectContent></Select></div></div>
239:    {pageNotice && <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm" role="status" data-testid="notice-page-adjusted"><span>{pageNotice}</span><button className="min-h-8 underline" onClick={() => setPageNotice(null)} data-testid="button-dismiss-page-notice">Dismiss</button></div>}
240:    <div className="flex flex-col items-stretch gap-4 lg:flex-row lg:items-start lg:gap-6"><SearchFilters state={state} facets={data?.facets ?? lastFacets.current} onChange={update} onClear={() => clearFilters()} /><main ref={resultsRef} tabIndex={-1} aria-label="Search results" className="min-w-0 flex-1 outline-none">
241:      {!shouldShowResults ? <Card data-testid="text-search-prompt"><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><SearchIcon className="h-8 w-8 text-muted-foreground" /><h2 className="text-sm font-semibold">{normalized.length === 1 ? "Keep typing to search" : "Enter a query or choose filters"}</h2><p className="text-xs text-muted-foreground">{normalized.length === 1 ? "Type at least 2 characters, or choose a filter to browse." : "Narrow the catalog by category, provider, format, skill level, or tag."}</p><Button asChild variant="outline"><Link href="/categories">Browse categories</Link></Button></CardContent></Card>
242:       : query.isLoading ? <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]" data-testid="search-results-loading" aria-busy="true">{Array.from({ length: 6 }).map((_, i) => <ResourceCardSkeleton key={i} />)}</div>
243:       : query.isError ? <Card data-testid="search-results-error"><CardContent className="flex flex-col items-center gap-3 py-10 text-center"><AlertCircle className="h-8 w-8 text-[var(--accent)]" /><p className="text-sm text-muted-foreground">{invalid ? query.error.message : "Search failed. Please try again."}</p><Button variant="outline" onClick={invalid ? clearInvalidRequest : () => query.refetch()} data-testid={invalid ? "button-clear-invalid-filters" : "button-retry-search"}>{invalid ? "Clear invalid filters" : "Try again"}</Button></CardContent></Card>
244:        : results.length === 0 ? <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center"><SearchIcon className="h-8 w-8 text-muted-foreground" /><h2 className="text-sm font-semibold" data-testid="text-no-results">{normalized || canBrowse ? "No resources match this combination" : "Enter a query or choose filters"}</h2><p className="text-xs text-muted-foreground">Try broadening your filters or search terms.</p><div className="flex flex-wrap justify-center gap-2">{hasActiveFilters && <Button variant="outline" onClick={() => clearFilters()} data-testid="button-clear-search-filters">Clear filters</Button>}{normalized && <Button variant="ghost" onClick={clearSearch} data-testid="button-clear-search-query">Clear search</Button>}<Button asChild variant="secondary"><Link href="/categories" data-testid="link-empty-browse-categories">Browse categories</Link></Button><Button asChild variant="secondary"><Link href="/advanced" data-testid="link-empty-advanced-discovery">Advanced discovery</Link></Button></div></CardContent></Card>
245:       : <>{data?.search?.mode === "fuzzy" && data.search.suggestion && <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm" role="status" data-testid="notice-search-suggestion"><span>No exact matches. Did you mean</span><Button variant="link" className="h-auto p-0" onClick={() => { setInput(data.search!.suggestion!); update("q", data.search!.suggestion!); }}>{data.search.suggestion}</Button><span>?</span></div>}<p className="mb-4 text-sm text-muted-foreground" data-testid="text-result-count">{totalPages > 1 ? `Page ${safePage} of ${totalPages} · showing ${(safePage - 1) * PAGE_SIZE + 1}–${(safePage - 1) * PAGE_SIZE + results.length} of ${total} results` : `${total} result${total === 1 ? "" : "s"}`}{normalized ? ` for “${normalized}”` : ""}</p><div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]" data-testid="search-results-grid">{results.map(r => <ResourceCard key={r.id} resource={{ id: String(r.id), name: r.title, url: r.url, description: r.description ?? undefined, category: r.category ?? undefined }} fullResource={r} />)}</div><Paginator currentPage={safePage} totalPages={totalPages} makeHref={makePageHref} onNavigate={gotoPage} className="pt-4" testIds={{ container: "search-pagination", prev: "button-search-prev", next: "button-search-next", jump: "input-search-page-jump" }} /></>}
### client/src/pages/Settings.tsx
80:export default function Settings() {
85:  const { isAuthenticated, isLoading } = useAuth();
89:    isLoading: preferencesLoading,
90:    isError: preferencesError,
99:    isLoading: categoriesLoading,
100:    isError: categoriesError,
103:    queryKey: ["/api/categories"],
135:    (l) => isAuthenticated || isLoading || (l as any).anonSafe,
137:  const showSignInPrompt = !isLoading && !isAuthenticated;
211:          data-testid="link-back-home"
224:          <Link key={testid} href={href} data-testid={testid}>
243:        <section id="learning-preferences" aria-labelledby="learning-preferences-title">
244:          <Card data-testid="card-learning-preferences">
284:                  data-testid="learning-preferences-empty"
296:                    data-testid="button-start-learning-preferences"
330:                          data-testid="button-reset-learning-preferences"
351:                            data-testid="button-confirm-reset-learning-preferences"
361:                      data-testid="button-save-learning-preferences"
374:        <section aria-labelledby="notification-settings-title">
380:        <Card className="p-5" data-testid="card-settings-signin">
389:              <Button asChild size="sm" data-testid="button-settings-signin">
### client/src/pages/Subcategory.tsx
3:export default function Subcategory() {
### client/src/pages/SubmitResource.tsx
5:import { useLocation } from "wouter";
134:export default function SubmitResource() {
135:  const { isAuthenticated, isLoading: authLoading, error: authError, refetchAuth } = useAuth();
144:  const [, setLocation] = useLocation();
152:    queryKey: ['/api/categories'],
158:    queryKey: ['/api/subcategories'],
164:    queryKey: ['/api/sub-subcategories'],
206:          `[name="${firstBad}"], [data-testid="input-${firstBad}"], [data-testid="select-${firstBad}"]`
260:        const response = await fetch(`/api/resources/check-url?url=${encodeURIComponent(debouncedUrl)}`);
320:  // restore has run so we never clobber the stored draft with empty defaults).
468:      void queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
469:      void queryClient.invalidateQueries({ queryKey: ['/api/user/contributions'] });
554:                data-testid="link-submission-contributions"
576:                <Alert className="mb-6" data-testid="alert-auth-loading">
584:                <Alert variant="destructive" className="mb-6" data-testid="alert-auth-error">
597:                      data-testid="button-auth-retry"
605:                <Alert className="mb-6 border-[#ffb84d]/50 bg-[#ffb84d]/10" data-testid="alert-login-required"> {/* DS-OK: status warn */}
610:                    <a href="/sign-in?redirect_url=%2Fsubmit" className="inline-flex items-center min-h-[24px] align-middle underline" data-testid="link-login">log in</a>{" "}
633:                          data-testid="input-title"
657:                          data-testid="input-url"
698:                          data-testid="input-description"
716:                      {/* R3-04: name gives the hidden native select a non-empty
720:                          <SelectTrigger data-testid="select-category">
750:                            <SelectTrigger data-testid="select-subcategory">
781:                            <SelectTrigger data-testid="select-subsubcategory">
813:                          data-testid="input-tags"
834:                    data-testid="button-submit"
863:                    data-testid="button-cancel"
871:                  <AlertDialogContent data-testid="dialog-discard-confirm">
880:                      <AlertDialogCancel data-testid="button-discard-cancel">
884:                        data-testid="button-discard-confirm"
### client/src/pages/SubSubcategory.tsx
3:export default function SubSubcategory() {
### client/src/pages/TagLanding.tsx
3:import { Link, Redirect, useLocation, useParams, useSearch } from "wouter";
50:export default function TagLanding() {
51:  const [, navigate] = useLocation();
52:  const { slug: rawSlug = "" } = useParams<{ slug: string }>();
59:    queryKey: [url],
81:  if (listing.isLoading && !listing.data) {
145:      <section aria-labelledby="tag-scope-heading" data-seo-section="tag-intro">
152:        <div role="status" data-testid="notice-page-adjusted" className="rounded border p-3 text-sm">
156:      <p className="text-sm text-muted-foreground" data-testid="text-results-count" data-total={data.total}>
189:        <section className="space-y-3" aria-labelledby="related-topics-heading" data-seo-section="related-topics">
### client/src/pages/TaxonomyListing.tsx
2:import { useParams, Link, useLocation, useSearch } from "wouter";
89:export default function TaxonomyListing({ level }: Props) {
90:  const { slug = "" } = useParams<{ slug: string }>();
91:  const [location] = useLocation();
134:    queryKey: ["awesome-list-listing", level, slug, page, pageOptions],
183:    queryKey: [taxonomySearchUrl],
199:  const loading = listing.isLoading && !listingData;
200:  const resultsLoading = serverFilterActive && (taxonomySearch.isLoading || taxonomySearch.isPlaceholderData);
449:    <section aria-labelledby="taxonomy-scope-heading" data-seo-section="taxonomy-intro">
456:    <div className="flex flex-col gap-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-10" value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }} placeholder={`Search in ${name}...`} aria-label={`Search in ${name}`} data-testid="input-search-resources" /></div>
457:      {level !== "sub-subcategory" && optionChildren.length > 0 && <select className="min-h-11 rounded-md border bg-background px-3" aria-label={`Limit ${name} by subcategory`} value={selection} onChange={(event) => { const nextSelection = event.target.value; const next = { ...currentFilterState, selection: nextSelection }; setSelection(nextSelection); setGeneral(nextSelection === "__general__"); setPage(1); queueAnalytics(next, "taxonomy_scope", nextSelection); requestResultsFocus(); }} data-testid="select-subcategory-filter"><option value="all">All subcategories</option>{listingData.generalCount > 0 && <option value="__general__">Uncategorized ({listingData.generalCount})</option>}{optionChildren.map((item) => <option key={item.value} value={item.value}>{item.value} ({item.count})</option>)}</select>}
464:        <div ref={resultsRef} tabIndex={-1} className="space-y-4 outline-none" aria-busy={resultsLoading} aria-labelledby="taxonomy-results-heading" data-testid="taxonomy-results-region">
468:          <div className="flex items-center justify-between gap-2"><h2 id="taxonomy-results-heading" className="text-sm font-medium text-muted-foreground" data-testid="text-results-count" data-total={total}>Showing {total === 0 ? "0" : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, total)}`} of {total} {resourceNoun(total)}{total !== listingData.totalAll ? ` (filtered from ${listingData.totalAll})` : ""}</h2><ViewModeToggle value={view} onChange={(mode) => { setView(mode); safeSetItem("awesome-list-view-mode", mode); }} /></div>
469:          {notice && <div role="status" data-testid="notice-page-adjusted" className="rounded border p-3 text-sm">{notice}<button className="ml-2 min-h-8 underline" onClick={() => setNotice(null)}>Dismiss</button></div>}
470:          {(listingData.scope.ignoredSubcategory || listingData.scope.ignoredSubSubcategory) && <div role="status" data-testid="notice-unknown-subcategory" className="rounded border p-3 text-sm">“{selection}” isn't a subcategory of {name}, so that filter was ignored.<button className="ml-2 min-h-8 underline" onClick={broadenScope}>Remove it</button></div>}
471:          {serverSearchActive && !taxonomySearch.isPlaceholderData && taxonomySearch.data?.search?.mode === "fuzzy" && taxonomySearch.data.search.suggestion && <div className="flex flex-wrap items-center justify-center gap-2 rounded border p-3 text-sm" role="status" data-testid="notice-taxonomy-search-suggestion"><span>No exact matches. Did you mean</span><Button variant="link" className="h-auto p-0" onClick={() => { setSearchTerm(taxonomySearch.data!.search!.suggestion!); setPage(1); }}>{taxonomySearch.data.search.suggestion}</Button><span>?</span></div>}
472:          {resultsLoading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="taxonomy-results-loading">{Array.from({ length: 6 }).map((_, index) => <ResourceCardSkeleton key={index} />)}</div>
473:          : resources.length === 0 ? <div className="flex flex-col items-center gap-3 py-12 text-center" data-testid="empty-resources"><h3 className="text-lg font-semibold">No resources match this combination</h3><p className="text-muted-foreground">Clear a filter, remove the search, or broaden where you're looking.</p><div className="flex flex-wrap justify-center gap-2">{(tags.length > 0 || provider || format || skillLevel || sort !== "default") && <Button variant="outline" onClick={clearFacetFilters} data-testid="button-clear-taxonomy-filters">Clear filters</Button>}{normalizedSearch && <Button variant="ghost" onClick={() => { setSearchTerm(""); setPage(1); requestResultsFocus(); }} data-testid="button-clear-taxonomy-search">Clear search</Button>}{(selection !== "all" || general) ? <Button variant="secondary" onClick={broadenScope} data-testid="button-broaden-taxonomy-scope">Show all in {name}</Button> : <Button asChild variant="secondary"><Link href={broadenHref} data-testid="link-broaden-taxonomy-scope">{level === "category" ? "Search all of Awesome Video" : "Search the broader category"}</Link></Button>}</div></div> :
### client/src/pages/Terms.tsx
8:export default function Terms() {
16:        <h1 className="display-h text-2xl sm:text-3xl flex items-center gap-2" data-testid="heading-terms">
104:                data-testid="link-terms-contact"
### client/src/pages/ThemeSettings.tsx
25:export default function ThemeSettings() {
126:          data-testid="link-back-home"
140:          <span className="text-[color:var(--text-3)]" data-testid="text-active-preset">
148:          data-testid="link-design-system-showcase"
168:        data-testid="theme-sticky-preview"
200:      <section aria-label="Design system picker" data-testid="system-picker" className="no-print">
207:          aria-label="Design system"
222:                data-testid={`system-option-${id}`}
246:      <section aria-label="Accent picker" data-testid="accent-picker" className="no-print">
253:          aria-label="Accent"
268:                data-testid={`accent-option-${a.id}`}
299:      <section aria-label="Font override picker" data-testid="font-picker" className="no-print">
309:          aria-label="Font override"
324:                data-testid={`font-option-${f.id}`}
352:          empty headings and blank bordered boxes; hide the whole preview. */}
353:      <section aria-label="Live preview" data-testid="theme-preview" className="no-print">
367:        <p className="text-xs text-[color:var(--text-3)] -mt-2 mb-4" data-testid="preview-display-only-note">
372:          data-testid="preview-card"
392:              0123456789 · const x = await fetch(&apos;/api/resources&apos;);
402:              <Button data-testid="preview-btn-default">
406:              <Button variant="secondary" data-testid="preview-btn-secondary">Secondary</Button>
407:              <Button variant="outline" data-testid="preview-btn-outline">Outline</Button>
408:              <Button variant="ghost" data-testid="preview-btn-ghost">Ghost</Button>
409:              <Button variant="destructive" data-testid="preview-btn-destructive">Destructive</Button>
410:              <Button size="icon" variant="outline" aria-label="Icon button" data-testid="preview-btn-icon">
438:              <Input placeholder="Search resources…" data-testid="preview-input" />
463:                  data-testid={`preview-token-${t.label}`}
Stable IDs should be assigned from route + state, preserving exact route parameters. Primary route families: /; /sign-in/*?; /sign-up/*?; /logout; legacy /login,/register,/forgot-password,/reset-password,/auth/login,/auth/register,/signup; /search; /categories; /category/:slug; /subcategory/:slug; /sub-subcategory/:slug; /tag/:slug; /resource/:id; /journeys; /journey/:id; /collection/:shareId; /about; /terms; /privacy; /code-of-conduct; /advanced; /submit; /continue-learning; /recommendations; /profile; /contributions; /bookmarks; /favorites; /account; /settings; /settings/theme; /notifications; /onboarding; /admin and /admin/:tab; /design-system; plus unknown 404.

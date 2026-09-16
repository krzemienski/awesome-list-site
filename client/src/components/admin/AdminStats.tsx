import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Stat from "@/components/admin/canonical/Stat";

interface AdminStatsProps {
  stats?: {
    users?: number;
    resources?: number;
    journeys?: number;
    pendingApprovals?: number;
    pendingEdits?: number;
    totalPublic?: number;
    totalPending?: number;
    /** Rows with status='rejected' (Audit2 BUG-050: was misnamed totalDeleted). */
    totalRejected?: number;
    /** Present in the repository response but not yet forwarded by the stats route. */
    activeUsers?: number;
  };
  isLoading: boolean;
  /** R4-L17: when provided, stat cards become clickable and jump to the matching admin tab. */
  onNavigate?: (tab: string) => void;
}

interface PendingResource {
  createdAt?: string | null;
}

interface PendingResponse {
  resources?: PendingResource[];
  total?: number;
}

interface UserSummary {
  id: string;
  role?: string | null;
  updatedAt?: string | null;
}

interface UserPage {
  users?: UserSummary[];
  total?: number;
}

interface CategorySummary {
  resourceCount?: number;
}

const PAGE_SIZE = 100;
const getDate = (value: string | null | undefined) => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

async function getAllUsers(): Promise<UserSummary[]> {
  const firstPage = await apiRequest(
    `/api/admin/users?page=1&limit=${PAGE_SIZE}`,
  ) as UserPage;
  const firstUsers = firstPage.users ?? [];
  const total = firstPage.total ?? firstUsers.length;
  const pageCount = Math.ceil(total / PAGE_SIZE);

  if (pageCount <= 1) return firstUsers;
  // Keep overview pagination below the shared database pool's concurrency.
  const remainingPages: UserPage[] = [];
  for (let page = 2; page <= pageCount; page++) {
    remainingPages.push(await apiRequest(
      `/api/admin/users?page=${page}&limit=${PAGE_SIZE}`,
    ) as UserPage);
  }
  return [
    ...firstUsers,
    ...remainingPages.flatMap((page) => page.users ?? []),
  ];
}

function oldestPendingAge(resources: PendingResource[] | undefined): string {
  const oldest = (resources ?? [])
    .map((resource) => getDate(resource.createdAt))
    .filter((value): value is number => value !== null)
    .reduce<number | null>((minimum, value) => (
      minimum === null ? value : Math.min(minimum, value)
    ), null);

  if (oldest === null) return "none waiting";
  const elapsed = Math.max(0, Date.now() - oldest);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "oldest just now";
  if (minutes < 60) return `oldest ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `oldest ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `oldest ${days}d ago`;
}

/**
 * Canonical four-card admin metric strip:
 * approved resources, canonical subcategories, users active in the existing
 * 30-day updatedAt window, and pending approvals plus their oldest age.
 */
export default function AdminStats({
  stats,
  isLoading,
  onNavigate,
}: AdminStatsProps) {
  const pending = useQuery<PendingResponse>({
    queryKey: ["/api/admin/pending-resources", "overview-stat"],
    queryFn: () => apiRequest("/api/admin/pending-resources"),
    staleTime: 30_000,
  });
  const users = useQuery<UserSummary[]>({
    queryKey: ["/api/admin/users", "overview-all"],
    queryFn: getAllUsers,
    staleTime: 30_000,
  });
  const categories = useQuery<CategorySummary[]>({
    queryKey: ["/api/categories", "overview-stat"],
    queryFn: () => apiRequest("/api/categories"),
    staleTime: 60_000,
  });
  const subcategories = useQuery<CategorySummary[]>({
    queryKey: ["/api/subcategories", "overview-stat"],
    queryFn: () => apiRequest("/api/subcategories"),
    staleTime: 60_000,
  });
  const pendingResources = pending.data?.resources ?? [];
  const pendingCount = pending.data?.total
    ?? pending.data?.resources?.length
    ?? stats?.totalPending
    ?? stats?.pendingApprovals;
  // The stats route intentionally does not forward the repository's
  // all-users count. Keep this card tied to the sequential user pages so its
  // value and role split use the same 30-day updatedAt definition.
  const activeUsers = users.data?.length;
  const activeAdmins = users.data?.filter((user) => user.role === "admin").length ?? 0;
  const activeContributors = users.data?.filter((user) => user.role !== "admin").length ?? 0;
  const categoryCount = categories.data?.length;
  const subcategoryCount = subcategories.data?.length;
  const pendingUnavailable = pending.isError;
  const value = (number: number | undefined) => (
    number === undefined ? 0 : number.toLocaleString()
  );
  const subcategoryValue = subcategories.isError ? "Error" : value(subcategoryCount);
  const activeUserValue = users.isError && activeUsers === undefined ? "Error" : value(activeUsers);
  const pendingValue = pendingUnavailable && pendingCount === undefined
    ? "Error"
    : value(pendingCount);
  const usersLoading = users.isPending || (isLoading && !stats);
  const subcategoriesLoading = subcategories.isPending || (isLoading && !stats);
  const pendingLoading = pending.isPending || (isLoading && !stats);

  return (
    <div
      className="admin-stat-strip admin-overview-stats-canonical"
      data-testid="admin-stats"
    >
      <Stat
        label="Resources"
        value={value(stats?.totalPublic ?? stats?.resources)}
        sub={
          <>
            {categories.isError
              ? "category data unavailable"
              : categoryCount === undefined
                ? "across — categories"
                : `across ${categoryCount} categories`}
          </>
        }
        loading={isLoading && !stats}
        onNavigate={onNavigate ? () => onNavigate("resources") : undefined}
        navigateLabel="Resources — open the resources tab"
        titleTestId="stat-title-resources"
        valueTestId="stat-live-resources"
        testId="stat-card-resources"
      />
      <Stat
        label="Subcategories"
        value={subcategoryValue}
        sub={subcategories.isError ? "unavailable" : "all canonical"}
        loading={subcategoriesLoading}
        onNavigate={onNavigate ? () => onNavigate("subcategories") : undefined}
        navigateLabel="Subcategories — open the subcategories tab"
        titleTestId="stat-title-journeys"
        testId="stat-card-journeys"
      />
      <Stat
        label="Active users"
        value={activeUserValue}
        sub={
          users.isError
            ? "unavailable"
            : users.data
            ? `${activeAdmins} admins · ${activeContributors} contributors`
            : "updated within 30 days"
        }
        loading={usersLoading}
        onNavigate={onNavigate ? () => onNavigate("users") : undefined}
        navigateLabel="Active users — open the users tab"
        titleTestId="stat-title-users"
        testId="stat-card-users"
      />
      <Stat
        label="Pending approvals"
        value={pendingValue}
        sub={pendingUnavailable ? "unavailable" : oldestPendingAge(pendingResources)}
        accent
        loading={pendingLoading}
        onNavigate={onNavigate ? () => onNavigate("approvals") : undefined}
        navigateLabel="Pending approvals — open the approvals tab"
        titleTestId="stat-title-approvals"
        testId="stat-card-approvals"
      />
    </div>
  );
}
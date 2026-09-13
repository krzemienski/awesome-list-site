import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Inbox, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import SEOHead from "@/components/layout/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import "@/styles/pages/account.css";

type Notification = { id: number | string; kind: string; title: string; description: string; href: string; readAt: string | null; createdAt: string };
type NotificationResponse = { notifications: Notification[]; unreadCount: number };

const kindLabel: Record<string, string> = { new_resource: "New resource", watch_next: "Watch next", journey_step: "Journey step" };
const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function Notifications() {
  const query = useQuery<NotificationResponse>({ queryKey: ["/api/notifications?limit=50"] });
  const readMutation = useMutation({
    mutationFn: (id: Notification["id"]) => apiRequest(`/api/notifications/${id}/read`, { method: "PATCH" }),
    onSuccess: (data: { id: Notification["id"]; read: boolean }) => {
      queryClient.setQueryData<NotificationResponse>(["/api/notifications?limit=50"], (old) => old ? { ...old, unreadCount: Math.max(0, old.unreadCount - (old.notifications.find((n) => n.id === data.id && !n.readAt) ? 1 : 0)), notifications: old.notifications.map((n) => n.id === data.id ? { ...n, readAt: new Date().toISOString() } : n) } : old);
      void queryClient.invalidateQueries({ queryKey: ["/api/notifications?limit=50"] });
    },
  });
  const allMutation = useMutation({
    mutationFn: () => apiRequest("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      queryClient.setQueryData<NotificationResponse>(["/api/notifications?limit=50"], (old) => old ? { ...old, unreadCount: 0, notifications: old.notifications.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) } : old);
      void queryClient.invalidateQueries({ queryKey: ["/api/notifications?limit=50"] });
    },
  });

  const mutationError = readMutation.error ?? allMutation.error;

  return (
    <div className="account-page account-page--form space-y-8 px-4 py-8 sm:px-6">
      <SEOHead title="Notifications" description="Your Awesome Video updates." noindex />
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <span aria-hidden="true">──</span> Personal inbox
          </p>
          <h1 className="display-h mt-2 flex items-center gap-3 text-3xl">
            <Bell className="account-accent-icon h-7 w-7" />
            Notifications
          </h1>
          <p className="account-muted mt-2 text-sm">
            A private record of the updates you chose to receive.
          </p>
        </div>
        {query.data && query.data.unreadCount > 0 ? (
          <Button
            variant="outline"
            className="min-h-[44px] shrink-0"
            onClick={() => allMutation.mutate()}
            disabled={allMutation.isPending}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        ) : null}
      </header>
      {mutationError ? (
        <p className="account-notification-error p-3 text-sm" role="alert">
          We couldn’t update the read state. Try again.
        </p>
      ) : null}
      {query.isLoading ? (
        <Card>
          <CardContent className="space-y-3 p-5" aria-busy="true">
            <div className="skeleton h-20 w-full" />
            <div className="skeleton h-20 w-full" />
            <div className="skeleton h-20 w-full" />
          </CardContent>
        </Card>
      ) : query.isError ? (
        <Card>
          <CardContent className="p-8 text-center" role="alert">
            <RefreshCw className="account-accent-icon mx-auto h-8 w-8" />
            <p className="account-muted mt-3 text-sm">
              We couldn’t load your notifications.
            </p>
            <Button
              variant="outline"
              className="mt-4 min-h-[44px]"
              onClick={() => void query.refetch()}
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : !query.data?.notifications.length ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Inbox className="account-accent-icon mx-auto h-9 w-9" />
            <h2 className="mt-4 font-display text-xl">Nothing here yet</h2>
            <p className="account-muted mx-auto mt-2 max-w-sm text-sm">
              When you opt in to updates and something matches your choices, it
              will appear in this quiet inbox.
            </p>
            <Link
              href="/settings"
              className="account-accent mt-5 inline-flex min-h-[44px] items-center text-sm font-semibold underline underline-offset-4"
            >
              Review notification choices
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="account-notification-header">
            <CardTitle className="text-base">
              {query.data.unreadCount
                ? `${query.data.unreadCount} unread`
                : "All caught up"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul>
              {query.data.notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`account-notification-row ${
                    notification.readAt ? "" : "account-notification-row--unread"
                  }`}
                >
                  <div className="flex gap-3 p-4 sm:p-5">
                    <span
                      className={`account-notification-dot mt-1 h-2.5 w-2.5 shrink-0 ${
                        notification.readAt
                          ? "account-notification-dot--read"
                          : "account-notification-dot--unread"
                      }`}
                      aria-label={notification.readAt ? "Read" : "Unread"}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="eyebrow">
                          {kindLabel[notification.kind] ?? notification.kind}
                        </span>
                        <time
                          className="account-meta text-xs"
                          dateTime={notification.createdAt}
                        >
                          {formatDate(notification.createdAt)}
                        </time>
                      </div>
                      <h2 className="mt-1 text-sm font-semibold">
                        {notification.title}
                      </h2>
                      <p className="account-muted mt-1 text-sm">
                        {notification.description}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Link
                          href={notification.href}
                          onClick={() => {
                            if (!notification.readAt) {
                              readMutation.mutate(notification.id);
                            }
                          }}
                          className="account-accent inline-flex min-h-[44px] items-center text-sm font-semibold underline underline-offset-4"
                        >
                          Open target
                        </Link>
                        {!notification.readAt ? (
                          <Button
                            variant="ghost"
                            className="min-h-[44px] px-2 text-xs"
                            onClick={() => readMutation.mutate(notification.id)}
                            disabled={readMutation.isPending}
                          >
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                            Mark read
                          </Button>
                        ) : (
                          <span className="account-meta text-xs">Read</span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
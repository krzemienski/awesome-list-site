import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, Check, Clock3, Eye, Info, Mail, Pause, Play, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DigestPreview, NotificationPreferencesResponse, NotificationPreferencesUpdate } from "@shared/notifications";
import { DIGEST_CADENCES, notificationPreferencesUpdateSchema } from "@shared/notifications";

const localTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

const defaults = (): NotificationPreferencesUpdate => ({
  emailDigestEnabled: false,
  inAppEnabled: false,
  includeNewResources: true,
  includeWatchNext: true,
  includeJourneyStep: true,
  cadence: "weekly",
  timezone: localTimezone(),
  pausedUntil: null,
});

function Toggle({ checked, onChange, label, description, icon: Icon }: { checked: boolean; onChange: (value: boolean) => void; label: string; description: string; icon: typeof Mail }) {
  return (
    <label className="flex min-h-[64px] cursor-pointer items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 transition-colors hover:border-[var(--accent)]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span aria-hidden="true" className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${checked ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg)]" : "border-[var(--border-strong)] text-transparent"}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="mt-0.5 block text-xs text-[color:var(--text-2)]">{description}</span>
      </span>
      <span className="sr-only">{checked ? "On" : "Off"}</span>
    </label>
  );
}

export default function NotificationPreferencesCard() {
  const preferencesQuery = useQuery<NotificationPreferencesResponse>({
    queryKey: ["/api/notification-preferences"],
  });
  const previewQuery = useQuery<DigestPreview>({
    queryKey: ["/api/digests/preview"],
  });
  const [values, setValues] = useState<NotificationPreferencesUpdate>(defaults);
  const [saved, setSaved] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  useEffect(() => {
    const data = preferencesQuery.data;
    if (data) {
      setValues({
        emailDigestEnabled: data.emailDigestEnabled,
        inAppEnabled: data.inAppEnabled,
        includeNewResources: data.includeNewResources,
        includeWatchNext: data.includeWatchNext,
        includeJourneyStep: data.includeJourneyStep,
        cadence: data.cadence,
        timezone: data.timezone,
        pausedUntil: data.pausedUntil,
      });
    }
  }, [preferencesQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (body: NotificationPreferencesUpdate) =>
      apiRequest("/api/notification-preferences", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: (data: NotificationPreferencesResponse) => {
      queryClient.setQueryData(["/api/notification-preferences"], data);
      void queryClient.invalidateQueries({ queryKey: ["/api/notification-preferences"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/digests/preview"] });
      setSaved(true);
      setRequestError(null);
    },
    onError: (error) => {
      setSaved(false);
      setRequestError(error instanceof Error ? error.message : "We couldn’t save notification preferences.");
    },
  });

  const previewItems = useMemo(() => (previewQuery.data?.sections ?? []).flatMap((section) =>
    section.items.map((item) => ({ ...item, sectionTitle: section.title }))), [previewQuery.data]);
  const paused = Boolean(values.pausedUntil && new Date(values.pausedUntil).getTime() > Date.now());
  const update = <K extends keyof NotificationPreferencesUpdate>(key: K, value: NotificationPreferencesUpdate[K]) => {
    setSaved(false);
    setValues((current) => ({ ...current, [key]: value }));
  };
  const saveValues = (nextValues: NotificationPreferencesUpdate) => {
    const parsed = notificationPreferencesUpdateSchema.safeParse(nextValues);
    if (!parsed.success) {
      setSaved(false);
      setRequestError(parsed.error.issues[0]?.message ?? "Check your notification choices.");
      return;
    }
    setRequestError(null);
    saveMutation.mutate(parsed.data);
  };
  const save = () => saveValues(values);
  const pause = () => {
    const next = { ...values, pausedUntil: new Date(Date.now() + 7 * 86400000).toISOString() };
    setValues(next);
    saveValues(next);
  };
  const resume = () => {
    const next = { ...values, pausedUntil: null };
    setValues(next);
    saveValues(next);
  };
  const unsubscribeAll = () => {
    const next = { ...values, emailDigestEnabled: false, inAppEnabled: false };
    setValues(next);
    saveValues(next);
  };

  return (
    <Card data-testid="card-notification-preferences">
      <CardHeader>
        <CardTitle id="notification-settings-title" className="flex items-center gap-2"><Bell className="h-5 w-5 text-[var(--accent)]" /> Notifications</CardTitle>
        <CardDescription>Quiet, useful updates for your Awesome Video learning space. Every channel starts off until you explicitly opt in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {preferencesQuery.isLoading ? (
          <div className="space-y-3" aria-busy="true"><div className="skeleton h-16 w-full" /><div className="skeleton h-16 w-full" /><div className="skeleton h-10 w-2/3" /></div>
        ) : preferencesQuery.isError ? (
          <div className="border border-destructive/40 bg-destructive/10 p-4 text-sm" role="alert">
            <p>We couldn’t load your notification choices.</p>
            <Button variant="outline" className="mt-3 min-h-[44px]" onClick={() => void preferencesQuery.refetch()}>Try again</Button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle checked={values.emailDigestEnabled} onChange={(v) => update("emailDigestEnabled", v)} label="Email digest" description="A considered digest, never a stream." icon={Mail} />
              <Toggle checked={values.inAppEnabled} onChange={(v) => update("inAppEnabled", v)} label="In-app updates" description="A small inbox inside your account." icon={Bell} />
            </div>
            <div className="flex gap-3 border border-[color-mix(in_srgb,var(--accent)_25%,transparent)] bg-[color-mix(in_srgb,var(--accent)_7%,transparent)] p-4 text-sm">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" />
              <p className="text-[color:var(--text-2)]">These channels are independent. Delivery content excludes private notes, learning history, and external URLs.</p>
            </div>
            <section aria-labelledby="notification-sections">
              <h3 id="notification-sections" className="mb-3 text-sm font-semibold">Digest sections</h3>
              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  ["includeNewResources", "New resources"],
                  ["includeWatchNext", "Watch next"],
                  ["includeJourneyStep", "Journey steps"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex min-h-[52px] items-center gap-3 border border-[var(--border)] px-3 text-sm">
                    <input type="checkbox" checked={values[key]} onChange={(e) => update(key, e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
                    {label}
                  </label>
                ))}
              </div>
            </section>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="digest-cadence">Cadence</Label><select id="digest-cadence" value={values.cadence} onChange={(e) => update("cadence", e.target.value as NotificationPreferencesUpdate["cadence"])} className="mt-2 min-h-[44px] w-full rounded-md border border-input bg-[var(--surface)] px-3 text-sm">{DIGEST_CADENCES.map((cadence) => <option key={cadence} value={cadence}>{cadence[0].toUpperCase() + cadence.slice(1)}</option>)}</select></div>
               <div><Label htmlFor="digest-timezone">Time zone</Label><input id="digest-timezone" value={values.timezone} onChange={(e) => update("timezone", e.target.value)} className="mt-2 min-h-[44px] w-full rounded-md border border-input bg-[var(--surface)] px-3 text-sm" /></div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
               {paused ? <Button variant="outline" className="min-h-[44px]" onClick={resume} disabled={saveMutation.isPending}><Play className="mr-2 h-4 w-4" />Resume now</Button> : <Button variant="outline" className="min-h-[44px]" onClick={pause} disabled={saveMutation.isPending}><Pause className="mr-2 h-4 w-4" />Pause for 7 days</Button>}
               <Button variant="ghost" className="min-h-[44px] text-[color:var(--text-2)]" onClick={unsubscribeAll} disabled={saveMutation.isPending || (!values.emailDigestEnabled && !values.inAppEnabled)}>Unsubscribe all</Button>
              <Button className="ml-auto min-h-[44px]" onClick={save} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving…" : "Save choices"}</Button>
            </div>
            {paused ? <p className="flex items-center gap-2 text-xs text-[color:var(--text-2)]"><Clock3 className="h-4 w-4" />Paused until {new Date(values.pausedUntil!).toLocaleDateString()}.</p> : null}
            {requestError ? <p className="border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{requestError}</p> : null}
            {saved ? <p className="flex items-center gap-2 text-sm text-[var(--accent)]" role="status"><Check className="h-4 w-4" />Your choices are saved.</p> : null}
            <Separator />
            <section aria-labelledby="digest-preview">
              <div className="flex items-start justify-between gap-3"><div><h3 id="digest-preview" className="flex items-center gap-2 text-sm font-semibold"><Eye className="h-4 w-4 text-[var(--accent)]" />Preview</h3><p className="mt-1 text-xs text-[color:var(--text-2)]">This uses the same rules as delivery.</p></div>{previewQuery.data ? <span className="font-mono text-xs text-[color:var(--text-2)]">{previewQuery.data.itemCount} items</span> : null}</div>
              {previewQuery.isLoading ? <div className="mt-3 space-y-2"><div className="skeleton h-12 w-full" /><div className="skeleton h-12 w-full" /></div> : previewQuery.isError ? <p className="mt-3 text-sm text-destructive" role="alert">Preview is unavailable right now. Your choices have not changed.</p> : previewItems.length === 0 ? <div className="mt-3 border border-dashed border-[var(--border-strong)] p-4 text-sm text-[color:var(--text-2)]"><Info className="mb-2 h-4 w-4 text-[var(--accent)]" /><p>No saved content matches these rules yet. When there is something to share, it will appear here.</p></div> : <div className="mt-3 space-y-2">{previewItems.map((item, index) => <a key={`${item.href}-${index}`} href={item.href} className="block border-l-2 border-[var(--accent)] bg-[var(--surface-2)] px-3 py-2 transition-colors hover:bg-[var(--surface-3)]"><span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--accent)]">{item.sectionTitle}</span><span className="mt-1 block text-sm font-semibold">{item.title}</span><span className="mt-0.5 block text-xs text-[color:var(--text-2)]">{item.description}</span></a>)}</div>}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}
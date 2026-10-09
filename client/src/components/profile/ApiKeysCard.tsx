/**
 * App API keys (Profile → Security). These are this site's own programmatic
 * access keys (Authorization: Bearer <key> on /api/public/*), NOT the sign-in
 * account managed in the auth provider's modal next to this card.
 *
 * The plaintext secret exists only in the create response: it is held in this
 * component's state for the one-time reveal and dropped on dismiss. The list
 * endpoint never returns secrets, so a reload can't recover a key.
 *
 * Failures render inline (never toast inside a dialog) and never clear the
 * existing list.
 */
import { useId, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Copy, KeyRound } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ApiKeySummary {
  id: string;
  name: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
}

interface CreatedKey {
  key: string;
  apiKey: Pick<ApiKeySummary, "id" | "name" | "createdAt" | "expiresAt">;
}

const API_KEYS_QUERY_KEY = ["/api/user/api-keys"] as const;
const NAME_MAX = 100;
const EXPIRY_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
  { value: "never", label: "Never expires" },
] as const;

function keyStatus(key: ApiKeySummary, now = Date.now()): "active" | "expired" | "revoked" {
  if (key.revokedAt) return "revoked";
  if (key.expiresAt && new Date(key.expiresAt).getTime() <= now) return "expired";
  return "active";
}

const relative = (value: string | null) =>
  value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : null;

// A dropped connection surfaces as the browser's bare "Failed to fetch";
// show a sentence the user can act on, and keep server messages punctuated
// so the trailing reassurance ("Your existing keys are unchanged.") reads.
function describeKeyError(error: Error, fallback: string): string {
  const message = error?.message?.trim();
  if (!message) return fallback;
  if (error instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(message)) {
    return "The server couldn't be reached. Check your connection and try again.";
  }
  return /[.!?]$/.test(message) ? message : `${message}.`;
}

export default function ApiKeysCard() {
  const nameId = useId();
  const expiryId = useId();
  const secretId = useId();
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState<string>("90");
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "manual">("idle");
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKeySummary | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const secretInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const keysQuery = useQuery<{ apiKeys: ApiKeySummary[] }>({
    queryKey: API_KEYS_QUERY_KEY,
    queryFn: () => apiRequest("/api/user/api-keys"),
    staleTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: async (): Promise<CreatedKey> =>
      apiRequest("/api/user/api-keys", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          ...(expiry === "never" ? {} : { expiresInDays: Number(expiry) }),
        }),
      }),
    onSuccess: (result) => {
      setCreated(result);
      setCopyState("idle");
      setCreateError(null);
      setName("");
      void queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
    onError: (error: Error) => {
      setCreateError(describeKeyError(error, "Couldn't create the key. Try again."));
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest(`/api/user/api-keys/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => {
      setKeyToRevoke(null);
      setRevokeError(null);
      void queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
    onError: (error: Error) => {
      setRevokeError(describeKeyError(error, "Couldn't revoke the key. Try again."));
    },
  });

  const trimmedName = name.trim();
  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!trimmedName || createMutation.isPending) return;
    createMutation.mutate();
  };

  const handleCopy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.key);
      setCopyState("copied");
    } catch {
      // Clipboard can be blocked (permissions, insecure context): select the
      // text so the user can copy it by hand.
      secretInputRef.current?.select();
      setCopyState("manual");
    }
  };

  const dismissSecret = () => {
    setCreated(null);
    setCopyState("idle");
    nameInputRef.current?.focus();
  };

  const keys = keysQuery.data?.apiKeys ?? [];

  return (
    <Card data-testid="card-api-keys">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" aria-hidden="true" />
          API keys
        </CardTitle>
        <CardDescription>
          Keys for programmatic, read-only access to this site&apos;s public API
          (send <code className="font-mono">Authorization: Bearer &lt;key&gt;</code>).
          They are separate from your sign-in account above. Each key&apos;s
          secret is shown once, when you create it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {created && (
          <Alert data-testid="panel-api-key-secret">
            <AlertTitle>Copy your new key “{created.apiKey.name}” now</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                This is the only time the secret is shown. If you lose it,
                revoke the key and create a new one.
              </p>
              <Label htmlFor={secretId} className="sr-only">
                New API key secret
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id={secretId}
                  ref={secretInputRef}
                  readOnly
                  value={created.key}
                  className="font-mono text-xs"
                  onFocus={(event) => event.currentTarget.select()}
                  data-testid="input-api-key-secret"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleCopy()}
                  data-testid="button-copy-api-key"
                >
                  {copyState === "copied" ? (
                    <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  {copyState === "copied" ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-sm" aria-live="polite" data-testid="text-api-key-copy-status">
                {copyState === "copied"
                  ? "Copied to your clipboard."
                  : copyState === "manual"
                    ? "Copying was blocked by the browser — the key is selected; copy it manually."
                    : ""}
              </p>
              <Button type="button" onClick={dismissSecret} data-testid="button-dismiss-api-key-secret">
                I&apos;ve saved it
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleCreate} className="space-y-3" data-testid="form-create-api-key">
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <div className="space-y-1.5">
              <Label htmlFor={nameId}>Key name</Label>
              <Input
                id={nameId}
                ref={nameInputRef}
                value={name}
                maxLength={NAME_MAX}
                placeholder="e.g. My reading-list script"
                onChange={(event) => setName(event.target.value)}
                data-testid="input-api-key-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={expiryId}>Expires</Label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger id={expiryId} data-testid="select-api-key-expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {createError && (
            <Alert variant="destructive" data-testid="alert-api-key-create-error">
              <AlertTitle>Couldn&apos;t create the key</AlertTitle>
              <AlertDescription>
                {createError} Your existing keys are unchanged.
              </AlertDescription>
            </Alert>
          )}
          <Button
            type="submit"
            disabled={!trimmedName}
            aria-busy={createMutation.isPending}
            data-testid="button-create-api-key"
          >
            {createMutation.isPending ? "Creating…" : "Create key"}
          </Button>
        </form>

        <section aria-labelledby={`${nameId}-list`} className="space-y-3">
          <h3 id={`${nameId}-list`} className="text-sm font-semibold">
            Your keys
          </h3>
          {keysQuery.isPending ? (
            <div className="space-y-2" aria-busy="true">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : keysQuery.isError && !keysQuery.data ? (
            <Alert variant="destructive" data-testid="alert-api-keys-load-error">
              <AlertTitle>Couldn&apos;t load your keys</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>Nothing was changed. Try again.</p>
                <Button type="button" variant="outline" onClick={() => void keysQuery.refetch()}>
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-api-keys-empty">
              You haven&apos;t created any API keys.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-md border" data-testid="list-api-keys">
              {keys.map((key) => {
                const status = keyStatus(key);
                return (
                  <li
                    key={key.id}
                    className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                    data-testid={`row-api-key-${key.id}`}
                    data-status={status}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="min-w-0 break-words font-medium">{key.name}</span>
                        <Badge
                          variant={status === "active" ? "secondary" : "outline"}
                          data-testid={`status-api-key-${key.id}`}
                        >
                          {status === "active" ? "Active" : status === "expired" ? "Expired" : "Revoked"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {relative(key.createdAt)}
                        {" · "}
                        {status === "revoked"
                          ? `Revoked ${relative(key.revokedAt)}`
                          : key.expiresAt
                            ? `${status === "expired" ? "Expired" : "Expires"} ${relative(key.expiresAt)}`
                            : "Never expires"}
                        {" · "}
                        {key.lastUsedAt ? `Last used ${relative(key.lastUsedAt)}` : "Never used"}
                      </p>
                    </div>
                    {status !== "revoked" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-[44px] self-start sm:self-auto"
                        onClick={() => {
                          setRevokeError(null);
                          setKeyToRevoke(key);
                        }}
                        aria-label={`Revoke API key ${key.name}`}
                        data-testid={`button-revoke-api-key-${key.id}`}
                      >
                        Revoke
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </CardContent>

      <AlertDialog
        open={!!keyToRevoke}
        onOpenChange={(open) => {
          if (!open && !revokeMutation.isPending) {
            setKeyToRevoke(null);
            setRevokeError(null);
          }
        }}
      >
        <AlertDialogContent data-testid="dialog-revoke-api-key">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke “{keyToRevoke?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Anything using this key stops working immediately. This can&apos;t
              be undone; create a new key if you need access again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {revokeError && (
            <Alert variant="destructive" data-testid="alert-api-key-revoke-error">
              <AlertTitle>Couldn&apos;t revoke the key</AlertTitle>
              <AlertDescription>{revokeError} The key is still active.</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending} data-testid="button-revoke-api-key-cancel">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // Keep the dialog open until the server answers so a failure
                // is shown in place instead of disappearing with the dialog.
                event.preventDefault();
                if (keyToRevoke && !revokeMutation.isPending) revokeMutation.mutate(keyToRevoke.id);
              }}
              aria-busy={revokeMutation.isPending}
              data-testid="button-revoke-api-key-confirm"
            >
              {revokeMutation.isPending ? "Revoking…" : "Revoke key"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

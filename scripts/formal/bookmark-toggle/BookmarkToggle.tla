--------------------------- MODULE BookmarkToggle ---------------------------
(* The signed-in bookmark toggle on one resource, in one tab:
   client/src/components/resource/BookmarkButton.tsx (local isBookmarked,
   the /api/bookmarks list query and its useEffect sync, the notes dialog)
   and client/src/hooks/useResourceToggle.ts (inFlightRef, desiredRef,
   onMutate / onSuccess / onError / onSettled, buildRequest).

   One action is one step no click can land inside. A click is a macrotask;
   TanStack's onMutate -> mutationFn and onSuccess -> onSettled -> follow-up
   mutate chain on microtasks, so each chain is one action here. *)
EXTENDS Naturals

CONSTANTS
  MaxClicks,          \* bound on user clicks in one behaviour
  AmbiguousFailures,  \* server commits but the client sees an error (timeout, dropped response)
  ListSyncMidFlight,  \* the /api/bookmarks refetch can read and land while a toggle request is in flight
  MethodFromUi        \* the old bug: mutationFn picks POST/DELETE from the already-flipped isBookmarked

VARIABLES
  server,         \* bookmark row exists (user-features.ts POST/DELETE /api/bookmarks/:resourceId)
  ui,             \* BookmarkButton isBookmarked: what aria-pressed and the icon show
  listCache,      \* resource present in the ["/api/bookmarks"] query data (effectiveBookmarked)
  inFlight,       \* inFlightRef: busy, and the in-flight vars.remove
  desired,        \* desiredRef: set, and the latest-wins target
  wire,           \* the request: busy, vars.remove, whether it went out as DELETE, status
  refetch,        \* the /api/bookmarks refetch started by invalidateQueries
  dialogOpen,     \* notes dialog opened by interceptActivate
  notesDialog,    \* the showNotesDialog prop (fixed per behaviour)
  intent,         \* what the user's last committed action asked for
  errSinceIntent, \* a request since that action settled in error with no follow-up
  clicks

vars == <<server, ui, listCache, inFlight, desired, wire, refetch, dialogOpen,
          notesDialog, intent, errSinceIntent, clicks>>

Idle      == [busy |-> FALSE, remove |-> FALSE]
NoDesired == [set |-> FALSE, val |-> FALSE]
NoWire    == [busy |-> FALSE, remove |-> FALSE, delete |-> FALSE, status |-> "none"]
NoRefetch == [phase |-> "idle", value |-> FALSE]

TypeOK ==
  /\ server \in BOOLEAN /\ ui \in BOOLEAN /\ listCache \in BOOLEAN
  /\ inFlight \in [busy : BOOLEAN, remove : BOOLEAN]
  /\ desired \in [set : BOOLEAN, val : BOOLEAN]
  /\ wire \in [busy : BOOLEAN, remove : BOOLEAN, delete : BOOLEAN,
               status : {"none", "pending", "ok", "fail", "lost"}]
  /\ refetch \in [phase : {"idle", "reading", "read"}, value : BOOLEAN]
  /\ dialogOpen \in BOOLEAN /\ notesDialog \in BOOLEAN
  /\ intent \in BOOLEAN /\ errSinceIntent \in BOOLEAN
  /\ clicks \in 0..MaxClicks

Init ==
  /\ server \in BOOLEAN
  /\ ui = server /\ listCache = server /\ intent = server
  /\ inFlight = Idle /\ desired = NoDesired /\ wire = NoWire /\ refetch = NoRefetch
  /\ dialogOpen = FALSE /\ notesDialog \in BOOLEAN
  /\ errSinceIntent = FALSE /\ clicks = 0

(* mutation.mutate(vars): onMutate sets inFlightRef and calls
   onOptimistic(!vars.remove); mutationFn -> buildRequest picks the method. *)
StartReq(remove) ==
  /\ inFlight' = [busy |-> TRUE, remove |-> remove]
  /\ ui' = ~remove
  /\ wire' = [busy |-> TRUE, remove |-> remove,
              delete |-> IF MethodFromUi THEN ~remove ELSE remove,
              status |-> "pending"]

(* BookmarkButton handleClick -> toggle(). The user clicks to invert what the
   button shows, so the intent is ~ui. *)
Click ==
  /\ clicks < MaxClicks /\ ~dialogOpen
  /\ clicks' = clicks + 1
  /\ IF inFlight.busy
       THEN \* in-flight branch: baseline is the in-flight target, then latest-wins
            LET d == IF desired.set THEN ~desired.val ELSE inFlight.remove
            IN /\ desired' = [set |-> TRUE, val |-> d]
               /\ ui' = d
               /\ intent' = ~ui /\ errSinceIntent' = FALSE
               /\ UNCHANGED <<server, listCache, inFlight, wire, refetch, dialogOpen>>
     ELSE IF ~ui /\ notesDialog
       THEN \* interceptActivate opens the dialog; nothing is sent yet
            /\ dialogOpen' = TRUE
            /\ UNCHANGED <<server, ui, listCache, inFlight, desired, wire, refetch,
                           intent, errSinceIntent>>
       ELSE \* mutation.mutate({ remove: opts.isActive })
            /\ StartReq(ui)
            /\ intent' = ~ui /\ errSinceIntent' = FALSE
            /\ UNCHANGED <<server, listCache, desired, refetch, dialogOpen>>
  /\ UNCHANGED notesDialog

(* handleSaveWithNotes / handleSaveWithoutNotes -> bookmark.mutate({ remove: false }).
   The dialog's save buttons are disabled while isPending. *)
DialogSave ==
  /\ dialogOpen /\ ~inFlight.busy
  /\ dialogOpen' = FALSE
  /\ StartReq(FALSE)
  /\ intent' = TRUE /\ errSinceIntent' = FALSE
  /\ UNCHANGED <<server, listCache, desired, refetch, notesDialog, clicks>>

DialogCancel ==
  /\ dialogOpen /\ dialogOpen' = FALSE
  /\ UNCHANGED <<server, ui, listCache, inFlight, desired, wire, refetch,
                 notesDialog, intent, errSinceIntent, clicks>>

(* The server handles the request. POST upserts, DELETE removes; both are
   idempotent on the row. *)
ServerHandles ==
  /\ wire.busy /\ wire.status = "pending"
  /\ \/ /\ server' = ~wire.delete /\ wire' = [wire EXCEPT !.status = "ok"]
     \/ /\ UNCHANGED server /\ wire' = [wire EXCEPT !.status = "fail"]
     \/ /\ AmbiguousFailures
        /\ server' = ~wire.delete /\ wire' = [wire EXCEPT !.status = "lost"]
  /\ UNCHANGED <<ui, listCache, inFlight, desired, refetch, dialogOpen,
                 notesDialog, intent, errSinceIntent, clicks>>

(* The response reaches the client: onSuccess (invalidate + BookmarkButton
   setIsBookmarked(data.isBookmarked) when the body has it - POST does,
   DELETE does not) or onError (onErrorRevert: setIsBookmarked(vars.remove)),
   then onSettled: clear inFlightRef, converge on desiredRef with at most one
   follow-up whose onMutate runs before any click. *)
Settle ==
  /\ wire.busy /\ wire.status \in {"ok", "fail", "lost"}
  /\ LET ok      == wire.status = "ok"
         rem     == inFlight.remove
         uiAfter == IF ok THEN (IF wire.delete THEN ui ELSE TRUE) ELSE rem
         final   == IF ~ok THEN rem ELSE (IF wire.delete THEN ~rem ELSE TRUE)
         follow  == desired.set /\ desired.val # final
     IN /\ errSinceIntent' = (errSinceIntent \/ (~ok /\ ~follow))
        /\ refetch' = IF ok THEN [phase |-> "reading", value |-> FALSE] ELSE refetch
        /\ desired' = NoDesired
        /\ IF follow
             THEN StartReq(~desired.val)
             ELSE /\ ui' = uiAfter /\ inFlight' = Idle /\ wire' = NoWire
  /\ UNCHANGED <<server, listCache, dialogOpen, notesDialog, intent, clicks>>

(* The GET /api/bookmarks refetch reads the server, then its result lands in
   the query cache. A newer invalidation restarts it (cancelRefetch). The
   useEffect copies effectiveBookmarked into isBookmarked only when it changes. *)
(* ListSyncMidFlight = FALSE holds the refetch back while a request is in
   flight: the current code does not, so FALSE excludes finding F1. *)
ListSyncAllowed == ListSyncMidFlight \/ ~inFlight.busy

RefetchRead ==
  /\ ListSyncAllowed /\ refetch.phase = "reading"
  /\ refetch' = [phase |-> "read", value |-> server]
  /\ UNCHANGED <<server, ui, listCache, inFlight, desired, wire, dialogOpen,
                 notesDialog, intent, errSinceIntent, clicks>>

RefetchDeliver ==
  /\ ListSyncAllowed /\ refetch.phase = "read"
  /\ listCache' = refetch.value
  /\ ui' = IF refetch.value # listCache THEN refetch.value ELSE ui
  /\ refetch' = NoRefetch
  /\ UNCHANGED <<server, inFlight, desired, wire, dialogOpen, notesDialog,
                 intent, errSinceIntent, clicks>>

Next ==
  \/ Click \/ DialogSave \/ DialogCancel \/ ServerHandles \/ Settle
  \/ RefetchRead \/ RefetchDeliver

Spec == Init /\ [][Next]_vars

Quiet ==
  /\ ~inFlight.busy /\ ~wire.busy /\ ~desired.set
  /\ refetch.phase = "idle" /\ ~dialogOpen

(* A request meant to remove the bookmark goes out as DELETE, and one meant
   to add it goes out as POST. *)
RemoveSendsDelete == wire.busy => (wire.delete = wire.remove)

(* Once everything settles, the button shows what the server has. *)
UiTellsTruth == Quiet => ui = server

(* Once everything settles with no unretried error, the server holds what the
   user's last click asked for. *)
LastClickWins == (Quiet /\ ~errSinceIntent) => server = intent
=============================================================================

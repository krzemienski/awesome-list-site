# Home layout preference handoff

Task #542 adds a persisted `homeLayout` preference with the values `index`
(the default) and `curated`.

## Client wiring

- `client/src/components/home/use-home-layout.ts` is the read/persistence hook.
  Its primary return values are `{ layout, isLoading }`; `setLayout` and save
  status are also exposed for the preference control.
- `client/src/components/home/HomeLayoutPreferenceControl.tsx` imports the hook
  and is the account-preferences control. It can be imported either as the
  named `HomeLayoutPreferenceControl` export or as the file's default export.
- The Home page worker in `client/src/pages/Home.tsx` imports
  `useHomeLayout` from `@/components/home/use-home-layout` and passes its
  resolved `layout` to the presentation worker after loading. The preference
  control remains independently importable by the account owner.
- `?layout=index` and `?layout=curated` override the rendered value for that
  URL only. They do not write storage or the account preference.

Guest selections use the guarded `awesome-video-home-layout` safe-storage key.
The logout path does not remove this key, so a guest's choice survives signing
out. Signed-in selections are written through `PUT /api/user/preferences` with
the observed revision and send no learning fields.

## API and migration behavior

`GET`, `PUT`, and `DELETE /api/user/preferences` now include `homeLayout` while
retaining the existing `revision` response and optimistic-concurrency rules.
Partial layout saves merge with every existing learning value. A cleared
learning-preference row remains a tombstone (`preferences: null` plus its
revision); its home layout is still returned at the top level, and creating a
layout for a missing row uses `expectedRevision: null` as before.

`migrations/0049_home_layout_preferences.sql` is journaled in
`migrations/meta/_journal.json`, uses idempotent statements, and only adds and
normalizes the new column. It does not migrate production data.

---
name: Route param names drive validation
description: global contract inference validates any path param named *id/*Id as a positive int4; varchar user ids 400 unless named otherwise
---
The global request-contract layer infers param schemas from the param NAME: `:id`, `:userId`, `:resourceId` etc. must be digit strings, so a varchar user id (e.g. `__qa_test_…` or a Clerk-linked id) gets a 400 "must be a positive integer id" before the handler runs.

**Why:** a new admin route `PATCH …/:resourceId/:userId` returned 400 for every real member; the UI surfaced it, the handler never ran.

**How to apply:** for text ids on new routes, name the param without an id suffix (e.g. `:reporter`) so it gets the bounded safe-string schema, or add an explicit path exception in the contract inference like the admin-users and api-keys ones. Probe new routes with a real non-numeric id.

# awesome.video coverage inventory

Denominator: reports/prod-audit-2026-10-26/INVENTORY.md (760 interactions, each with surface, trigger and API dependency), every row x {1440x900, 820x1180, 390x844}.

| Lane | Rows | Scope | Results |
|---|---|---|---|
| public-core | 66 + 1 | shell, nav, search, category/tag/resource pages, bookmarks (guest), new researcher resource | reports/prod-audit-2026-10-29/cycle-17/c17-pc.md |
| public-secondary | 63 | about/docs/submit form, journeys, advanced pages, 404, meta | cycle-17/c17-ps.md |
| a11y + signed-in shell | 19 + 44 | keyboard, focus, landmarks; admin shell entry points | cycle-17/c17-ax-sh.md |
| admin-content | 239 | overview, approvals, edits, resource manager, categories/subcategories, journeys | cycle-17/c17-admin-content.md |
| admin-ops | 132 | export, link health, users, database, diagnostics, audit log | cycle-17/c17-admin-ops.md |
| admin-ai | 116 | enrichment, GitHub sync (dry run), researcher, recommendations | cycle-17/c17-admin-ai.md |
| auth (added for this brief) | 8 | sign-in/up validation, admin denial UI+API signed out, guest member pages | cycle-17/c17-auth.md |
| member | 81 + auth flows | sign-up, sign-in, persistence, profile, bookmarks, submit, notifications, member sign-out | cycle-17/c17-member.md (owner-approved audit account) |

Expected result per row is the inventory's Interaction column plus cycle-17/RULES.md acceptance rules.

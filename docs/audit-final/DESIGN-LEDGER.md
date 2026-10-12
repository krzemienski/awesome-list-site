# Design ledger

Every place the live app intentionally or currently differs from the frozen design reference (`awesome-list-site-ds-20260929/`), with the reason and the decision. Rows are added by the design workstream (D-rows in [BACKLOG.md](BACKLOG.md)).

| ID | Screen | System/width/accent | Gap | Why it isn't perfect yet | Fix or decision |
|---|---|---|---|---|---|
| HDR-1 | App header (every page) | All 5 systems, 769–1024 (and ≤768, where the reference has it too); any accent | A menu button sits left of the logo at tablet widths; the reference has none between 769 and 1024 | At those widths the desktop links are hidden, so the menu button is the only header route to Browse, Submit, About and Admin | **Kept** (approved deviation `tablet-drawer-trigger`, owner decision 2026-10-10, reaffirmed as decision 4). Checked 2026-10-12: visible at 375/768/1024, hidden at 1440, 44×44, in all 5 systems |
| HDR-2 | App header search trigger | All 5 systems, 768–1024; any accent | The tablet search box shows the word "Search" before the ⌘K chip; the reference shows only the chip | Usability finding F210: a bare ⌘K chip read as an empty field | **Kept** (approved deviation `tablet-search-label`, owner decision 2026-10-10, reaffirmed as decision 4). Checked 2026-10-12: "Search ⌘K" at 768 and 1024 in all 5 systems; 1440 shows the full "Search 1,823 resources… ⌘K" field as in the reference |
| HDR-3 | App header controls | All 5 systems, ≤1024 | The app drew a 36px box inside each 44px tap target; the reference draws the full 44px box | — | **Aligned** to the reference (owner decision 2026-10-10). Checked 2026-10-12: every header control at 375/768/1024 is ≥44×44, 0 under 44 in any system |
| HDR-4 | Account chip | All 5 systems, all widths | The chip showed two initials; the reference shows one accent-coloured letter | — | **Aligned** to the reference (owner decision 2026-10-10). Checked 2026-10-12: one letter ("A") in every system; the Profile page keeps two initials |

Source of the 2026-10-10 decisions: `docs/audit-578/verify/I05.md`, "Header decision".

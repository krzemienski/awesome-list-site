# NB-042 — hardcoded "~1,950 existing resources" claim — VG PASS (July 20, 2026)

**Fix**: `ResearcherTab.tsx` cost-info alert no longer hardcodes "~1,950"; it renders the live catalog count (`categoriesData.resources.length.toLocaleString()`) or the neutral "the existing catalog" while loading.

**Proof (live, dev, Playwright authed admin, `/admin/researcher`)**: rendered copy:

```
The researcher automatically deduplicates against the 1,809 existing resources.
```

(1,809 = live dev catalog count at capture time; prod will show its own live number.) Screenshot: `NB-042-live-count-copy.png`.

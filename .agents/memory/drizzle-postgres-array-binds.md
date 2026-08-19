---
name: Drizzle PostgreSQL array binds
description: How to keep large reused ID predicates under PostgreSQL's bind-parameter limit with this project's Drizzle driver.
---

When one set of trusted numeric database IDs is reused across several SQL branches, serialize it as one PostgreSQL array-literal string parameter and query it with `= ANY(...::int[])`. Do not interpolate the JavaScript array directly.

**Why:** This Drizzle driver expands a raw JavaScript array interpolation into a SQL record rather than a single PostgreSQL array parameter. Direct casting then fails at runtime, while expanding every ID separately can exceed PostgreSQL's 65,535-parameter limit when the predicate is repeated.

**How to apply:** Use this only for trusted numeric IDs already read from the database, never unvalidated user text. Exercise the real query after changing the encoding because TypeScript cannot detect the rendered SQL shape.
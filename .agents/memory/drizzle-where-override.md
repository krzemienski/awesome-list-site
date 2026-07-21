---
name: Drizzle double .where() override
description: Calling .where() twice on a Drizzle query builder silently drops the first predicate — combine with and().
---

# Drizzle: a second `.where()` overrides the first

Calling `.where()` more than once on the same Drizzle query builder does NOT
AND the conditions together — the second call **replaces** the first. The
earlier predicate is silently dropped, with no error and no type warning.

**Why:** This caused a real data-correctness bug: a list query applied a
`status = 'published'` filter and then, when a `category` param was present,
called `.where(eq(category, ...))` a second time. The status filter vanished and
the endpoint returned rows it should have excluded (every journey, ignoring the
category narrow). It looks correct in code review because both `.where()` calls
are individually valid.

**How to apply:** Build all predicates into one array and pass a single
`.where(and(...conditions))`. When conditionally adding filters, push to the
conditions array, never chain a second `.where()`. Audit any repository method
that adds optional filters this way.

# SQL truth — approved resources per top-level category

## Development (psql $DATABASE_URL, 2026-10-11)
```
select c.name, count(r.id) filter (where r.status='approved') from categories c left join resources r on r.category=c.name group by c.name order by c.name;
Community & Events | 80
Encoding & Codecs | 333
General Tools | 134
Infrastructure & Delivery | 191
Intro & Learning | 187
Media Tools | 266
Players & Clients | 239
Protocols & Transport | 213
Standards & Industry | 173
-- approved total / orphans (category not in taxonomy):
1816 | 0
```

## Production (read-only query through the Replit database tool, environment=production, 2026-10-11)
```
Community & Events | 129
Encoding & Codecs | 579
General Tools | 514
Infrastructure & Delivery | 352
Intro & Learning | 297
Media Tools | 704
Players & Clients | 447
Protocols & Transport | 467
Standards & Industry | 335
-- approved total / orphans: 3824 | 0
```

# C7 AC06-1 — partial (worker hit 72% context after 12 tool calls)
Worker: sonnet ab1a5cac51a88a37f. Revision 31d0acce. RM-01, RM-02 PASS at 1440 (load 25 of 3,826; page-JS fetch rejection -> Resources (0 of 0) + Retry; recovers). ED-21, ED-22 undriven; 820/390 undriven -> AC06-1b.
LESSON: a worker's fixed context is large enough that ~12-30 browser calls is the whole budget. Micro-chunks should be 2 rows x 3 widths.

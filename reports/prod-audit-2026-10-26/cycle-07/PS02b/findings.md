# C7 PS02b (PS02 width follow-up)
Worker: sonnet abc7c3df6badb0486. Revision 130e5829. Evidence: e2e-evidence/cycle-07/PS02b/.
- C7-PS02b-01 CONFIRMED, LOW: the full-page ErrorPage ("Something went wrong", /advanced catalog failure) at 390 has no side gutter. The text and the Retry button run edge to edge (Retry x=0..390). The lead viewed err-390.png: confirmed. Source: client/src/pages/ErrorPage.tsx renders StatePanel (client/src/components/layout/StatePanel.tsx) outside the page-content wrapper. Routed to FIX-C7-08.
PASS: 013 at 390 + Activity at 820; 015 at 820 and 390; 016 at 820 and 390; 021 error+Retry at 390/820 and loading at 390; 022 Browse All at 820/390; 023 at 820; 024 guest paths at 820.
Still undriven: 021 loading at 820/1440, error at 1440, empty-corpus and Offline at all widths; 022 at 1440 and Explore Categories click at 820. -> PS02c after deploy 1.

// Maintainer / author E-E-A-T content. Shared verbatim between the client About
// page (client/src/pages/About.tsx) and the server-rendered crawler body
// (server/og-middleware.ts → renderStaticPageContent), so the visible page, the
// pre-JavaScript crawler view, and the site's Organization.founder schema all
// describe the same real person — a genuine E-E-A-T signal, not cloaking.
//
// Facts are kept truthful and evergreen: no fabricated tenure or inflated star
// counts. The "1,800+ stars" figure is a safe floor (the awesome-video repo is
// well above it and growing); the only external link is the verifiable GitHub
// profile.

export interface Maintainer {
  name: string;
  role: string;
  profileUrl: string;
  bio: string[];
}

export const MAINTAINER: Maintainer = {
  name: "Nick Krzemienski",
  role: "Creator & maintainer of awesome-video",
  profileUrl: "https://github.com/krzemienski",
  bio: [
    "awesome.video is curated and maintained by Nick Krzemienski, a video engineer and long-time contributor to the streaming media community and the creator of the open-source awesome-video list. He started the list to share the encoders, players, codecs, specifications, and learning resources he relies on with the wider video development community.",
    "The awesome-video list has become one of the most referenced open-source collections in the space, with more than 1,800 stars on GitHub. Every resource on this site is drawn from and kept in sync with that repository, so the directory reflects tools that working video engineers actually use.",
  ],
};

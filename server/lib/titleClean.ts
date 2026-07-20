/**
 * Run24 R5-041: the research importer saved GitHub search-result titles
 * verbatim as "owner/repo — description", leaking the owner slug into
 * card titles, search ranking and og-images. Strip the "owner/" prefix so
 * the title leads with the repo name ("haxqer/vast — Go VAST 4.2 parser"
 * → "vast — Go VAST 4.2 parser").
 *
 * Conservative on purpose:
 *  - only fires when the title STARTS with "owner/repo" followed by an
 *    em/en-dash separator — never on titles that merely contain a slash;
 *  - GitHub owner names allow only alphanumerics and hyphens, so an owner
 *    segment with a dot ("H.264/AVC — …") never matches;
 *  - a bare "a/b" title with no dash tail is left alone ("iOS/tvOS").
 */
export function cleanGithubSlugTitle(title: string): string {
  const m = title.match(/^([A-Za-z0-9-]+)\/([A-Za-z0-9_.-]+)(\s*[—–]\s+.+)$/);
  if (!m) return title;
  const [, , repo, tail] = m;
  return `${repo}${tail}`;
}

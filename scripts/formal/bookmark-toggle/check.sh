#!/usr/bin/env bash
# Model-check the bookmark toggle. Exit 0: every config gave its expected
# result. Exit 1: a result changed. Exit 2: the code no longer matches the
# model's anchors, so TLC results are not trustworthy until the model is updated.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
repo="$(cd "$here/../../.." && pwd)"
TLA_VERSION=1.7.4
TLA_SHA256=936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88
jar="${TLA_JAR:-$HOME/.cache/tla/tla2tools-$TLA_VERSION.jar}"

if [[ ! -f "$jar" ]]; then
  mkdir -p "$(dirname "$jar")"
  curl -sSL -o "$jar" "https://github.com/tlaplus/tlaplus/releases/download/v$TLA_VERSION/tla2tools.jar"
fi
echo "$TLA_SHA256  $jar" | shasum -a 256 -c --status || { echo "tla2tools checksum mismatch: $jar" >&2; exit 2; }

node "$repo/scripts/formal/bookmark-toggle/anchors.mjs" || exit 2

# config | expected first line of the TLC verdict
expectations=(
  "Full|Invariant LastClickWins is violated"            # finding F1, open
  "NoMidFlightSync|No error has been found"
  "AmbiguousFailures|Invariant UiTellsTruth is violated" # finding F2, open
  "MutantMethodFromUi|Invariant RemoveSendsDelete is violated"
)

out="$(mktemp -d "${TMPDIR:-/tmp}/formal-bookmark.XXXXXX")"
status=0
echo
for row in "${expectations[@]}"; do
  cfg="${row%%|*}"; want="${row#*|}"
  (cd "$here" && java -XX:+UseParallelGC -cp "$jar" tlc2.TLC -deadlock -workers auto \
    -metadir "$out/meta-$cfg" -config "$cfg.cfg" BookmarkToggle.tla) > "$out/$cfg.txt" 2>&1 || true
  got="$(grep -m1 -oE 'Invariant [A-Za-z]+ is violated|No error has been found' "$out/$cfg.txt" || echo 'no verdict, see the TLC output')"
  if [[ "$got" == "$want" ]]; then
    echo "OK    $cfg: $got"
  else
    echo "DIFF  $cfg: expected '$want', got '$got'"
    status=1
  fi
done
echo
echo "TLC output and counterexample traces: $out"
exit $status

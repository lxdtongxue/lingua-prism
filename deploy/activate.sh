#!/usr/bin/env bash
# Run as lingua-deploy after a complete release has been uploaded.
set -euo pipefail
BASE=/var/www/lingua-prism-auto
RELEASE="${1:?release identifier required}"
[[ "$RELEASE" =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]] || exit 1
NEXT="$BASE/releases/$RELEASE"
for page in index.html test/index.html center/index.html survey/index.html; do
  test -s "$NEXT/$page"
done
test -d "$NEXT/assets"
PREVIOUS="$(readlink "$BASE/current")"
# Keep assets needed by tabs that were open before the deployment.
if [ -d "$BASE/$PREVIOUS/assets" ]; then
  cp -an "$BASE/$PREVIOUS/assets/." "$NEXT/assets/"
fi
find "$NEXT" -type d -exec chmod 755 {} +
find "$NEXT" -type f -exec chmod 644 {} +
ln -s "releases/$RELEASE" "$BASE/current.next"
mv -Tf "$BASE/current.next" "$BASE/current"
if ! curl --fail --silent --show-error --max-time 15 http://127.0.0.1/ -o /dev/null; then
  ln -s "$PREVIOUS" "$BASE/current.rollback"
  mv -Tf "$BASE/current.rollback" "$BASE/current"
  echo 'Health check failed; previous release restored.' >&2
  exit 1
fi
echo "Activated $RELEASE"

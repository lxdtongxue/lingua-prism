#!/usr/bin/env bash
set -euo pipefail
BASE=/var/www/lingua-prism-auto
RELEASE="${1:?release identifier required}"
[[ "$RELEASE" =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]] || exit 1
NEXT="$BASE/api-releases/$RELEASE"
test -s "$NEXT/app.py"
python3 -c 'import ast,sys; ast.parse(open(sys.argv[1]).read())' "$NEXT/app.py"
PREVIOUS="$(readlink "$BASE/api-current")"
ln -s "api-releases/$RELEASE" "$BASE/api-next"
mv -Tf "$BASE/api-next" "$BASE/api-current"
sudo -n systemctl restart lingua-api.service
for attempt in 1 2 3 4 5; do
  if curl --fail --silent --max-time 3 http://127.0.0.1:8787/api/health >/dev/null; then exit 0; fi
  sleep 1
done
ln -s "$PREVIOUS" "$BASE/api-rollback"
mv -Tf "$BASE/api-rollback" "$BASE/api-current"
sudo -n systemctl restart lingua-api.service
printf 'API health check failed; previous API restored.\n' >&2
exit 1

#!/usr/bin/env bash
# First-time setup, run as root from a private copy of this repository.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BASE=/var/www/lingua-prism-auto
id lingua-api >/dev/null 2>&1 || useradd --system --home-dir /var/lib/lingua-prism --shell /sbin/nologin lingua-api
install -d -m 700 -o lingua-api -g lingua-api /var/lib/lingua-prism
install -d -m 755 -o lingua-deploy -g lingua-deploy "$BASE/api-releases"
install -d -m 755 -o lingua-deploy -g lingua-deploy "$BASE/api-releases/bootstrap"
install -m 644 -o lingua-deploy -g lingua-deploy "$ROOT/server/app.py" "$BASE/api-releases/bootstrap/app.py"
if [ ! -e "$BASE/api-current" ]; then
  ln -s api-releases/bootstrap "$BASE/api-current"
  chown -h lingua-deploy:lingua-deploy "$BASE/api-current"
fi
install -m 644 "$ROOT/deploy/api/lingua-api.service" /etc/systemd/system/lingua-api.service
# Fixed restart only; no general command execution as root.
SYSTEMCTL="$(command -v systemctl)"
printf 'lingua-deploy ALL=(root) NOPASSWD: %s restart lingua-api.service\n' "$SYSTEMCTL" > /etc/sudoers.d/lingua-api
chmod 440 /etc/sudoers.d/lingua-api
visudo -cf /etc/sudoers.d/lingua-api
systemctl daemon-reload
systemctl enable --now lingua-api.service
API_READY=0
for attempt in 1 2 3 4 5; do
  if curl --fail --silent --max-time 3 http://127.0.0.1:8787/api/health; then API_READY=1; break; fi
  sleep 1
done
[ "$API_READY" = 1 ] || { echo 'API did not become ready.' >&2; exit 1; }
printf '\nAPI ready. Include deploy/api/nginx-location.conf in the existing Nginx server block, then validate and reload Nginx.\n'

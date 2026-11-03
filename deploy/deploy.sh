#!/usr/bin/env bash
# Build the site and upload it to the server.
#   deploy/deploy.sh <user>@<host> [ssh-key]
# The build uses base "/" because the site lives at the server's root.
set -euo pipefail

TARGET="${1:?usage: deploy/deploy.sh <user>@<host> [ssh-key]}"
KEY="${2:-$HOME/.ssh/lingua_prism}"
SSH=(ssh -i "$KEY" -o IdentitiesOnly=yes)

"${SSH[@]}" "$TARGET" 'if [ -L /var/www/lingua-prism ] && [ -d /var/www/lingua-prism-auto ]; then echo "This site uses GitHub Actions. Do not overwrite its release link with the legacy deploy script." >&2; exit 1; fi'

cd "$(dirname "$0")/.."
npm run build -- --base /

# Compressing is not modifying: the font files stay byte-identical once the browser unpacks them.
for f in dist/fonts/*.ttf; do gzip -9 -k -f "$f"; done

# Upload to a staging folder, then swap it in, so visitors never see a half-copied site.
STAMP="$(date +%Y%m%d%H%M%S)"
rsync -az --delete -e "${SSH[*]}" dist/ "$TARGET:/tmp/lingua-prism-$STAMP/"
"${SSH[@]}" "$TARGET" "set -e
  S=; [ \$(id -u) -ne 0 ] && S=sudo
  \$S mkdir -p /var/www
  \$S rm -rf /var/www/lingua-prism.new
  \$S mv /tmp/lingua-prism-$STAMP /var/www/lingua-prism.new
  \$S chown -R root:root /var/www/lingua-prism.new
  \$S find /var/www/lingua-prism.new -type d -exec chmod 755 {} +
  \$S find /var/www/lingua-prism.new -type f -exec chmod 644 {} +
  [ -d /var/www/lingua-prism ] && \$S mv /var/www/lingua-prism /var/www/lingua-prism.old || true
  \$S mv /var/www/lingua-prism.new /var/www/lingua-prism
  \$S rm -rf /var/www/lingua-prism.old"
echo "Deployed. Open http://${TARGET#*@}/"

#!/bin/sh
# Lets only Cloudflare reach the web ports of the VPS.
#
# Cloudflare fronts thichthihackk.com, so every honest visitor arrives from one
# of Cloudflare's address ranges. Anyone else knocking on 80 or 443 has found
# the VPS's own address and is going around the proxy; the firewall turns them
# away before Caddy even shakes hands, so the certificate (which names the
# domain) is never shown to a scanner. SSH stays open to the world: the owner
# logs in from changing addresses, and fail2ban watches that door.
#
# Run it once to turn the firewall on, and monthly from cron to pick up new
# Cloudflare ranges (they change once in years). Also compares the live list
# with the one written into /etc/caddy/Caddyfile, and tells the admins over
# Telegram when the Caddyfile needs the new entries; that edit is by hand, in
# deploy/Caddyfile, so the repo stays the truth.
#
# Undo, if the site ever has to be reached without Cloudflare:
#   ufw allow 80,443/tcp
set -u
LOG=/var/log/menzu-firewall.log
STATE=/etc/menzu/cloudflare-ips.txt
CADDYFILE=/etc/caddy/Caddyfile
log() { echo "$(date '+%F %T') $*" >> "$LOG"; }
mkdir -p "$(dirname "$STATE")"

V4=$(curl -sS -m 20 https://www.cloudflare.com/ips-v4) || { log "could not fetch ips-v4"; exit 1; }
V6=$(curl -sS -m 20 https://www.cloudflare.com/ips-v6) || { log "could not fetch ips-v6"; exit 1; }
if grep -qi '^IPV6=no' /etc/default/ufw 2>/dev/null; then V6=""; fi
NEW=$(printf '%s\n%s\n' "$V4" "$V6" | grep -E '^[0-9a-f.:]+/[0-9]+$' | sort -u)
# A short list means a broken download, not a smaller Cloudflare; keep what we have.
if [ "$(printf '%s\n' "$NEW" | grep -c '\.')" -lt 10 ]; then log "ips-v4 looked wrong: $(echo "$V4" | head -c 200)"; exit 1; fi

if [ -f "$STATE" ] && [ "$NEW" = "$(cat "$STATE")" ] && ufw status 2>/dev/null | grep -q '^Status: active'; then
  log "unchanged ($(printf '%s\n' "$NEW" | wc -l) ranges)"
  exit 0
fi

# Rebuilt from scratch each time so a range Cloudflare dropped goes away too.
# SSH is allowed before the firewall is switched on, never after.
ufw --force reset > /dev/null 2>&1
ufw default deny incoming > /dev/null
ufw default allow outgoing > /dev/null
ufw allow 22/tcp comment 'ssh' > /dev/null
for R in $NEW; do
  ufw allow proto tcp from "$R" to any port 80,443 comment 'cloudflare' > /dev/null
done
ufw --force enable > /dev/null
printf '%s\n' "$NEW" > "$STATE"
log "firewall rebuilt: 22 open, 80/443 from $(printf '%s\n' "$NEW" | wc -l) Cloudflare ranges"

# The Caddyfile's trusted list is static; say so when it falls behind.
MISSING=""
for R in $NEW; do
  grep -q -- "$R" "$CADDYFILE" 2>/dev/null || MISSING="$MISSING $R"
done
if [ -n "$MISSING" ]; then
  log "caddyfile lacks:$MISSING"
  T=$(docker exec menzu-postgres psql -U menzu -d menzu -Atc "select value from settings where key='integrations.telegram.botToken'" 2>/dev/null)
  C=$(docker exec menzu-postgres psql -U menzu -d menzu -Atc "select value from settings where key='integrations.telegram.chatId'" 2>/dev/null)
  if [ -n "$T" ] && [ -n "$C" ]; then
    for U in $(curl -sS -m 20 "https://api.telegram.org/bot$T/getChatAdministrators?chat_id=$C" \
        | grep -o '"user":{"id":[0-9]*,"is_bot":false' | grep -o '[0-9]\+'); do
      curl -sS -m 20 -o /dev/null -F "chat_id=$U" \
        -F "text=Cloudflare co dai IP moi chua co trong deploy/Caddyfile:$MISSING . Tuong lua da cap nhat; can them vao Caddyfile de app doc dung IP khach." \
        "https://api.telegram.org/bot$T/sendMessage"
    done
  fi
fi

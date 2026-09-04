#!/bin/sh
# Nightly backup of the shop's database, and a weekly copy of the uploads.
# Installed at /root/backup-db.sh on the VPS, run from root's crontab.
#
#   /var/backups/menzu/db/menzu-YYYYmmdd-HHMM.dump   pg_dump custom format, 14 kept
#   /var/backups/menzu/uploads/uploads-YYYYmmdd.tgz  Sundays only, 4 kept
#
# The database dump is also sent to the shop admins' Telegram chats through
# the bot, so a copy lives off the machine without any new account. Uploads
# are too big for that (Telegram stops at 50 MB) and stay on the VPS.
#
# While it is at it, the script looks at the site's certificate: Caddy renews
# it a month before it runs out, so fewer than 20 days left means renewal has
# been failing and someone should read `journalctl -u caddy` before the site
# goes dark behind Cloudflare's Full (strict) check.
#
# Restore the database (stops the app, drops nothing by hand):
#   docker compose -f /root/menzu-clone/docker-compose.yml stop app
#   docker exec -i menzu-postgres pg_restore -U menzu -d menzu --clean --if-exists < /var/backups/menzu/db/<file>.dump
#   docker compose -f /root/menzu-clone/docker-compose.yml start app
# Restore uploads: tar -xzf <file>.tgz -C /var/www/menzu
set -u
ROOT=/var/backups/menzu
LOG=/var/log/menzu-backup.log
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "$ROOT/db" "$ROOT/uploads"
log() { echo "$(date '+%F %T') $*" >> "$LOG"; }

# --- who to tell: every human admin of the Telegram channel ------------------
T=$(docker exec menzu-postgres psql -U menzu -d menzu -Atc "select value from settings where key='integrations.telegram.botToken'" 2>/dev/null)
C=$(docker exec menzu-postgres psql -U menzu -d menzu -Atc "select value from settings where key='integrations.telegram.chatId'" 2>/dev/null)
ADMINS=""
if [ -n "$T" ] && [ -n "$C" ]; then
  ADMINS=$(curl -sS -m 20 "https://api.telegram.org/bot$T/getChatAdministrators?chat_id=$C" \
    | grep -o '"user":{"id":[0-9]*,"is_bot":false' | grep -o '[0-9]\+' )
fi
tell() {
  for U in $ADMINS; do
    curl -sS -m 20 -o /dev/null -F "chat_id=$U" -F "text=$1" "https://api.telegram.org/bot$T/sendMessage"
  done
}

# --- database ---------------------------------------------------------------
DB="$ROOT/db/menzu-$STAMP.dump"
if docker exec menzu-postgres pg_dump -U menzu -d menzu -Fc > "$DB" 2>>"$LOG"; then
  SIZE=$(wc -c < "$DB")
  log "db dump ok: $DB ($SIZE bytes)"
else
  log "db dump FAILED"
  rm -f "$DB"
  tell "Sao luu database dem nay THAT BAI. Xem /var/log/menzu-backup.log tren VPS."
  exit 1
fi
# Keep the newest 14.
ls -1t "$ROOT"/db/menzu-*.dump 2>/dev/null | tail -n +15 | xargs -r rm -f

# --- off the machine: the dump to the admins --------------------------------
if [ -n "$ADMINS" ] && [ "$SIZE" -lt 49000000 ]; then
  for U in $ADMINS; do
    R=$(curl -sS -m 120 -F "chat_id=$U" -F "document=@$DB" \
      -F "caption=Sao luu database $STAMP ($((SIZE/1024)) KB). Giu file nay o noi an toan." \
      "https://api.telegram.org/bot$T/sendDocument" | grep -o '"ok":[a-z]*')
    log "telegram copy to $U: $R"
  done
fi

# --- uploads, Sundays -------------------------------------------------------
if [ "$(date +%u)" = "7" ]; then
  UP="$ROOT/uploads/uploads-$(date +%Y%m%d).tgz"
  if tar -czf "$UP" -C /var/www/menzu uploads 2>>"$LOG"; then
    log "uploads archive ok: $UP ($(wc -c < "$UP") bytes)"
  else
    log "uploads archive FAILED"
  fi
  ls -1t "$ROOT"/uploads/uploads-*.tgz 2>/dev/null | tail -n +5 | xargs -r rm -f
fi

# --- certificate: shout before it runs out ----------------------------------
DOMAIN=$(grep '^NEXT_PUBLIC_SITE_URL=' /root/menzu-clone/.env 2>/dev/null | sed 's#.*://##; s#/.*##')
if [ -n "$DOMAIN" ]; then
  END=$(echo | openssl s_client -connect localhost:443 -servername "$DOMAIN" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -n "$END" ]; then
    DAYS=$(( ($(date -d "$END" +%s) - $(date +%s)) / 86400 ))
    log "certificate for $DOMAIN: $DAYS days left"
    if [ "$DAYS" -lt 20 ]; then
      tell "Chung chi HTTPS cua $DOMAIN chi con $DAYS ngay va chua duoc gia han. Tren VPS chay: journalctl -u caddy --since -1d | grep -i -e error -e renew"
    fi
  else
    log "certificate for $DOMAIN: could not read"
  fi
fi

log "done; disk: $(df -h / | awk 'NR==2{print $5" used"}')"

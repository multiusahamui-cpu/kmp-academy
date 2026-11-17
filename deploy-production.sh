#!/bin/bash
# ============================================================
# deploy-production.sh — Deploy KMP-ADNG Academy (academy.digitalcoop.id)
#
# Pola sama dengan deploy-production.sh garuda-superapp, tetapi untuk Academy:
#   - kode (clone git) + .env  : /var/www/garuda-academy
#   - frontend (nginx)         : /var/www/academy-portal
#   - proses pm2               : garuda-academy (port 5100, 127.0.0.1)
# Tidak menyentuh digitalcoop.id (port 5000, pm2 digitalcoop-main).
#
# Dijalankan MANUAL di VPS lewat SSH:
#   cd /var/www/garuda-academy && ./deploy-production.sh
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[⚠]${NC} $1"; }
log_error()   { echo -e "${RED}[✗]${NC} $1"; }

# Config
APP_PATH="${APP_PATH:=/var/www/garuda-academy}"
PORTAL_PUBLISH_DIR="${PORTAL_PUBLISH_DIR:=/var/www/academy-portal}"
PM2_NAME="garuda-academy"
DEPLOY_LOG="${APP_PATH}/logs/deploy.log"
MAX_BACKUPS=5
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:=http://127.0.0.1:5100/api/health}"
HEALTH_CHECK_TIMEOUT=60

mkdir -p "${APP_PATH}/logs"

# ============================================================
# Step 1: Backup versi berjalan
# ============================================================
backup_current() {
  log_info "Creating backup of current deployment..."

  if [ -d "${APP_PATH}/dist" ]; then
    BACKUP_DIR="${APP_PATH}/.backups/backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "${APP_PATH}/.backups"
    cp -r "${APP_PATH}/dist" "$BACKUP_DIR"
    log_success "Backup created at: $BACKUP_DIR"

    BACKUP_COUNT=$(ls -d "${APP_PATH}/.backups"/backup-* 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
      log_warn "Cleaning up old backups (keeping $MAX_BACKUPS)..."
      ls -d "${APP_PATH}/.backups"/backup-* | sort -r | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -rf
    fi
  else
    log_warn "No previous dist directory found, skipping backup"
  fi
}

# ============================================================
# Step 2: Ambil kode terbaru (git pull)
# ============================================================
pull_latest() {
  log_info "Pulling latest source from origin/main..."

  cd "${APP_PATH}"
  git fetch origin main
  git reset --hard origin/main

  log_success "Source updated to $(git rev-parse --short HEAD)"
}

# ============================================================
# Step 3: Install dependencies
# ============================================================
install_deps() {
  log_info "Installing dependencies (pnpm)..."

  cd "${APP_PATH}"
  # Full install (bukan --prod): build butuh devDependencies (vite, esbuild, tailwindcss, ...)
  pnpm install --frozen-lockfile

  log_success "Dependencies installed"
}

# ============================================================
# Step 4: Build (frontend -> dist/public, backend -> dist/server.mjs)
# ============================================================
build_app() {
  log_info "Building application..."

  cd "${APP_PATH}"
  pnpm run build

  if [ ! -f "${APP_PATH}/dist/public/index.html" ] || [ ! -f "${APP_PATH}/dist/server.mjs" ]; then
    log_error "Build tidak menghasilkan dist/public/index.html dan dist/server.mjs"
    return 1
  fi

  log_success "Build completed"
}

# CATATAN: migrasi database SENGAJA tidak dijalankan otomatis (sama dengan
# digitalcoop.id). Bila deploy membawa perubahan skema, jalankan dulu secara
# manual setelah ditinjau:  pnpm db:migrate

# ============================================================
# Step 5: Restart PM2 (hanya proses Academy)
# ============================================================
restart_pm2() {
  log_info "Restarting PM2 (${PM2_NAME})..."

  cd "${APP_PATH}"

  if pm2 describe "${PM2_NAME}" > /dev/null 2>&1; then
    pm2 restart ecosystem.config.cjs --env production --update-env
    log_success "PM2 restarted"
  else
    pm2 start ecosystem.config.cjs --env production
    log_success "PM2 started"
  fi

  pm2 save
}

# ============================================================
# Step 6: Health check
# ============================================================
health_check() {
  log_info "Running health check..."

  START_TIME=$(date +%s)
  ATTEMPT=0
  MAX_ATTEMPTS=$((HEALTH_CHECK_TIMEOUT / 2))

  while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -f -s -m 5 "${HEALTH_CHECK_URL}" > /dev/null 2>&1; then
      log_success "Health check passed!"
      return 0
    fi

    ATTEMPT=$((ATTEMPT + 1))
    ELAPSED=$(($(date +%s) - START_TIME))
    log_warn "Health check attempt $ATTEMPT/$MAX_ATTEMPTS (${ELAPSED}s elapsed)..."
    sleep 2
  done

  log_error "Health check failed after ${HEALTH_CHECK_TIMEOUT}s"
  return 1
}

# ============================================================
# Step 7: Publikasikan frontend ke folder nginx (tukar atomik, simpan .prev)
# ============================================================
publish_portal() {
  local build_dir="${APP_PATH}/dist/public"
  log_info "Publishing frontend ke ${PORTAL_PUBLISH_DIR}..."
  rm -rf "${PORTAL_PUBLISH_DIR}.new"
  cp -r "${build_dir}" "${PORTAL_PUBLISH_DIR}.new"
  rm -rf "${PORTAL_PUBLISH_DIR}.prev"
  if [ -d "${PORTAL_PUBLISH_DIR}" ]; then
    mv "${PORTAL_PUBLISH_DIR}" "${PORTAL_PUBLISH_DIR}.prev"
  fi
  mv "${PORTAL_PUBLISH_DIR}.new" "${PORTAL_PUBLISH_DIR}"
  log_success "Frontend dipublikasikan (versi sebelumnya: ${PORTAL_PUBLISH_DIR}.prev)"
}

# ============================================================
# Rollback (jika ada error)
# ============================================================
rollback() {
  log_error "Deployment failed! Rolling back..."

  LATEST_BACKUP=$(ls -d "${APP_PATH}/.backups"/backup-* 2>/dev/null | sort -r | head -n1)

  if [ -n "$LATEST_BACKUP" ]; then
    rm -rf "${APP_PATH}/dist"
    cp -r "$LATEST_BACKUP" "${APP_PATH}/dist"
    log_info "Restored backup from: $LATEST_BACKUP"

    restart_pm2

    if health_check; then
      log_success "Rollback successful"
      return 0
    fi
  fi

  log_error "Rollback failed! Manual intervention needed."
  return 1
}

# ============================================================
# Main
# ============================================================
main() {
  log_info "=== Starting Academy Production Deployment ==="
  log_info "Application Path: ${APP_PATH}"
  log_info "Started at: $(date)"
  echo ""

  trap 'rollback' ERR

  backup_current
  pull_latest
  install_deps
  build_app
  restart_pm2

  if health_check; then
    publish_portal      # frontend dipublikasikan hanya bila backend sehat
    log_success "=== Deployment Completed Successfully ==="
    exit 0
  else
    log_error "=== Health Check Failed ==="
    exit 1
  fi
}

main 2>&1 | tee -a "${DEPLOY_LOG}"
EXIT_CODE=${PIPESTATUS[0]}

{
  echo "Exit Code: $EXIT_CODE"
  echo "Completed at: $(date)"
  echo "---"
} >> "${DEPLOY_LOG}"

exit $EXIT_CODE

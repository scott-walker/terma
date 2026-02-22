#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}→${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}!${NC} $*"; }
err()   { echo -e "${RED}✗${NC} $*" >&2; }

# ── Usage ──
usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS] [VERSION]

Bump version and build Terma for production.

VERSION can be:
  patch          1.0.0 → 1.0.1  (default)
  minor          1.0.0 → 1.1.0
  major          1.0.0 → 2.0.0
  X.Y.Z          set exact version

OPTIONS:
  --linux        build only for Linux (deb)
  --mac          build only for macOS (dmg + zip)
  --win          build only for Windows (nsis)
  --all          build for all platforms (default)
  --no-bump      skip version bump
  --dry-run      show what would be done, don't execute
  -h, --help     show this help
EOF
  exit 0
}

# ── Parse args ──
BUMP="patch"
TARGETS=()
NO_BUMP=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --linux)   TARGETS+=(linux);  shift ;;
    --mac)     TARGETS+=(mac);    shift ;;
    --win)     TARGETS+=(win);    shift ;;
    --all)     TARGETS=(linux mac win); shift ;;
    --no-bump) NO_BUMP=true;      shift ;;
    --dry-run) DRY_RUN=true;      shift ;;
    -h|--help) usage ;;
    patch|minor|major) BUMP="$1"; shift ;;
    [0-9]*)    BUMP="$1";         shift ;;
    *) err "Unknown option: $1"; usage ;;
  esac
done

# Default: all platforms
if [[ ${#TARGETS[@]} -eq 0 ]]; then
  TARGETS=(linux mac win)
fi

# ── Read current version ──
CURRENT=$(node -p "require('./package.json').version")
info "Current version: ${CYAN}${CURRENT}${NC}"

# ── Compute new version ──
if [[ "$NO_BUMP" == true ]]; then
  NEW_VERSION="$CURRENT"
  info "Skipping version bump"
else
  IFS='.' read -r V_MAJOR V_MINOR V_PATCH <<< "$CURRENT"
  case "$BUMP" in
    patch) NEW_VERSION="${V_MAJOR}.${V_MINOR}.$((V_PATCH + 1))" ;;
    minor) NEW_VERSION="${V_MAJOR}.$((V_MINOR + 1)).0" ;;
    major) NEW_VERSION="$((V_MAJOR + 1)).0.0" ;;
    *)
      # Validate semver format
      if [[ ! "$BUMP" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        err "Invalid version: $BUMP (expected X.Y.Z)"
        exit 1
      fi
      NEW_VERSION="$BUMP"
      ;;
  esac
  ok "New version: ${GREEN}${NEW_VERSION}${NC}"
fi

# ── Build target flags ──
build_targets() {
  local flags=()
  for t in "${TARGETS[@]}"; do
    case "$t" in
      linux) flags+=(--linux deb) ;;
      mac)   flags+=(--mac dmg zip) ;;
      win)   flags+=(--win nsis) ;;
    esac
  done
  echo "${flags[@]}"
}

TARGET_STR=$(printf '%s ' "${TARGETS[@]}")
info "Platforms: ${CYAN}${TARGET_STR}${NC}"

if [[ "$DRY_RUN" == true ]]; then
  warn "Dry run — no changes will be made"
  echo ""
  echo "  Version: ${CURRENT} → ${NEW_VERSION}"
  echo "  Platforms: ${TARGET_STR}"
  echo "  Commands:"
  [[ "$NO_BUMP" != true ]] && echo "    npm version ${NEW_VERSION} --no-git-tag-version"
  echo "    npx electron-vite build"
  echo "    npx electron-builder $(build_targets)"
  exit 0
fi

# ── Bump version ──
if [[ "$NO_BUMP" != true ]]; then
  npm version "$NEW_VERSION" --no-git-tag-version > /dev/null
  ok "package.json updated to ${NEW_VERSION}"
fi

# ── Build app ──
info "Building app with electron-vite..."
npx electron-vite build
ok "electron-vite build complete"

# ── Package ──
info "Packaging for: ${TARGET_STR}..."
# shellcheck disable=SC2046
npx electron-builder $(build_targets)
ok "Build complete!"

# ── Summary ──
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  Terma v${NEW_VERSION} built successfully${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo ""
info "Output directory: ${CYAN}dist/${NC}"
ls -1 dist/ 2>/dev/null | while read -r f; do
  SIZE=$(du -h "dist/$f" 2>/dev/null | cut -f1)
  echo "  $f  ($SIZE)"
done

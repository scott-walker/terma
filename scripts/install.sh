#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="terma"

BIN_DIR="$HOME/.local/bin"
ICONS_BASE="$HOME/.local/share/icons/hicolor"
DESKTOP_DIR="$HOME/.local/share/applications"

echo "==> Building ${APP_NAME}..."
cd "$PROJECT_DIR"
npm run build

echo "==> Generating icons..."
"$PROJECT_DIR/node_modules/.bin/electron" "$PROJECT_DIR/scripts/gen-icon.js" --no-sandbox --disable-gpu 2>/dev/null

echo "==> Installing icons..."
mkdir -p "$ICONS_BASE/scalable/apps"
cp "$PROJECT_DIR/assets/icon.svg" "$ICONS_BASE/scalable/apps/${APP_NAME}.svg"
for size in 48 128 256 512; do
  dir="$ICONS_BASE/${size}x${size}/apps"
  mkdir -p "$dir"
  cp "$PROJECT_DIR/assets/icon-${size}.png" "$dir/${APP_NAME}.png"
done

echo "==> Installing launcher..."
mkdir -p "$BIN_DIR"
cat > "$BIN_DIR/$APP_NAME" <<EOF
#!/usr/bin/env bash
export ELECTRON_OZONE_PLATFORM_HINT=auto
exec "$PROJECT_DIR/node_modules/.bin/electron" "$PROJECT_DIR/out/main/index.js" --no-sandbox --disable-features=SystemdCgroupScope "\$@" 2>/dev/null
EOF
chmod +x "$BIN_DIR/$APP_NAME"

echo "==> Installing desktop entry..."
mkdir -p "$DESKTOP_DIR"
cat > "$DESKTOP_DIR/${APP_NAME}.desktop" <<EOF
[Desktop Entry]
Name=Terma
Comment=Modern terminal emulator
Exec=$BIN_DIR/$APP_NAME %U
Icon=$APP_NAME
Terminal=false
Type=Application
Categories=System;TerminalEmulator;
StartupWMClass=terma
Keywords=terminal;shell;console;
EOF

update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
gtk-update-icon-cache -f -t "$ICONS_BASE" 2>/dev/null || true
xdg-desktop-menu forceupdate 2>/dev/null || true

echo ""
echo "Done! Terma installed."
echo "  Run 'terma' or find it in the app menu."

#!/bin/bash

# Enable Electron sandbox (requires SUID bit on chrome-sandbox)
SANDBOX="/opt/Terma/chrome-sandbox"
if [ -f "$SANDBOX" ]; then
  chown root:root "$SANDBOX"
  chmod 4755 "$SANDBOX"
fi

APP_DIR="/opt/Terma/resources"

# Install correct .desktop file (overwrite electron-builder's broken one)
DESKTOP_SRC="$APP_DIR/terma.desktop"
DESKTOP_DST="/usr/share/applications/terma.desktop"
if [ -f "$DESKTOP_SRC" ]; then
  cp "$DESKTOP_SRC" "$DESKTOP_DST"
  chmod 644 "$DESKTOP_DST"
fi

# Install AppStream metainfo for GNOME Software / KDE Discover
METAINFO_SRC="$APP_DIR/com.terma.app.metainfo.xml"
METAINFO_DST="/usr/share/metainfo/com.terma.app.metainfo.xml"
if [ -f "$METAINFO_SRC" ]; then
  mkdir -p /usr/share/metainfo
  cp "$METAINFO_SRC" "$METAINFO_DST"
  chmod 644 "$METAINFO_DST"
fi

update-desktop-database /usr/share/applications 2>/dev/null || true
gtk-update-icon-cache -f -t /usr/share/icons/hicolor 2>/dev/null || true

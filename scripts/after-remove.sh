#!/bin/bash

# Remove AppStream metainfo
rm -f /usr/share/metainfo/com.terma.app.metainfo.xml

# Remove cached icons
for SIZE in 64 128 256; do
  rm -f "/usr/share/app-info/icons/hicolor/$SIZEx$SIZE/com.terma.app.png"
done

# Desktop file is removed by dpkg since it's in the package manifest
update-desktop-database /usr/share/applications 2>/dev/null || true
gtk-update-icon-cache -f -t /usr/share/icons/hicolor 2>/dev/null || true

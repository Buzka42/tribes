#!/bin/bash
# Write Mapbox Downloads Token to Gradle credentials
# so the Mapbox Maven repo can authenticate during the Android build.
if [ -n "$MAPBOX_DOWNLOADS_TOKEN" ]; then
  mkdir -p ~/.gradle
  # Remove any existing entry first to avoid duplicates on retries
  grep -v "MAPBOX_DOWNLOADS_TOKEN" ~/.gradle/gradle.properties > /tmp/gradle.properties.tmp 2>/dev/null || true
  echo "MAPBOX_DOWNLOADS_TOKEN=${MAPBOX_DOWNLOADS_TOKEN}" >> /tmp/gradle.properties.tmp
  mv /tmp/gradle.properties.tmp ~/.gradle/gradle.properties
  echo "✓ Mapbox Downloads Token written to ~/.gradle/gradle.properties"
else
  echo "✗ MAPBOX_DOWNLOADS_TOKEN is not set — Mapbox Maven will fail with 401"
  exit 1
fi

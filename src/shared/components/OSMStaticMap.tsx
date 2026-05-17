import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { MapPin } from 'lucide-react-native';
import { tokens } from '@shared/theme/tokens';

export interface OSMStaticMapProps {
  latitude: number;
  longitude: number;
  /** Default 16 — street-level */
  zoom?: number;
  /** Default 220 */
  height?: number;
}

function buildHtml(lat: number, lon: number, zoom: number): string {
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0;padding:0;background:#e5e7eb}</style>
</head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map=L.map('map',{zoomControl:false,attributionControl:false,dragging:true,tap:false}).setView([${lat},${lon}],${zoom});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
L.marker([${lat},${lon}]).addTo(map);
</script>
</body></html>`;
}

export function OSMStaticMap({
  latitude,
  longitude,
  zoom = 16,
  height = 220,
}: OSMStaticMapProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={[styles.fallback, { height }]}>
        <MapPin size={28} color={tokens.semantic.fg3} />
        <Text style={styles.fallbackText}>Peta tidak tersedia (offline)</Text>
        <Text style={styles.coords}>
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html: buildHtml(latitude, longitude, zoom) }}
        style={styles.web}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
        scrollEnabled={false}
        scalesPageToFit={false}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    backgroundColor: '#e5e7eb',
  },
  web: { flex: 1 },
  fallback: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    backgroundColor: tokens.semantic.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sp2,
  },
  fallbackText: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg3 },
  coords: { fontFamily: tokens.font.mono, fontSize: tokens.fontSize.caption, color: tokens.semantic.fg3 },
});

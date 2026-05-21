import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { tokens } from '@shared/theme/tokens';

export interface OSMStaticImageProps {
  latitude: number;
  longitude: number;
  /** Default 16 — street-level */
  zoom?: number;
  /** Ukuran container (w=h) dalam pt. Default 120. */
  size?: number;
  /**
   * Fire ketika semua tile resolved (load sukses atau error). Dipakai supaya
   * captureRef di parent menunggu sampai map siap di-snapshot — di physical
   * device tile CDN bisa loading 1-3 detik, capture terlalu cepat menyebabkan
   * view-shot throw "Unable to snapshot view" di Android PixelCopy.
   */
  onReady?: () => void;
}

const TILE = 256;

function tileUrl(z: number, x: number, y: number): string {
  // Carto Voyager raster basemap — OSM data, free untuk commercial use dengan
  // attribution, CDN reliable. Path harus `rastertiles/voyager` (bukan cuma
  // `voyager` — itu vector endpoint, kembalikan 404 untuk PNG).
  return `https://a.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`;
}

/** Web Mercator: lon/lat → global pixel position pada zoom level tertentu. */
function project(lon: number, lat: number, zoom: number): { px: number; py: number } {
  const n = 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  const px = ((lon + 180) / 360) * n * TILE;
  const py =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * TILE;
  return { px, py };
}

interface TilePos {
  key: string;
  uri: string;
  left: number;
  top: number;
}

function computeTiles(
  latitude: number,
  longitude: number,
  zoom: number,
  size: number,
): TilePos[] {
  const { px, py } = project(longitude, latitude, zoom);
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  const fx = px - tx * TILE;
  const fy = py - ty * TILE;
  // Pilih tile tetangga di sisi yang sama dengan target — supaya 2×2 grid
  // selalu menutupi viewport meskipun target dekat dengan tepi tile.
  const txN = fx > TILE / 2 ? tx + 1 : tx - 1;
  const tyN = fy > TILE / 2 ? ty + 1 : ty - 1;
  const xs = [Math.min(tx, txN), Math.max(tx, txN)];
  const ys = [Math.min(ty, tyN), Math.max(ty, tyN)];
  const half = size / 2;
  const result: TilePos[] = [];
  for (const tileX of xs) {
    for (const tileY of ys) {
      result.push({
        key: `${zoom}-${tileX}-${tileY}`,
        uri: tileUrl(zoom, tileX, tileY),
        left: tileX * TILE - px + half,
        top: tileY * TILE - py + half,
      });
    }
  }
  return result;
}

const MARKER_SIZE = 22;

export function OSMStaticImage({
  latitude,
  longitude,
  zoom = 16,
  size = 120,
  onReady,
}: OSMStaticImageProps): React.JSX.Element {
  const [errorCount, setErrorCount] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);

  const tiles = useMemo(
    () => computeTiles(latitude, longitude, zoom, size),
    [latitude, longitude, zoom, size],
  );

  // Reset counter ketika tiles berubah (koordinat/zoom/size berubah → re-fetch).
  useEffect(() => {
    setErrorCount(0);
    setLoadedCount(0);
  }, [tiles]);

  // Fire onReady ketika semua tile resolved (load sukses + error).
  const resolvedCount = loadedCount + errorCount;
  useEffect(() => {
    if (tiles.length > 0 && resolvedCount >= tiles.length) {
      onReady?.();
    }
  }, [resolvedCount, tiles.length, onReady]);

  // Semua tile gagal → tampilkan fallback coords. Kalau cuma sebagian, tile
  // lain yang berhasil tetap render — background surface2 menutupi gap.
  if (errorCount >= tiles.length) {
    return (
      <View style={[styles.fallback, { width: size, height: size }]}>
        <MapPin size={20} color={tokens.semantic.fg3} />
        <Text style={styles.coords} numberOfLines={1}>
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {tiles.map((t) => (
        <Image
          key={t.key}
          source={{ uri: t.uri }}
          style={[styles.tile, { left: t.left, top: t.top }]}
          onLoad={() => setLoadedCount((n) => n + 1)}
          onError={() => setErrorCount((n) => n + 1)}
        />
      ))}
      <View pointerEvents="none" style={styles.markerWrap}>
        <MapPin
          size={MARKER_SIZE}
          color={tokens.color.error}
          fill={tokens.color.error}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.semantic.surface2,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    overflow: 'hidden',
  },
  tile: {
    position: 'absolute',
    width: TILE,
    height: TILE,
  },
  markerWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    // Geser supaya ujung pin (bottom-center icon) tepat di view center
    transform: [{ translateX: -MARKER_SIZE / 2 }, { translateY: -MARKER_SIZE }],
  },
  fallback: {
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.semantic.surface2,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sp1,
    padding: tokens.spacing.sp2,
  },
  coords: {
    fontFamily: tokens.font.mono,
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.semantic.fg3,
    textAlign: 'center',
  },
});

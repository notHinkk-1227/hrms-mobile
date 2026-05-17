import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { tokens } from '@shared/theme/tokens';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  name: string;
  /** URL absolut atau path Frappe (/files/...) — kalau ada akan tampil; fallback initials. */
  imageUri?: string | null;
  size?: AvatarSize;
  style?: ViewStyle;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZE_PX: Record<AvatarSize, number> = { sm: 28, md: 36, lg: 48, xl: 88 };
const FONT_PX: Record<AvatarSize, number> = { sm: 11, md: 13, lg: 16, xl: 28 };

export function Avatar({ name, imageUri, size = 'md', style }: AvatarProps): React.JSX.Element {
  const [imgError, setImgError] = useState(false);
  const px = SIZE_PX[size];
  const radius = px / 2;
  const showImage = Boolean(imageUri) && !imgError;
  return (
    <View
      style={[
        styles.base,
        {
          width: px,
          height: px,
          borderRadius: radius,
          backgroundColor: tokens.color.blue50,
        },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: imageUri as string }}
          style={[styles.image, { width: px, height: px, borderRadius: radius }]}
          onError={() => setImgError(true)}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: FONT_PX[size] }]}>
          {initialsFromName(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {},
  initials: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    color: tokens.color.blue700,
  },
});

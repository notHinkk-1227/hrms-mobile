import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { pick, types } from '@react-native-documents/picker';
import { FileText, Paperclip, Trash2 } from 'lucide-react-native';
import { tokens } from '@shared/theme/tokens';
import { uploadFile, UploadedFile } from '@infrastructure/api/uploadClient';

export interface AttachmentRowProps {
  /** Attached file info kalau sudah upload. */
  file?: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  label?: string;
  /** Optional doctype + name untuk link file ke doc spesifik. */
  attachToDoctype?: string;
  attachToName?: string;
  disabled?: boolean;
}

export function AttachmentRow({
  file,
  onChange,
  label = 'Lampiran',
  attachToDoctype,
  attachToName,
  disabled,
}: AttachmentRowProps): React.JSX.Element {
  const [uploading, setUploading] = useState(false);

  const onPick = async () => {
    if (disabled || uploading) return;
    try {
      const [result] = await pick({ type: [types.images, types.pdf] });
      if (!result) return;
      setUploading(true);
      const uploaded = await uploadFile({
        uri: result.uri,
        name: result.name ?? 'attachment',
        type: result.type ?? 'application/octet-stream',
        attachToDoctype,
        attachToName,
      });
      onChange(uploaded);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Gagal upload lampiran';
      Alert.alert('Upload gagal', message);
    } finally {
      setUploading(false);
    }
  };

  const onRemove = () => {
    onChange(null);
  };

  if (file) {
    return (
      <View style={styles.attached}>
        {file.is_image ? (
          <Image source={{ uri: file.file_url }} style={styles.thumb} />
        ) : (
          <View style={styles.thumb}>
            <FileText size={24} color={tokens.semantic.fg3} />
          </View>
        )}
        <View style={styles.attachedText}>
          <Text style={styles.attachedName} numberOfLines={1}>
            {file.file_name}
          </Text>
          <Text style={styles.attachedSize}>{(file.file_size / 1024).toFixed(0)} KB</Text>
        </View>
        <Pressable onPress={onRemove} hitSlop={12}>
          <Trash2 size={20} color={tokens.color.error} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={onPick}
        disabled={disabled || uploading}
        style={({ pressed }) => [
          styles.picker,
          pressed && styles.pickerPressed,
          (disabled || uploading) && styles.pickerDisabled,
        ]}
      >
        <Paperclip size={18} color={tokens.semantic.brand} />
        <Text style={styles.pickerText}>
          {uploading ? 'Mengupload…' : 'Pilih file (gambar atau PDF)'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, width: '100%' },
  label: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg2,
    fontWeight: '600',
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp2,
    height: 48,
    paddingHorizontal: tokens.spacing.sp3,
    borderWidth: 1,
    borderColor: tokens.color.blue200,
    borderStyle: 'dashed',
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.blue50,
  },
  pickerPressed: { backgroundColor: tokens.color.blue100 },
  pickerDisabled: { opacity: 0.6 },
  pickerText: { fontSize: tokens.fontSize.body, color: tokens.semantic.brand, fontWeight: '600' },
  attached: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp3,
    padding: tokens.spacing.sp2,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.semantic.surface2,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.color.ink100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachedText: { flex: 1 },
  attachedName: { fontSize: tokens.fontSize.body, color: tokens.semantic.fg1, fontWeight: '500' },
  attachedSize: { fontSize: tokens.fontSize.caption, color: tokens.semantic.fg3 },
});

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AlertCircle, FileText, Image as ImageIcon, Paperclip } from 'lucide-react-native';
import { Button } from '@shared/components/Button';
import { Screen } from '@shared/components/Screen';
import { FormHeader } from '@features/forms/FormHeader';
import { useToast } from '@shared/components/Toast';
import { tokens } from '@shared/theme/tokens';
import { persist, StorageKeys } from '@infrastructure/storage/mmkv';
import { inboxApi, AnnouncementDetail, AnnouncementAttachment } from '@infrastructure/api/inboxClient';
import { inboxRead } from '@infrastructure/storage/inboxRead';
import { ApiError } from '@infrastructure/api/errors';
import type { HomeStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'InboxDetail'>;

const PRIORITY_LABEL: Record<string, string> = {
  High: 'Penting',
  Normal: 'Normal',
  Low: 'Info',
};

const PRIORITY_BG: Record<string, string> = {
  High: tokens.color.errorTint,
  Normal: tokens.color.blue50 ?? tokens.color.ink50,
  Low: tokens.color.ink50,
};

const PRIORITY_FG: Record<string, string> = {
  High: tokens.color.error,
  Normal: tokens.semantic.brand,
  Low: tokens.semantic.fg2,
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T'));
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T'));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatBytes(n: number | null): string {
  if (!n || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(fname: string): boolean {
  return /\.(png|jpe?g|gif|webp|heic|bmp)$/i.test(fname);
}

export function InboxDetailScreen({ navigation, route }: Props): React.JSX.Element {
  const { name } = route.params;
  const toast = useToast();
  const [detail, setDetail] = useState<AnnouncementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await inboxApi.getDetail(name);
      setDetail(data);
      inboxRead.markRead(name);
    } catch (e) {
      const apiError = e as ApiError;
      setError(apiError.message || 'Gagal memuat pengumuman');
    } finally {
      setLoading(false);
    }
  }, [name]);

  useEffect(() => {
    load();
  }, [load]);

  const openAttachment = useCallback(
    async (att: AnnouncementAttachment) => {
      const tenantUrl = persist.getString(StorageKeys.TENANT_URL);
      if (!tenantUrl) {
        toast.show({ variant: 'error', title: 'Gagal buka file', message: 'Sesi tidak valid' });
        return;
      }
      let url = att.file_url;
      if (url.startsWith('/')) {
        url = `${tenantUrl}${url}`;
      }
      try {
        await Linking.openURL(url);
      } catch {
        toast.show({
          variant: 'error',
          title: 'Tidak bisa buka file',
          message: 'Browser/aplikasi viewer tidak tersedia.',
        });
      }
    },
    [toast],
  );

  return (
    <Screen padded={false}>
      <View style={styles.headerWrap}>
        <FormHeader title="Detail Pengumuman" onBack={() => navigation.goBack()} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={tokens.semantic.brand} size="large" />
        </View>
      ) : error ? (
        <View style={styles.errorBox}>
          <AlertCircle size={24} color={tokens.color.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Button variant="outline" size="md" onPress={load}>Coba Lagi</Button>
        </View>
      ) : detail ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.priorityRow}>
            <View
              style={[
                styles.priorityBadge,
                { backgroundColor: PRIORITY_BG[detail.priority] ?? tokens.color.ink50 },
              ]}
            >
              <Text
                style={[
                  styles.priorityText,
                  { color: PRIORITY_FG[detail.priority] ?? tokens.semantic.fg2 },
                ]}
              >
                {PRIORITY_LABEL[detail.priority] ?? detail.priority}
              </Text>
            </View>
          </View>

          <Text style={styles.subject}>{detail.subject}</Text>

          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>DARI</Text>
              <Text style={styles.metaValue}>{detail.author_full_name || 'Management'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>TANGGAL</Text>
              <Text style={styles.metaValue}>
                {formatDate(detail.published_at)} · {formatTime(detail.published_at)}
              </Text>
            </View>
          </View>

          <Text style={styles.body}>{detail.body}</Text>

          {detail.attachments.length > 0 ? (
            <View style={styles.attachSection}>
              <View style={styles.attachHeader}>
                <Paperclip size={16} color={tokens.semantic.fg2} />
                <Text style={styles.attachTitle}>Lampiran ({detail.attachments.length})</Text>
              </View>
              {detail.attachments.map((att) => {
                const Icon = isImage(att.file_name) ? ImageIcon : FileText;
                return (
                  <Pressable
                    key={att.name}
                    style={({ pressed }) => [styles.attachRow, pressed && styles.attachPressed]}
                    onPress={() => openAttachment(att)}
                  >
                    <View style={styles.attachIconWrap}>
                      <Icon size={20} color={tokens.semantic.brand} />
                    </View>
                    <View style={styles.attachMeta}>
                      <Text style={styles.attachName} numberOfLines={1}>
                        {att.file_name}
                      </Text>
                      <Text style={styles.attachSize}>{formatBytes(att.file_size)}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: tokens.spacing.sp4, paddingTop: tokens.spacing.sp4 },
  scroll: {
    paddingHorizontal: tokens.spacing.sp4,
    paddingTop: tokens.spacing.sp3,
    paddingBottom: tokens.spacing.sp6,
    gap: tokens.spacing.sp3,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: {
    margin: tokens.spacing.sp4,
    padding: tokens.spacing.sp4,
    backgroundColor: tokens.color.errorTint,
    borderRadius: tokens.radius.md,
    gap: tokens.spacing.sp2,
    alignItems: 'flex-start',
  },
  errorText: { fontSize: tokens.fontSize.body, color: tokens.color.error },
  priorityRow: { flexDirection: 'row' },
  priorityBadge: {
    paddingHorizontal: tokens.spacing.sp2,
    paddingVertical: tokens.spacing.sp1,
    borderRadius: tokens.radius.full,
  },
  priorityText: {
    fontSize: tokens.fontSize.caption,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  subject: {
    fontSize: tokens.fontSize.h2,
    fontWeight: '800',
    color: tokens.semantic.fg1,
    lineHeight: 32,
  },
  metaCard: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    gap: tokens.spacing.sp2,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: {
    fontSize: tokens.fontSize.caption,
    fontWeight: '700',
    color: tokens.semantic.fg3,
    letterSpacing: 1,
  },
  metaValue: { fontSize: tokens.fontSize.small, color: tokens.semantic.fg1, fontWeight: '500' },
  body: {
    fontSize: tokens.fontSize.body,
    color: tokens.semantic.fg1,
    lineHeight: 24,
  },
  attachSection: { gap: tokens.spacing.sp2, marginTop: tokens.spacing.sp2 },
  attachHeader: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp2 },
  attachTitle: {
    fontSize: tokens.fontSize.small,
    fontWeight: '700',
    color: tokens.semantic.fg2,
    letterSpacing: 0.5,
  },
  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sp3,
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
  },
  attachPressed: { opacity: 0.7 },
  attachIconWrap: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.color.ink50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachMeta: { flex: 1, gap: 2 },
  attachName: { fontSize: tokens.fontSize.body, fontWeight: '600', color: tokens.semantic.fg1 },
  attachSize: { fontSize: tokens.fontSize.caption, color: tokens.semantic.fg3 },
});

import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Mail, Paperclip } from 'lucide-react-native';
import { EmptyState } from '@shared/components/EmptyState';
import { Screen } from '@shared/components/Screen';
import { SkeletonList } from '@shared/components/Skeleton';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { inboxApi, AnnouncementListItem, AnnouncementPriority } from '@infrastructure/api/inboxClient';
import { inboxRead } from '@infrastructure/storage/inboxRead';
import { ApiError } from '@infrastructure/api/errors';
import type { HomeStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'Inbox'>;

const PRIORITY_COLOR: Record<AnnouncementPriority, string> = {
  High: tokens.color.error,
  Normal: tokens.semantic.brand,
  Low: tokens.semantic.fg3,
};

function formatRelative(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T'));
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} jam lalu`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} hari lalu`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function InboxListScreen({ navigation }: Props): React.JSX.Element {
  const [rows, setRows] = useState<AnnouncementListItem[]>([]);
  const [readSet, setReadSet] = useState<Set<string>>(() => inboxRead.getReadSet());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await inboxApi.listPublished(50);
      setRows(data);
      setReadSet(inboxRead.getReadSet());
    } catch (e) {
      const apiError = e as ApiError;
      setError(apiError.message || 'Gagal memuat pengumuman');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh read set saat balik dari detail
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setReadSet(inboxRead.getReadSet());
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const renderItem = ({ item }: { item: AnnouncementListItem }) => {
    const isUnread = !readSet.has(item.name);
    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => navigation.navigate('InboxDetail', { name: item.name })}
      >
        <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLOR[item.priority] }]} />
        <View style={styles.rowBody}>
          <View style={styles.rowTopLine}>
            <Text
              style={[styles.subject, isUnread && styles.subjectUnread]}
              numberOfLines={1}
            >
              {item.subject}
            </Text>
            {item.has_attachments ? (
              <Paperclip size={14} color={tokens.semantic.fg3} />
            ) : null}
          </View>
          <Text style={styles.excerpt} numberOfLines={2}>
            {item.body_excerpt || '—'}
          </Text>
          <View style={styles.rowMeta}>
            <Text style={styles.metaText}>{item.author_full_name || 'Management'}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>{formatRelative(item.published_at)}</Text>
          </View>
        </View>
        {isUnread ? <View style={styles.unreadDot} /> : null}
      </Pressable>
    );
  };

  return (
    <Screen padded={false} bottomInset={false}>
      <View style={styles.headerWrap}>
        <FormHeader title="Inbox" onBack={() => navigation.goBack()} />
      </View>

      {loading ? (
        <View style={styles.padHorizontal}>
          <SkeletonList count={5} />
        </View>
      ) : error ? (
        <View style={styles.padHorizontal}>
          <EmptyState
            icon={<Mail size={36} color={tokens.semantic.fg3} />}
            title="Gagal memuat inbox"
            subtitle={error}
            cta={{ label: 'Coba lagi', onPress: load }}
          />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.padHorizontal}>
          <EmptyState
            icon={<Mail size={36} color={tokens.semantic.fg3} />}
            title="Belum ada pengumuman"
            subtitle="Pengumuman dari management akan muncul di sini."
          />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.name}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: tokens.spacing.sp4, paddingTop: tokens.spacing.sp4 },
  padHorizontal: { paddingHorizontal: tokens.spacing.sp4 },
  listContent: {
    paddingHorizontal: tokens.spacing.sp4,
    paddingBottom: tokens.spacing.sp4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: tokens.spacing.sp2,
    gap: tokens.spacing.sp3,
  },
  rowPressed: { opacity: 0.7 },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  rowBody: { flex: 1, gap: 4 },
  rowTopLine: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sp2 },
  subject: {
    flex: 1,
    fontSize: tokens.fontSize.body,
    fontWeight: '500',
    color: tokens.semantic.fg2,
  },
  subjectUnread: { fontWeight: '700', color: tokens.semantic.fg1 },
  excerpt: {
    fontSize: tokens.fontSize.small,
    color: tokens.semantic.fg3,
    lineHeight: 18,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: { fontSize: tokens.fontSize.caption, color: tokens.semantic.fg3 },
  metaDot: { fontSize: tokens.fontSize.caption, color: tokens.semantic.fg3 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: tokens.semantic.brand,
    marginTop: 6,
  },
  sep: { height: 1, backgroundColor: tokens.semantic.line },
});

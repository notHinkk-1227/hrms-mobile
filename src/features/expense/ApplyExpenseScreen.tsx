import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Plus, Trash2 } from 'lucide-react-native';
import { Button } from '@shared/components/Button';
import { Screen } from '@shared/components/Screen';
import { Select } from '@shared/components/Select';
import { DateField } from '@shared/components/DateField';
import { TextField } from '@shared/components/TextField';
import { CurrencyInput } from '@shared/components/CurrencyInput';
import { AttachmentRow } from '@shared/components/AttachmentRow';
import { FormHeader } from '@features/forms/FormHeader';
import { tokens } from '@shared/theme/tokens';
import { useAuthStore } from '@features/auth/store';
import { expenseApi, ExpenseClaimType } from '@infrastructure/api/hrmsClient';
import type { UploadedFile } from '@infrastructure/api/uploadClient';
import { ApiError } from '@infrastructure/api/errors';
import type { MainStackParamList } from '@app/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'ApplyExpense'>;

interface ItemDraft {
  id: string;
  expense_type: string | null;
  expense_date: string | null;
  description: string;
  amount: number | null;
  attachment: UploadedFile | null;
}

function makeEmptyItem(): ItemDraft {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    expense_type: null,
    expense_date: new Date().toISOString().slice(0, 10),
    description: '',
    amount: null,
    attachment: null,
  };
}

function formatRp(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function ApplyExpenseScreen({ navigation }: Props): React.JSX.Element {
  const employee = useAuthStore((s) => s.employee);

  const [types, setTypes] = useState<ExpenseClaimType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [items, setItems] = useState<ItemDraft[]>([makeEmptyItem()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    expenseApi
      .listTypes()
      .then(setTypes)
      .catch(() => Alert.alert('Gagal memuat tipe biaya', 'Coba lagi nanti'))
      .finally(() => setLoadingTypes(false));
  }, []);

  const total = items.reduce((sum, i) => sum + (i.amount ?? 0), 0);

  const updateItem = (id: string, patch: Partial<ItemDraft>) => {
    setItems((curr) => curr.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const removeItem = (id: string) => {
    setItems((curr) => (curr.length > 1 ? curr.filter((i) => i.id !== id) : curr));
  };

  const addItem = () => {
    setItems((curr) => [...curr, makeEmptyItem()]);
  };

  const onSubmit = async () => {
    if (!employee?.name) return;
    const incomplete = items.find(
      (i) => !i.expense_type || !i.expense_date || !i.description.trim() || !i.amount || i.amount <= 0,
    );
    if (incomplete) {
      Alert.alert('Item tidak lengkap', 'Pastikan semua item terisi lengkap dengan jumlah > 0.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await expenseApi.submit({
        employee: employee.name,
        posting_date: new Date().toISOString().slice(0, 10),
        expenses: items.map((i) => ({
          expense_type: i.expense_type!,
          expense_date: i.expense_date!,
          description: i.description.trim(),
          amount: i.amount!,
          attachment_url: i.attachment?.file_url,
        })),
      });
      navigation.replace('FormSuccess', {
        doctype: 'Expense Claim',
        name: result.name,
        title: 'Klaim Reimbursement Terkirim',
        message: `Total ${formatRp(total)} menunggu approval.`,
      });
    } catch (e) {
      const apiError = e as ApiError;
      Alert.alert('Gagal mengirim klaim', apiError.message || 'Coba lagi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <FormHeader
          title="Klaim Reimbursement"
          subtitle="Kumpulkan struk biaya"
          onBack={() => navigation.goBack()}
        />

        <View style={styles.itemList}>
          {items.map((item, idx) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemTitle}>Item {idx + 1}</Text>
                {items.length > 1 ? (
                  <Pressable onPress={() => removeItem(item.id)} hitSlop={12}>
                    <Trash2 size={18} color={tokens.color.error} />
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.itemForm}>
                <Select
                  label="Tipe Biaya"
                  value={item.expense_type}
                  options={types.map((t) => ({ value: t.name, label: t.name }))}
                  onChange={(v) => updateItem(item.id, { expense_type: v })}
                  placeholder={loadingTypes ? 'Memuat…' : 'Pilih tipe'}
                  loading={loadingTypes}
                />
                <DateField
                  label="Tanggal"
                  value={item.expense_date}
                  onChange={(v) => updateItem(item.id, { expense_date: v })}
                />
                <TextField
                  label="Keterangan"
                  value={item.description}
                  onChangeText={(t) => updateItem(item.id, { description: t })}
                  placeholder="Contoh: Makan siang klien Surabaya"
                />
                <CurrencyInput
                  label="Jumlah"
                  value={item.amount}
                  onChange={(v) => updateItem(item.id, { amount: v })}
                />
                <AttachmentRow
                  label="Struk (opsional)"
                  file={item.attachment}
                  onChange={(f) => updateItem(item.id, { attachment: f })}
                />
              </View>
            </View>
          ))}
        </View>

        <Pressable onPress={addItem} style={styles.addBtn}>
          <Plus size={18} color={tokens.semantic.brand} />
          <Text style={styles.addBtnText}>Tambah Item</Text>
        </Pressable>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL KLAIM</Text>
          <Text style={styles.totalValue}>Rp {formatRp(total)}</Text>
        </View>

        <View style={styles.cta}>
          <Button fullWidth onPress={onSubmit} loading={submitting}>
            Kirim Klaim
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: tokens.spacing.sp4, paddingBottom: tokens.spacing.sp5 },
  itemList: { gap: tokens.spacing.sp3 },
  itemCard: {
    padding: tokens.spacing.sp3,
    backgroundColor: tokens.semantic.surface,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.semantic.line,
    gap: tokens.spacing.sp3,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTitle: { fontSize: tokens.fontSize.h4, fontWeight: '700', color: tokens.semantic.fg1 },
  itemForm: { gap: tokens.spacing.sp3 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sp1,
    paddingVertical: tokens.spacing.sp3,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.blue50,
    borderWidth: 1,
    borderColor: tokens.color.blue100,
    borderStyle: 'dashed',
  },
  addBtnText: { fontSize: tokens.fontSize.body, color: tokens.semantic.brand, fontWeight: '700' },
  totalCard: {
    padding: tokens.spacing.sp4,
    backgroundColor: tokens.color.green600,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: tokens.fontSize.eyebrow,
    color: tokens.color.green100,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  totalValue: {
    fontSize: tokens.fontSize.h1,
    color: tokens.color.white,
    fontWeight: '800',
    fontFamily: tokens.font.mono,
  },
  cta: { gap: tokens.spacing.sp2 },
});

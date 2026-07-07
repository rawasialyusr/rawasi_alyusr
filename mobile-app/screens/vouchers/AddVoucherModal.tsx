import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../lib/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';

interface AddVoucherModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddVoucherModal({ visible, onClose, onSuccess }: AddVoucherModalProps) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('receipt'); // 'receipt' or 'payment'
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!amount.trim()) {
      Alert.alert('خطأ', 'يرجى إدخال المبلغ');
      return;
    }

    setLoading(true);
    try {
      const table = type === 'receipt' ? 'receipt_vouchers' : 'payment_vouchers';
      const numberField = type === 'receipt' ? 'receipt_number' : 'voucher_number';
      
      const { error } = await supabase
        .from(table)
        .insert({
          amount: parseFloat(amount),
          date: new Date().toISOString().split('T')[0],
          status: 'draft',
          [numberField]: `V-${Math.floor(Math.random() * 10000)}`
        });

      if (error) throw error;

      setAmount('');
      setType('receipt');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error adding voucher:', err);
      Alert.alert('خطأ', 'تعذر حفظ السند. يرجى المحاولة لاحقاً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.modalContainer}>
          
          <View style={styles.header}>
            <Text style={styles.title}>إنشاء سند جديد</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            
            <Text style={styles.label}>نوع السند</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity 
                style={[styles.typeBtn, type === 'receipt' && styles.typeBtnActiveReceipt]} 
                onPress={() => setType('receipt')}
              >
                <Text style={[styles.typeBtnText, type === 'receipt' && styles.typeBtnTextActiveReceipt]}>سند قبض (مقبوضات)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.typeBtn, type === 'payment' && styles.typeBtnActivePayment]} 
                onPress={() => setType('payment')}
              >
                <Text style={[styles.typeBtnText, type === 'payment' && styles.typeBtnTextActivePayment]}>سند صرف (مدفوعات)</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>المبلغ</Text>
            <View style={styles.amountContainer}>
              <Text style={styles.currency}>ر.س</Text>
              <TextInput 
                style={[styles.input, { flex: 1, marginBottom: 0, borderWidth: 0, backgroundColor: 'transparent', color: type === 'receipt' ? '#16a34a' : '#ea580c' }]} 
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                textAlign="right"
              />
            </View>

            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={handleSave}
              disabled={loading}
            >
              <LinearGradient colors={type === 'receipt' ? ['#16a34a', '#15803d'] : ['#ea580c', '#c2410c']} style={styles.saveBtnGradient}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.saveBtnText}>حفظ وإصدار</Text>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" style={{ marginLeft: 8 }} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#f8fafc', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%' },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  title: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  formContainer: { paddingBottom: 20 },
  label: { fontSize: 14, fontWeight: '800', color: '#475569', marginBottom: 10, textAlign: 'right' },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 15, fontSize: 20, fontWeight: '900', marginBottom: 20 },
  typeSelector: { flexDirection: 'row-reverse', gap: 10, marginBottom: 20 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  typeBtnActiveReceipt: { backgroundColor: 'rgba(22, 163, 74, 0.1)', borderColor: '#16a34a' },
  typeBtnTextActiveReceipt: { color: '#16a34a' },
  typeBtnActivePayment: { backgroundColor: 'rgba(234, 88, 12, 0.1)', borderColor: '#ea580c' },
  typeBtnTextActivePayment: { color: '#ea580c' },
  typeBtnText: { fontSize: 13, fontWeight: '900', color: '#64748b' },
  amountContainer: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, marginBottom: 30, paddingHorizontal: 15 },
  currency: { fontSize: 16, fontWeight: '900', color: '#94a3b8' },
  saveBtn: { borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  saveBtnGradient: { padding: 18, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { fontSize: 18, fontWeight: '900', color: '#ffffff' }
});

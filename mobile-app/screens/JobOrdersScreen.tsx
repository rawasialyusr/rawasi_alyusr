import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../lib/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function JobOrdersScreen() {
  const insets = useSafeAreaInsets();
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('job_orders')
        .select(`
          id,
          order_number,
          order_date,
          status,
          projects(Property)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setJobOrders(data || []);
    } catch (err) {
      console.error('Error fetching job orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobOrders();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchJobOrders();
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.statusBadge, item.status === 'معتمد' ? styles.statusApproved : styles.statusPending]}>
          {item.status || 'مسودة'}
        </Text>
        <Text style={styles.orderNumber}>{item.order_number}</Text>
      </View>
      <Text style={styles.projectName}>
        المشروع: {item.projects?.Property || 'غير محدد'}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>
          {new Date(item.order_date).toLocaleDateString('ar-EG')}
        </Text>
        <Ionicons name="calendar-outline" size={16} color={COLORS.textLight} style={{ marginLeft: 4 }} />
      </View>
    </View>
  );

  return (
    <View style={styles.screenContainer}>
      {/* 🌟 Custom Mobile Header - Gradient to Transparent */}
      <LinearGradient 
        colors={['#f8fafc', 'rgba(248, 250, 252, 0.9)', 'rgba(248, 250, 252, 0)']} 
        style={[styles.customHeader, { paddingTop: Math.max(insets.top, 10) }]}
      >
        {/* اليمين: الأيقونة وعنوان الصفحة */}
        <View style={styles.headerRight}>
          <Ionicons name="document-text" size={24} color={COLORS.primary} style={{ marginLeft: 6, marginTop: 2 }} />
          <Text style={styles.headerTitle}>أوامر التشغيل</Text>
        </View>

        {/* اليسار: كارت اليوزر بدون حاوية والإشعارات */}
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="filter" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="add" size={26} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={jobOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={{ padding: SIZES.padding, paddingTop: insets.top + 50, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>لا توجد أوامر تشغيل حالياً</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: COLORS.background },
  customHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingBottom: 25,
    zIndex: 10,
  },
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  headerLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    flex: 1,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  card: { 
    backgroundColor: '#ffffff', 
    padding: 16, 
    borderRadius: SIZES.radiusSm, 
    marginBottom: 12, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 5, 
    elevation: 2 
  },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderNumber: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  projectName: { fontSize: 15, fontWeight: '700', color: '#475569', marginBottom: 12, textAlign: 'right' },
  cardFooter: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start' },
  dateText: { fontSize: 13, fontWeight: '600', color: '#94a3b8', textAlign: 'right' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, fontSize: 11, fontWeight: '800', overflow: 'hidden' },
  statusApproved: { backgroundColor: '#dcfce7', color: '#166534' },
  statusPending: { backgroundColor: '#fef3c7', color: '#b45309' },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 50, fontSize: 14, fontWeight: '600' }
});

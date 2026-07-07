import React from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../lib/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubClaimsLogic } from './sub_claims_logic';

export default function SubClaimsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { claims, loading, refreshing, onRefresh } = useSubClaimsLogic();

  const renderItem = ({ item }: { item: any }) => {
    const isPaid = item.status === 'مدفوع' || item.status === 'معتمد';
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.7}>
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: isPaid ? '#dcfce7' : '#fef3c7' }]}>
            <Text style={[styles.badgeText, { color: isPaid ? '#166534' : '#b45309' }]}>
              {item.status || 'مسودة'}
            </Text>
          </View>
          <Text style={styles.claimNumber}>{item.claim_number}</Text>
        </View>
        <Text style={styles.partnerName}>{item.partners?.name || 'مقاول غير محدد'}</Text>
        <Text style={styles.projectName}>{item.projects?.Property || 'مشروع غير محدد'}</Text>
        
        <View style={styles.cardFooter}>
          <Text style={styles.amountText}>{item.net_amount ? parseFloat(item.net_amount).toLocaleString() : '0'} ريال</Text>
          <View style={styles.iconRow}>
            <Ionicons name="cash-outline" size={16} color={COLORS.textLight} style={{ marginLeft: 4 }} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screenContainer}>
      <LinearGradient 
        colors={['#f8fafc', 'rgba(248, 250, 252, 0.9)', 'rgba(248, 250, 252, 0)']} 
        style={[styles.customHeader, { paddingTop: Math.max(insets.top, 10) }]}
      >
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4, marginLeft: 8 }}>
            <Ionicons name="arrow-back" size={26} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>مستخلصات المقاولين</Text>
        </View>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Ionicons name="filter" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={claims}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={{ padding: SIZES.padding, paddingTop: insets.top + 60, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>لا توجد مستخلصات حالياً</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: COLORS.background },
  customHeader: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.padding, paddingBottom: 20, zIndex: 10,
  },
  headerRight: { flexDirection: 'row-reverse', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  headerLeft: { flexDirection: 'row-reverse', alignItems: 'center' },
  headerIconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9',
  },
  card: { 
    backgroundColor: '#ffffff', padding: 16, borderRadius: SIZES.radiusSm, 
    marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 
  },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  claimNumber: { fontSize: 16, fontWeight: '800', color: '#1e293b', flex: 1, textAlign: 'right', marginLeft: 10 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  partnerName: { fontSize: 15, fontWeight: '700', color: '#334155', textAlign: 'right', marginBottom: 4 },
  projectName: { fontSize: 13, fontWeight: '600', color: '#94a3b8', textAlign: 'right', marginBottom: 12 },
  cardFooter: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  amountText: { fontSize: 16, fontWeight: '800', color: COLORS.accent },
  iconRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 50, fontSize: 14, fontWeight: '600' }
});

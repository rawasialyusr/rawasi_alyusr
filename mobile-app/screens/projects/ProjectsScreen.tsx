import React from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS } from '../../lib/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProjectsLogic } from './projects_logic';

export default function ProjectsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { projects, loading, refreshing, onRefresh, getStatusColor } = useProjectsLogic();

  const renderItem = ({ item }: { item: any }) => {
    const statusColors = getStatusColor(item.status);
    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ProjectDetails', { projectId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
            <Text style={[styles.statusText, { color: statusColors.text }]}>{item.status || 'غير محدد'}</Text>
          </View>
          <Text style={styles.projectName}>{item.Property}</Text>
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.budgetText}>الميزانية: {item.estimated_budget ? parseFloat(item.estimated_budget).toLocaleString() : '0'} ريال</Text>
          <View style={styles.iconRow}>
            <Ionicons name="business" size={16} color={COLORS.textLight} style={{ marginLeft: 4 }} />
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
          <Text style={styles.headerTitle}>سجل المشاريع</Text>
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
          data={projects}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={{ padding: SIZES.padding, paddingTop: insets.top + 60, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>لا توجد مشاريع حالياً</Text>}
        />
      )}

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => alert('سيتم إضافة شاشة "إضافة مشروع جديد" قريباً')}
      >
        <Ionicons name="add" size={30} color="#ffffff" />
      </TouchableOpacity>
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
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  projectName: { fontSize: 16, fontWeight: '800', color: '#1e293b', flex: 1, textAlign: 'right', marginLeft: 10 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800' },
  cardFooter: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 },
  budgetText: { fontSize: 13, fontWeight: '700', color: COLORS.accent },
  iconRow: { flexDirection: 'row-reverse', alignItems: 'center' },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 50, fontSize: 14, fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 25,
    right: 25,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  }
});

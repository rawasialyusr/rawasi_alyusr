import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, SIZES } from '../../lib/theme';

export default function OverviewTab({ logic }: any) {
  const { kpis, selectedProject } = logic;

  if (!kpis) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: SIZES.padding }}>
      
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiTitle}>الميزانية المعتمدة</Text>
          <Text style={styles.kpiValue}>{kpis.totalEstimatedBudget.toLocaleString()}</Text>
          <Text style={styles.kpiCurrency}>ريال</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiTitle}>التكلفة الفعلية</Text>
          <Text style={[styles.kpiValue, { color: COLORS.danger }]}>{kpis.actualCost.toLocaleString()}</Text>
          <Text style={styles.kpiCurrency}>ريال</Text>
        </View>
      </View>

      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiTitle}>الإيرادات (المستخلصات)</Text>
          <Text style={[styles.kpiValue, { color: COLORS.success }]}>{kpis.totalRevenue.toLocaleString()}</Text>
          <Text style={styles.kpiCurrency}>ريال</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiTitle}>قيمة العقد</Text>
          <Text style={[styles.kpiValue, { color: COLORS.primary }]}>{kpis.totalContract.toLocaleString()}</Text>
          <Text style={styles.kpiCurrency}>ريال</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <Text style={styles.sectionTitle}>نسب الإنجاز</Text>
        
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>الإنجاز الفعلي (الموقع)</Text>
          <Text style={styles.progressValue}>{kpis.physicalProgress}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${kpis.physicalProgress}%`, backgroundColor: COLORS.accent }]} />
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>الإنجاز المالي (الفوترة)</Text>
          <Text style={styles.progressValue}>{kpis.financialProgress}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.min(100, Number(kpis.financialProgress))}%`, backgroundColor: COLORS.success }]} />
        </View>
        
        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>استهلاك الميزانية</Text>
          <Text style={styles.progressValue}>{kpis.budgetRatio}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.min(100, Number(kpis.budgetRatio))}%`, backgroundColor: kpis.budgetHealth === 'red' ? COLORS.danger : (kpis.budgetHealth === 'yellow' ? COLORS.warning : COLORS.success) }]} />
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' }, // Light Background
  kpiGrid: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 15, gap: 15 },
  kpiCard: { 
    flex: 1, 
    backgroundColor: 'rgba(255,255,255,0.7)', 
    padding: 20, 
    borderRadius: 24, 
    alignItems: 'flex-end',
    // Removed borders to match borderless design
  },
  kpiTitle: { fontSize: 13, fontWeight: '800', color: '#475569', marginBottom: 8 },
  kpiValue: { fontSize: 22, fontWeight: '900', color: '#1e293b' }, // Dark Slate for main values
  kpiCurrency: { fontSize: 11, fontWeight: '800', color: '#94a3b8', marginTop: 4 },
  progressSection: { 
    backgroundColor: 'rgba(255,255,255,0.7)', 
    padding: 24, 
    borderRadius: 24, 
    marginTop: 10,
    // Removed borders
  },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', textAlign: 'right', marginBottom: 25 },
  progressRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 10 },
  progressLabel: { fontSize: 14, fontWeight: '800', color: '#475569' },
  progressValue: { fontSize: 14, fontWeight: '900', color: '#1e293b' },
  progressBarBg: { height: 10, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 5, overflow: 'hidden', marginBottom: 24 },
  progressBarFill: { height: '100%', borderRadius: 5 }
});

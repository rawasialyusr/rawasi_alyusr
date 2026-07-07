import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

// استدعاء مكتبات التنقل والأيقونات
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// استدعاء الشاشات
import AuthScreen from './screens/AuthScreen';
import HomeScreen from './screens/HomeScreen';
import JobOrdersScreen from './screens/JobOrdersScreen';
import SettingsScreen from './screens/SettingsScreen';
import MenuScreen from './screens/MenuScreen';

import { COLORS, SHADOWS } from './lib/theme';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

// استدعاء شاشات المجموعة الأولى (المشاريع والمقاولين)
import ProjectsScreen from './screens/projects/ProjectsScreen';
import SubcontractorsScreen from './screens/subcontractors/SubcontractorsScreen';
import SubClaimsScreen from './screens/subclaims/SubClaimsScreen';
import ProjectDetailsScreen from './screens/projects/ProjectDetailsScreen';

// استدعاء شاشات المجموعة الثانية (المالية والسندات)
import FinanceDashboardScreen from './screens/finance/FinanceDashboardScreen';
import VouchersScreen from './screens/vouchers/VouchersScreen';
import LaborLogsScreen from './screens/hr/labor_logs/LaborLogsScreen';
import ExpensesScreen from './screens/ExpensesScreen/ExpensesScreen';
import MaterialIssuesScreen from './screens/MaterialIssuesScreen/MaterialIssuesScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsReady(true);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (!isReady) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // 🌍 الغلاف الرئيسي للتطبيق
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {session && session.user ? (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Projects" component={ProjectsScreen} />
            <Stack.Screen name="ProjectDetails" component={ProjectDetailsScreen} />
            <Stack.Screen name="Subcontractors" component={SubcontractorsScreen} />
            <Stack.Screen name="SubClaims" component={SubClaimsScreen} />
            <Stack.Screen name="FinanceDashboard" component={FinanceDashboardScreen} />
            <Stack.Screen name="Vouchers" component={VouchersScreen} />
            <Stack.Screen name="LaborLogs" component={LaborLogsScreen} />
            <Stack.Screen name="Expenses" component={ExpensesScreen} />
            <Stack.Screen name="MaterialIssues" component={MaterialIssuesScreen} />
          </Stack.Navigator>
        ) : (
          <AuthScreen />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// ==========================================
// 🧭 شريط التنقل السفلي والشاشات (Tabs)
// ==========================================
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'JobOrders') iconName = focused ? 'document-text' : 'document-text-outline';
          else if (route.name === 'Menu') iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.accent, // الذهبي الخاص بالبرنامج
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarBackground: () => (
          <LinearGradient 
            colors={['rgba(248, 250, 252, 0)', 'rgba(248, 250, 252, 0.9)', '#f8fafc']} 
            style={StyleSheet.absoluteFill} 
          />
        ),
        tabBarStyle: { 
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: 80, 
          paddingBottom: 25,
          paddingTop: 10,
        },
        headerShown: false, // 🚫 Hide the default navigation header so our custom header is at the very top!
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'الرئيسية' }} />
      <Tab.Screen name="JobOrders" component={JobOrdersScreen} options={{ title: 'أوامر التشغيل' }} />
      <Tab.Screen name="Menu" component={MenuScreen} options={{ title: 'المزيد' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'الإعدادات' }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' }
});
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { theme } from '@/lib/theme';
import { useAuth } from '@/context/AuthContext';

export default function TabLayout() {
  const { user, isSignedIn, loading, needsIdCardNumber } = useAuth();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.primary} size="large" /></View>;
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;
  if (needsIdCardNumber) return <Redirect href="/(auth)/id-number" />;
  if (!user) return <Redirect href="/" />;
  const workspaceLabel = user?.role === 'patient' ? 'Care' : 'Work';
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false,
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: '#82969B',
    tabBarLabelStyle: { fontSize: 10, fontWeight: '800', marginTop: 1, marginBottom: 3 },
    tabBarStyle: { height: 72, paddingTop: 8, paddingBottom: 9, borderTopColor: '#DCECEF', overflow: 'visible', backgroundColor: '#FFFFFF', elevation: 13, shadowColor: '#123F47', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 } },
    tabBarIcon: ({ color, focused }) => {
      if (route.name === 'assistant') return <View style={[styles.aiButton, focused && styles.aiButtonFocused]}><Ionicons name="sparkles" size={23} color={theme.colors.white}/></View>;
      const icons: Record<string, keyof typeof Ionicons.glyphMap> = { index: focused ? 'home' : 'home-outline', workspace: focused ? 'grid' : 'grid-outline', records: focused ? 'folder-open' : 'folder-open-outline', profile: focused ? 'person' : 'person-outline' };
      return <Ionicons name={icons[route.name] || 'ellipse-outline'} size={21} color={color}/>;
    }
  })}>
    <Tabs.Screen name="index" options={{ title: 'Home' }} />
    <Tabs.Screen name="workspace" options={{ title: workspaceLabel }} />
    <Tabs.Screen name="assistant" options={{ title: 'AI assistant', tabBarLabel: 'Ask AI', tabBarLabelStyle: { color: theme.colors.primary, fontWeight: '900', fontSize: 10, marginTop: 2, marginBottom: 2 } }} />
    <Tabs.Screen name="records" options={{ title: 'Records' }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
  </Tabs>;
}
const styles = StyleSheet.create({ aiButton: { width: 52, height: 52, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: -28, borderWidth: 4, borderColor: '#FFFFFF', shadowColor: theme.colors.primary, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 }, aiButtonFocused: { backgroundColor: '#155F69', transform: [{ scale: 1.04 }] } });

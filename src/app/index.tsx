import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/lib/theme';
import { Button, Screen } from '@/components/ui';

export default function Index() {
  const {
    loading,
    isSignedIn,
    needsIdCardNumber,
    authError,
    refreshSession,
  } = useAuth();
  if (loading) return <View style={{ flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color={theme.colors.primary}/></View>;
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;
  if (authError) {
    return (
      <Screen contentStyle={{ flex: 1, justifyContent: 'center', gap: 16 }}>
        <Text style={{ color: theme.colors.ink, fontSize: 20, fontWeight: '800' }}>
          We could not load your account
        </Text>
        <Text style={{ color: theme.colors.muted }}>{authError}</Text>
        <Button title="Try again" onPress={() => void refreshSession()} />
      </Screen>
    );
  }
  return <Redirect href={needsIdCardNumber ? '/(auth)/id-number' : '/(tabs)'} />;
}

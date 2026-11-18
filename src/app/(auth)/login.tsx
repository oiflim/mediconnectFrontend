import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useHostedAuth } from '@clerk/expo/hosted-auth';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/lib/theme';

export default function LoginScreen() {
  const { isSignedIn, loading } = useAuth();
  const { startHostedAuth } = useHostedAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const startSignIn = async (mode: 'sign-in' | 'sign-up') => {
    setError('');
    try {
      setBusy(true);
      const result = await startHostedAuth({ mode });
      if (result?.createdSessionId) router.replace('/');
    } catch (authError) {
      setError(
        authError instanceof Error ? authError.message : 'Unable to start Google sign-in.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }
  if (isSignedIn) return <Redirect href="/" />;

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.brandRow}>
        <View style={styles.logo}>
          <Ionicons name="medical" size={30} color={theme.colors.white} />
        </View>
        <View>
          <Text style={styles.brand}>MediConnect</Text>
          <Text style={styles.tagline}>Your care, connected.</Text>
        </View>
      </View>

      <View style={styles.headingBlock}>
        <Text style={styles.heading}>Welcome to MediConnect</Text>
        <Text style={styles.description}>
          Sign in securely with your Google account to manage your healthcare journey.
        </Text>
      </View>

      <Card>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Continue with Google"
          icon="logo-google"
          onPress={() => void startSignIn('sign-in')}
          loading={busy}
        />
        <View style={styles.footer}>
          <Text style={styles.description}>New to MediConnect?</Text>
          <Pressable
            disabled={busy}
            onPress={() => void startSignIn('sign-up')}
          >
            <Text style={styles.link}>Create an account</Text>
          </Pressable>
        </View>
      </Card>

      <Text style={styles.secureText}>
        Your account role and access are verified securely by MediConnect.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
    paddingTop: 24,
    paddingBottom: 36,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 19,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    fontSize: 21,
    fontWeight: '900',
    color: theme.colors.ink,
    letterSpacing: -0.4,
  },
  tagline: { color: theme.colors.muted, fontSize: 12, marginTop: 2 },
  headingBlock: { gap: 7 },
  heading: {
    fontSize: 29,
    fontWeight: '900',
    color: theme.colors.ink,
    letterSpacing: -0.8,
  },
  description: { color: theme.colors.muted, fontSize: 14, lineHeight: 20 },
  error: { color: theme.colors.danger, fontSize: 13 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    flexWrap: 'wrap',
    paddingTop: 6,
  },
  link: { color: theme.colors.primary, fontSize: 14, fontWeight: '800' },
  secureText: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});

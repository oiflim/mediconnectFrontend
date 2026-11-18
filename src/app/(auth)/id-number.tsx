import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';

import { Button, Card, PageTitle, Screen, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/lib/theme';

export default function IdNumberScreen() {
  const {
    isSignedIn,
    loading,
    needsIdCardNumber,
    completeIdCardNumber,
  } = useAuth();
  const [idCardNumber, setIdCardNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const id = idCardNumber.trim().toUpperCase();
    setError('');
    if (!id) {
      setError('Enter your ID number to continue.');
      return;
    }
    try {
      setBusy(true);
      await completeIdCardNumber(id);
      router.replace('/(tabs)');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Unable to save your ID number.',
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
  if (!isSignedIn) return <Redirect href="/(auth)/login" />;
  if (!needsIdCardNumber) return <Redirect href="/(tabs)" />;

  return (
    <Screen contentStyle={styles.content}>
      <PageTitle
        title="Add your ID number"
        subtitle="We use this to connect your account with your MediConnect records."
      />
      <Card>
        <TextField
          label="ID number"
          placeholder="Enter your registered ID number"
          value={idCardNumber}
          onChangeText={setIdCardNumber}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Continue to MediConnect"
          icon="arrow-forward"
          onPress={() => void submit()}
          loading={busy}
        />
      </Card>
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
    gap: 20,
    paddingTop: 24,
    paddingBottom: 36,
  },
  error: { color: theme.colors.danger, fontSize: 13 },
});

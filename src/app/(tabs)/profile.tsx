import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { initials, roleLabel } from '@/lib/format';
import { theme } from '@/lib/theme';
import { Button, Card, PageTitle, Screen, TextField } from '@/components/ui';

export default function ProfileScreen() {
  const { user, token, logout, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [experienceYears, setExperienceYears] = useState(
    user?.experienceYears == null ? '' : String(user.experienceYears),
  );
  const [specialization, setSpecialization] = useState(
    user?.specialization || '',
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setName(user?.name || '');
    setExperienceYears(
      user?.experienceYears == null ? '' : String(user.experienceYears),
    );
    setSpecialization(user?.specialization || '');
  }, [user]);

  const refreshProfile = async () => {
    setError('');
    try {
      await refreshUser();
    } catch (e: any) {
      setError(e.message || 'Unable to refresh profile.');
    }
  };

  const save = async () => {
    setError('');
    setMessage('');
    const years = experienceYears.trim();
    if (
      user?.role === 'doctor' &&
      years &&
      (!/^\d+$/.test(years) || Number(years) > 80)
    ) {
      setError('Experience must be a whole number from 0 to 80.');
      return;
    }
    if (
      user?.role === 'doctor' &&
      specialization.trim().length > 120
    ) {
      setError('Specialization cannot exceed 120 characters.');
      return;
    }

    const body: Record<string, unknown> = {
      name,
    };
    if (user?.role === 'doctor') {
      body.experienceYears = years ? Number(years) : null;
      body.specialization = specialization.trim();
    }
    try {
      setBusy(true);
      await api.patch('/auth/me', body, token);
      await refreshUser();
      setMessage('Your profile has been updated.');
    } catch (e: any) {
      setError(e.message || 'Unable to update profile.');
    } finally {
      setBusy(false);
    }
  };

  const deactivate = () => {
    Alert.alert(
      'Deactivate account',
      'This will deactivate your MediConnect account and sign you out. You will need an administrator to reactivate it.',
      [
        { text: 'Keep account', style: 'cancel' },
        {
          text: 'Deactivate account',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true);
              await api.delete('/auth/me', token);
              await logout();
              router.replace('/(auth)/login');
            } catch (e: any) {
              Alert.alert(
                'Account not deactivated',
                e.message || 'Unable to deactivate this account.',
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const signOut = () =>
    Alert.alert(
      'Sign out',
      'You will need to sign in with Google again to access your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ],
    );

  return (
    <Screen onRefresh={refreshProfile}>
      <PageTitle
        title="Profile"
        subtitle="Manage your account and sign-in details."
      />
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user?.name)}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{roleLabel(user?.role)}</Text>
          </View>
        </View>
      </Card>
      <Card>
        <Text style={styles.cardTitle}>Personal details</Text>
        <TextField label="Full name" value={name} onChangeText={setName} />
        <TextField
          label="Email address"
          value={user?.email || ''}
          editable={false}
        />
        {user?.idCardNumber ? (
          <TextField
            label="ID number"
            value={user.idCardNumber}
            editable={false}
          />
        ) : null}
        {user?.role === 'doctor' ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.cardTitle}>Professional details</Text>
            <Text style={styles.hint}>
              Patients can see these details when choosing a doctor.
            </Text>
            <TextField
              label="Experience (years)"
              value={experienceYears}
              onChangeText={setExperienceYears}
              keyboardType="number-pad"
              placeholder="e.g. 8"
            />
            <TextField
              label="Specialization"
              value={specialization}
              onChangeText={setSpecialization}
              placeholder="e.g. Cardiology"
              maxLength={120}
            />
          </>
        ) : null}
        <View style={styles.divider} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <Button
          title="Save profile"
          onPress={save}
          loading={busy}
          icon="checkmark-circle-outline"
        />
      </Card>
      <Card>
        <Text style={styles.cardTitle}>Account</Text>
        <Pressable
          style={styles.menuRow}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons
            name="notifications-outline"
            size={19}
            color={theme.colors.primary}
          />
          <Text style={styles.menuText}>Notification preferences</Text>
          <Ionicons name="chevron-forward" color={theme.colors.muted} />
        </Pressable>
        <View style={styles.divider} />
        <Button
          title="Deactivate my account"
          onPress={deactivate}
          danger
          compact
          icon="person-remove-outline"
          loading={busy}
        />
        <Button
          title="Sign out"
          onPress={signOut}
          secondary
          icon="log-out-outline"
        />
      </Card>
      <Text style={styles.footer}>MediConnect · Secure healthcare access</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 21, fontWeight: '900' },
  userName: { fontSize: 17, fontWeight: '900', color: theme.colors.ink },
  email: { fontSize: 12, color: theme.colors.muted },
  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  roleText: { fontSize: 10, fontWeight: '900', color: theme.colors.primary },
  cardTitle: { fontSize: 15, fontWeight: '900', color: theme.colors.ink },
  hint: { fontSize: 12, color: theme.colors.muted, lineHeight: 18 },
  divider: {
    height: 1,
    backgroundColor: theme.colors.line,
    marginVertical: 4,
  },
  error: { fontSize: 12, color: theme.colors.danger },
  success: { fontSize: 12, color: theme.colors.success },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  menuText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.ink,
  },
  footer: {
    fontSize: 11,
    color: theme.colors.muted,
    textAlign: 'center',
    paddingVertical: 8,
  },
});

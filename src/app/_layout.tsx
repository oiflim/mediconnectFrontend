import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { ClerkProvider } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/context/AuthContext';
import { theme } from '@/lib/theme';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!clerkPublishableKey) {
  throw new Error('Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in the Expo app environment.');
}

export default function RootLayout() {
  return <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}><SafeAreaProvider><AuthProvider><StatusBar style="dark" backgroundColor={theme.colors.background}/><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
    <Stack.Screen name="index" />
    <Stack.Screen name="(auth)" />
    <Stack.Screen name="(tabs)" />
    <Stack.Screen name="module/[slug]" options={{ presentation: 'card', animation: 'slide_from_right' }} />
    <Stack.Screen name="notifications" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    <Stack.Screen name="record-viewer" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    <Stack.Screen name="file-viewer" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
  </Stack></AuthProvider></SafeAreaProvider></ClerkProvider>;
}

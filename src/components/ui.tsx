
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type RefreshControlProps,
  type TextInputProps,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/lib/theme';

// =====================================================
// SCREEN COMPONENT - FIXED SCROLLING
// =====================================================

export function Screen({
  children,
  scroll = true,
  contentStyle,
  refreshControl,
  onRefresh,
}: React.PropsWithChildren<{
  scroll?: boolean;
  contentStyle?: ViewStyle;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  onRefresh?: () => Promise<unknown> | void;
}>) {
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const inner = (
    <View
      style={[
        styles.content,
        {
          width: '100%',
          maxWidth: width >= 760 ? 760 : 620,
        },
        contentStyle,
        styles.contentNoShrink,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            refreshControl ??
            (onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void refresh();
                }}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            ) : undefined)
          }
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={styles.fixedContent}>
          {inner}
        </View>
      )}
    </SafeAreaView>
  );
}

// =====================================================
// PAGE TITLE
// =====================================================

export function PageTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.pageTitle}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.h1}>{title}</Text>
        {subtitle ? (
          <Text style={styles.subtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

// =====================================================
// CARD
// =====================================================

export function Card({
  children,
  style,
}: React.PropsWithChildren<{ style?: ViewStyle }>) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

// =====================================================
// BUTTON
// =====================================================

export function Button({
  title,
  onPress,
  icon,
  secondary = false,
  danger = false,
  disabled = false,
  loading = false,
  compact = false,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  loading?: boolean;
  compact?: boolean;
  style?: ViewStyle;
}) {
  const backgroundColor = danger
    ? '#FCECEC'
    : secondary
      ? theme.colors.surfaceSoft
      : theme.colors.primary;

  const color = danger
    ? theme.colors.danger
    : secondary
      ? theme.colors.ink
      : theme.colors.white;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          minHeight: compact ? 40 : 48,
          paddingHorizontal: compact ? 13 : 18,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : icon ? (
        <Ionicons
          name={icon}
          size={compact ? 16 : 18}
          color={color}
        />
      ) : null}

      <Text
        style={[
          styles.buttonText,
          {
            color,
            fontSize: compact ? 13 : 15,
          },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

// =====================================================
// TEXT FIELD
// =====================================================

export function TextField({
  label,
  error,
  style,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
}) {
  return (
    <View style={[{ gap: 7 }, style as ViewStyle]}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        placeholderTextColor="#91A7AD"
        {...props}
        style={[
          styles.input,
          props.multiline && {
            minHeight: 96,
            textAlignVertical: 'top',
          },
        ]}
      />

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
    </View>
  );
}

// =====================================================
// CHIP
// =====================================================

export function Chip({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const map = {
    neutral: ['#EAF1F3', theme.colors.ink],
    success: ['#E2F5EE', theme.colors.success],
    warning: ['#FFF3DD', theme.colors.warning],
    danger: ['#FCECEC', theme.colors.danger],
    info: ['#EAF2FA', theme.colors.info],
  } as const;

  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: map[tone][0] },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: map[tone][1] },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// =====================================================
// EMPTY STATE
// =====================================================

export function EmptyState({
  title,
  message,
  icon = 'file-tray-outline',
}: {
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={icon}
          size={24}
          color={theme.colors.primary}
        />
      </View>

      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

// =====================================================
// LOADER
// =====================================================

export function Loader({
  label = 'Loading your MediConnect data…',
}: {
  label?: string;
}) {
  return (
    <View style={styles.loader}>
      <ActivityIndicator
        color={theme.colors.primary}
        size="large"
      />
      <Text style={styles.subtitle}>{label}</Text>
    </View>
  );
}

// =====================================================
// SECTION HEADING
// =====================================================

export function SectionHeading({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.h2}>{title}</Text>

      {action && onAction ? (
        <Pressable onPress={onAction}>
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// =====================================================
// ICON BUTTON
// =====================================================

export function IconButton({
  icon,
  onPress,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.iconButton}
    >
      <Ionicons
        name={icon}
        size={20}
        color={theme.colors.ink}
      />

      {badge ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

// =====================================================
// INLINE ERROR
// =====================================================

export function InlineError({
  message,
}: {
  message?: string;
}) {
  return message ? (
    <View style={styles.inlineError}>
      <Ionicons
        name="alert-circle-outline"
        size={18}
        color={theme.colors.danger}
      />

      <Text style={styles.error}>{message}</Text>
    </View>
  ) : null;
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  // Screen containers
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // ScrollView itself fills the available screen.
  scrollView: {
    flex: 1,
  },

  // Content container grows with its children.
  // Do not add flex: 1 here.
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 30,
  },

  // Fixed layout for screens such as AI chat.
  fixedContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 30,
  },

  content: {
    gap: 18,
  },

  // Prevent content from being compressed vertically.
  contentNoShrink: {
    flexShrink: 0,
  },

  // Page headings
  pageTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 2,
  },

  h1: {
    color: theme.colors.ink,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.6,
  },

  h2: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: '800',
  },

  subtitle: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },

  // Cards
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    padding: 17,
    borderWidth: 1,
    borderColor: '#E5F0F2',
    gap: 12,
    shadowColor: '#1A5A64',
    shadowOpacity: 0.045,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 1,
  },

  // Buttons
  button: {
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },

  buttonText: {
    fontWeight: '800',
  },

  // Inputs
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.ink,
  },

  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: '#FBFEFF',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: theme.colors.ink,
  },

  error: {
    color: theme.colors.danger,
    fontSize: 12,
    lineHeight: 17,
  },

  // Chips
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  chipText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },

  // Empty state
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    gap: 7,
  },

  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    color: theme.colors.ink,
    fontWeight: '800',
    fontSize: 15,
  },

  emptyMessage: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 280,
  },

  // Loader
  loader: {
    flex: 1,
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
  },

  // Section heading
  sectionHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  action: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },

  // Icon button
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.line,
    position: 'relative',
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E05E5E',
    position: 'absolute',
    right: 10,
    top: 9,
  },

  // Inline error
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FCECEC',
    borderRadius: 12,
    padding: 12,
  },
});

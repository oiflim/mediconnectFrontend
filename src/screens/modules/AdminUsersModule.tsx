import React, { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { roleLabel } from "@/lib/format";
import { theme } from "@/lib/theme";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Loader,
  PageTitle,
  Screen,
  TextField,
} from "@/components/ui";

const roles = [
  "patient",
  "doctor",
  "medicine_manager",
  "diagnosis_lab_manager",
  "admin",
];
type AdminUser = {
  id: string;
  name: string;
  email: string;
  idCardNumber: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
};
export default function AdminUsersModule() {
  const { token } = useAuth();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCard, setEditCard] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const load = useCallback(async (refresh = false) => {
    if (!token) return;
    if (!refresh) setLoading(true);
    setError("");
    try {
      setItems(
        await api.get<AdminUser[]>(
          `/admin/users?limit=200${roleFilter ? `&role=${roleFilter}` : ""}`,
          token,
        ),
      );
    } catch (e: any) {
      setError(e.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, [token, roleFilter]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const promote = async (user: AdminUser, newRole: string) => {
    try {
      setBusy(user.id);
      await api.patch(
        "/admin/users/role",
        { email: user.email, role: newRole },
        token,
      );
      setItems((xs) =>
        xs.map((x) => (x.id === user.id ? { ...x, role: newRole } : x)),
      );
    } catch (e: any) {
      Alert.alert("Role not updated", e.message);
    } finally {
      setBusy("");
    }
  };
  const toggle = async (user: AdminUser) => {
    try {
      setBusy(user.id);
      await api.patch(
        "/admin/users/active",
        { email: user.email, isActive: !user.isActive },
        token,
      );
      setItems((xs) =>
        xs.map((x) => (x.id === user.id ? { ...x, isActive: !x.isActive } : x)),
      );
    } catch (e: any) {
      Alert.alert("Account not updated", e.message);
    } finally {
      setBusy("");
    }
  };
  const startEdit = (user: AdminUser) => {
    setEditing(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditCard(user.idCardNumber || "");
    setEditPassword("");
  };
  const saveEdit = async (user: AdminUser) => {
    try {
      setBusy(user.id);
      const body: any = {
        name: editName.trim(),
        email: editEmail.trim(),
        idCardNumber: editCard.trim(),
      };
      if (editPassword) body.password = editPassword;
      const updated = await api.patch<AdminUser>(
        `/admin/users/${user.id}`,
        body,
        token,
      );
      setItems((xs) => xs.map((x) => (x.id === user.id ? updated : x)));
      setEditing("");
      setEditPassword("");
    } catch (e: any) {
      Alert.alert("Account details not saved", e.message);
    } finally {
      setBusy("");
    }
  };
  const find = async (refresh = false) => {
    if (!email.trim()) {
      await load(refresh);
      return;
    }
    if (!refresh) setLoading(true);
    setError("");
    try {
      const item = await api.get<AdminUser[]>(
        `/admin/users?email=${encodeURIComponent(email.trim())}`,
        token,
      );
      setItems(item);
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (!refresh) setLoading(false);
    }
  };
  if (loading)
    return (
      <Screen onRefresh={() => (email.trim() ? find(true) : load(true))}>
        <Loader label="Loading accounts…" />
      </Screen>
    );
  return (
    <Screen>
      <PageTitle
        title="User administration"
        subtitle="Public registration creates patient accounts. Administrators assign staff roles and manage account status."
      />
      <Card>
        <TextField
          label="Find by email"
          placeholder="person@example.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Button
          title="Search user"
          onPress={find}
          compact
          secondary
          icon="search"
        />
        <Text style={styles.label}>Filter by role</Text>
        <View style={styles.chips}>
          <RoleChip
            label="All"
            active={!roleFilter}
            onPress={() => setRoleFilter("")}
          />
          {roles.map((r) => (
            <RoleChip
              key={r}
              label={roleLabel(r)}
              active={roleFilter === r}
              onPress={() => setRoleFilter(r)}
            />
          ))}
        </View>
      </Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {items.length === 0 ? (
        <Card>
          <EmptyState
            title="No accounts found"
            message="Try another email or role filter."
            icon="people-outline"
          />
        </Card>
      ) : (
        items.map((user) => (
          <Card key={user.id}>
            <View style={styles.userTop}>
              <View style={styles.avatar}>
                <Ionicons
                  name="person-outline"
                  size={19}
                  color={theme.colors.primary}
                />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.meta}>{user.email}</Text>
                <Text style={styles.meta}>{user.idCardNumber}</Text>
              </View>
              <Chip
                label={user.isActive ? "Active" : "Inactive"}
                tone={user.isActive ? "success" : "danger"}
              />
            </View>
            <Text style={styles.roleLabel}>
              Current role: {roleLabel(user.role)}
            </Text>
            <Text style={styles.label}>Assign role</Text>
            <View style={styles.chips}>
              {roles.map((r) => (
                <RoleChip
                  key={r}
                  label={roleLabel(r)}
                  active={user.role === r}
                  disabled={busy === user.id}
                  onPress={() => promote(user, r)}
                />
              ))}
            </View>
            <View style={styles.actions}>
              <Button
                compact
                secondary
                title={user.isActive ? "Deactivate" : "Reactivate"}
                onPress={() => toggle(user)}
                loading={busy === user.id}
                icon="power-outline"
              />
              <Button
                compact
                secondary
                title="Edit details"
                onPress={() =>
                  editing === user.id ? setEditing("") : startEdit(user)
                }
                icon="create-outline"
              />
            </View>
            {editing === user.id ? (
              <View style={styles.editor}>
                <Text style={styles.label}>Edit account information</Text>
                <TextField
                  label="Full name"
                  value={editName}
                  onChangeText={setEditName}
                />
                <TextField
                  label="Email address"
                  value={editEmail}
                  onChangeText={setEditEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextField
                  label="ID card number"
                  value={editCard}
                  onChangeText={setEditCard}
                  autoCapitalize="characters"
                />
                <TextField
                  label="Reset password (optional)"
                  value={editPassword}
                  onChangeText={setEditPassword}
                  secureTextEntry
                  placeholder="Leave empty to keep existing"
                />
                <Button
                  compact
                  title="Save account details"
                  onPress={() => saveEdit(user)}
                  loading={busy === user.id}
                />
              </View>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
function RoleChip({
  label,
  active,
  onPress,
  disabled,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.colors.primary : "#EEF6F8",
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Text
        style={{
          fontSize: 10,
          fontWeight: "800",
          color: active ? "#FFFFFF" : theme.colors.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  label: { fontSize: 11, fontWeight: "900", color: theme.colors.ink },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 18 },
  userTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14, fontWeight: "900", color: theme.colors.ink },
  meta: { fontSize: 10, color: theme.colors.muted },
  roleLabel: { fontSize: 12, fontWeight: "800", color: theme.colors.primary },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  editor: {
    backgroundColor: "#F1FAFB",
    padding: 12,
    borderRadius: 14,
    gap: 10,
  },
  error: { fontSize: 12, color: theme.colors.danger },
});

import React, { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { Slot } from "@/lib/types";
import { prettyDateTime } from "@/lib/format";
import { theme } from "@/lib/theme";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Loader,
  PageTitle,
  Screen,
} from "@/components/ui";

export default function AppointmentsModule() {
  const { user, token } = useAuth();
  const [items, setItems] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const role = user?.role;
  const load = useCallback(async (refresh = false) => {
    if (!token) return;
    if (!refresh) setLoading(true);
    setError("");
    try {
      const path = role === "admin" ? "/bookings/all" : "/bookings/my";
      setItems(await api.get<Slot[]>(path, token));
    } catch (e: any) {
      setError(e.message || "Unable to load appointments.");
    } finally {
      setLoading(false);
    }
  }, [token, role]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const cancel = (slot: Slot) =>
    Alert.alert(
      "Cancel appointment",
      "This will reopen the appointment slot for other patients.",
      [
        { text: "Keep appointment", style: "cancel" },
        {
          text: "Cancel appointment",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/bookings/${slot._id}`, token);
              load();
            } catch (e: any) {
              Alert.alert("Unable to cancel", e.message);
            }
          },
        },
      ],
    );
  if (loading)
    return (
      <Screen onRefresh={() => load(true)}>
        <Loader label="Loading appointments…" />
      </Screen>
    );
  return (
    <Screen>
      <PageTitle
        title={
          role === "patient"
            ? "My appointments"
            : role === "doctor"
              ? "Patient appointments"
              : "All appointments"
        }
        subtitle="Appointments are represented by booked doctor slots in the backend."
      />
      {role === "patient" ? (
        <Button
          title="Find an appointment"
          icon="add-circle-outline"
          onPress={() => router.push("/module/book")}
        />
      ) : null}
      {role === "doctor" ? (
        <Button
          title="Create availability"
          icon="time-outline"
          onPress={() => router.push("/module/availability")}
        />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {items.length === 0 ? (
        <Card>
          <EmptyState
            title="No appointments yet"
            message={
              role === "patient"
                ? "Book an available slot with a doctor to see it here."
                : "Booked appointments will appear here."
            }
            icon="calendar-outline"
          />
        </Card>
      ) : (
        items.map((slot) => {
          const doctor =
            typeof slot.doctorId === "object" ? slot.doctorId : null;
          const patient =
            typeof slot.patientId === "object" ? slot.patientId : null;
          return (
            <Card key={slot._id}>
              <View style={styles.row}>
                <View style={styles.date}>
                  <Text style={styles.day}>
                    {new Date(slot.startTime).getDate()}
                  </Text>
                  <Text style={styles.month}>
                    {new Date(slot.startTime)
                      .toLocaleString(undefined, { month: "short" })
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.title}>
                    {role === "patient"
                      ? doctor?.name
                        ? `Dr. ${doctor.name}`
                        : "Doctor visit"
                      : patient?.name || "Patient appointment"}
                  </Text>
                  <Text style={styles.meta}>
                    {prettyDateTime(slot.startTime)}
                  </Text>
                  <Text style={styles.meta}>
                    {slot.durationMinutes} minute visit
                  </Text>
                </View>
                <Chip label="Booked" tone="success" />
              </View>
              <View style={styles.actions}>
                {role === "patient" ? (
                  <Button
                    compact
                    secondary
                    title="Reschedule"
                    icon="calendar-outline"
                    onPress={() =>
                      router.push({
                        pathname: "/module/book",
                        params: {
                          rescheduleSlotId: slot._id,
                          doctorId:
                            typeof slot.doctorId === "object"
                              ? slot.doctorId._id
                              : String(slot.doctorId),
                        },
                      })
                    }
                  />
                ) : null}
                <Button
                  compact
                  danger
                  title="Cancel"
                  icon="close-circle-outline"
                  onPress={() => cancel(slot)}
                />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  date: {
    width: 54,
    height: 60,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  day: { fontSize: 22, fontWeight: "900", color: theme.colors.primary },
  month: { fontSize: 10, color: theme.colors.primary, fontWeight: "900" },
  title: { fontSize: 14, fontWeight: "900", color: theme.colors.ink },
  meta: { fontSize: 11, color: theme.colors.muted },
  actions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  error: { fontSize: 12, color: theme.colors.danger },
});

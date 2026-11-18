import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { theme } from "@/lib/theme";
import { Button, Card, PageTitle, Screen, TextField } from "@/components/ui";

const pad = (n: number) => String(n).padStart(2, "0");
function localParts(value?: string) {
  const parsed = value ? new Date(value) : new Date(NaN);
  const d = Number.isNaN(parsed.getTime())
    ? new Date(Date.now() + 86400000)
    : parsed;
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}
export default function EditSlotModule() {
  const params = useLocalSearchParams<{
    slotId: string;
    startTime: string;
    durationMinutes: string;
  }>();
  const { token } = useAuth();
  const initial = useMemo(
    () => localParts(params.startTime),
    [params.startTime],
  );
  const [date, setDate] = useState(initial.date);
  const [start, setStart] = useState(initial.time);
  const [duration, setDuration] = useState(
    String(params.durationMinutes || "30"),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setError("");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
      !/^\d+$/.test(duration) ||
      Number(duration) <= 0
    ) {
      setError("Check the date, start time and duration.");
      return;
    }
    const [y, m, d] = date.split("-").map(Number);
    const [h, min] = start.split(":").map(Number);
    const startDate = new Date(y, m - 1, d, h, min, 0, 0);
    const endDate = new Date(startDate.getTime() + Number(duration) * 60000);
    if (
      Number.isNaN(startDate.getTime()) ||
      startDate.getFullYear() !== y ||
      startDate.getMonth() !== m - 1 ||
      startDate.getDate() !== d ||
      startDate <= new Date()
    ) {
      setError("The updated slot must be in the future.");
      return;
    }
    try {
      setBusy(true);
      await api.patch(
        `/slots/slots/${params.slotId}`,
        {
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          slotDurationMinutes: Number(duration),
        },
        token,
      );
      Alert.alert("Slot updated", "Your availability slot has been saved.");
      router.replace("/module/availability");
    } catch (e: any) {
      setError(
        e.message ||
          "This slot could not be updated. It may already be booked or overlapping another slot.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <PageTitle
        title="Edit availability slot"
        subtitle="Only your own unbooked future slot can be edited."
      />
      <Card>
        <Text style={styles.hint}>
          The backend updates this individual slot. It will reject changes if
          the slot has been booked, is in the past, or overlaps another slot.
        </Text>
        <TextField
          label="New date (YYYY-MM-DD)"
          value={date}
          onChangeText={setDate}
        />
        <TextField
          label="New start time (HH:mm)"
          value={start}
          onChangeText={setStart}
          placeholder="09:30"
        />
        <TextField
          label="Slot duration in minutes"
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
        />
        <Text style={styles.hint}>
          The end time is calculated automatically from the duration.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Save slot changes"
          onPress={save}
          loading={busy}
          icon="checkmark-circle-outline"
        />
      </Card>
    </Screen>
  );
}
const styles = StyleSheet.create({
  hint: { fontSize: 12, color: theme.colors.muted, lineHeight: 18 },
  error: { fontSize: 12, color: theme.colors.danger },
});

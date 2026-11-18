import React, { useCallback, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, router } from "expo-router";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { Slot } from "@/lib/types";
import { dateInputValue, localIso, prettyDateTime } from "@/lib/format";
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

export default function AvailabilityModule() {
  const { token, user } = useAuth();
  const tomorrow = new Date(Date.now() + 86400000);
  const [date, setDate] = useState(dateInputValue(tomorrow));
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("13:00");
  const [duration, setDuration] = useState("30");
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1),
  );
  const [items, setItems] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async (refresh = false) => {
    if (!token || !user?.id) return;
    if (!refresh) setLoading(true);
    setError("");
    try {
      const from = localIso(new Date());
      const to = localIso(new Date(Date.now() + 30 * 86400000));
      const result = await api.get<Slot[]>(
        `/slots/doctors/${user.id}/slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        token,
      );
      setItems(result);
    } catch (e: any) {
      setError(e.message || "Unable to load availability.");
    } finally {
      setLoading(false);
    }
  }, [token, user?.id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const create = async () => {
    setError("");
    const s = new Date(`${date}T${start}:00`);
    const e = new Date(`${date}T${end}:00`);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) {
      setError("Check the date, start time and end time.");
      return;
    }
    try {
      setBusy(true);
      const result = await api.post<{ count: number }>(
        "/slots/availability",
        {
          startTime: localIso(s),
          endTime: localIso(e),
          slotDurationMinutes: Number(duration),
        },
        token,
      );
      Alert.alert(
        "Availability created",
        `${result.count} appointment slots are now available.`,
      );
      load();
    } catch (err: any) {
      setError(err.message || "Unable to create availability.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (slot: Slot) => {
    try {
      await api.delete(`/slots/slots/${slot._id}`, token);
      setItems((x) => x.filter((i) => i._id !== slot._id));
    } catch (e: any) {
      Alert.alert("Unable to remove slot", e.message);
    }
  };
  if (loading)
    return (
      <Screen onRefresh={() => load(true)}>
        <Loader label="Loading your availability…" />
      </Screen>
    );
  return (
    <Screen>
      <PageTitle
        title="Manage availability"
        subtitle="Publish future time slots for patients to book."
      />
      <Card>
        <Text style={styles.title}>Add an availability window</Text>
        <Text style={styles.hint}>
          The backend splits the window into individual slots. Start and end
          times must divide evenly by the selected duration.
        </Text>
        <Text style={styles.label}>Date</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose date, currently ${date}`}
          onPress={() => {
            const selected = new Date(`${date}T00:00:00`);
            if (!Number.isNaN(selected.getTime())) {
              setCalendarMonth(
                new Date(selected.getFullYear(), selected.getMonth(), 1),
              );
            }
            setCalendarVisible(true);
          }}
          style={styles.dateButton}
        >
          <Text style={styles.dateText}>{date}</Text>
          <Ionicons
            name="calendar-outline"
            size={20}
            color={theme.colors.primary}
          />
        </Pressable>
        <Modal
          visible={calendarVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCalendarVisible(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setCalendarVisible(false)}
          >
            <Pressable
              style={styles.calendar}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.calendarHeader}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  onPress={() =>
                    setCalendarMonth(
                      (month) =>
                        new Date(
                          month.getFullYear(),
                          month.getMonth() - 1,
                          1,
                        ),
                    )
                  }
                  style={styles.monthButton}
                >
                  <Ionicons
                    name="chevron-back"
                    size={20}
                    color={theme.colors.ink}
                  />
                </Pressable>
                <Text style={styles.monthTitle}>
                  {calendarMonth.toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  onPress={() =>
                    setCalendarMonth(
                      (month) =>
                        new Date(
                          month.getFullYear(),
                          month.getMonth() + 1,
                          1,
                        ),
                    )
                  }
                  style={styles.monthButton}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.colors.ink}
                  />
                </Pressable>
              </View>
              <View style={styles.calendarGrid}>
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <Text key={day} style={styles.weekday}>
                    {day}
                  </Text>
                ))}
                {Array.from(
                  {
                    length:
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth(),
                        1,
                      ).getDay() +
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth() + 1,
                        0,
                      ).getDate(),
                  },
                  (_, index) => {
                    const firstDay = new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth(),
                      1,
                    ).getDay();
                    if (index < firstDay) {
                      return <View key={`empty-${index}`} style={styles.day} />;
                    }
                    const day = index - firstDay + 1;
                    const selectedDate = dateInputValue(
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth(),
                        day,
                      ),
                    );
                    const selected = selectedDate === date;
                    return (
                      <Pressable
                        key={selectedDate}
                        accessibilityRole="button"
                        accessibilityLabel={selectedDate}
                        accessibilityState={{ selected }}
                        onPress={() => {
                          setDate(selectedDate);
                          setCalendarVisible(false);
                        }}
                        style={[
                          styles.day,
                          selected && styles.selectedDay,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            selected && styles.selectedDayText,
                          ]}
                        >
                          {day}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>
            </Pressable>
          </Pressable>
        </Modal>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <TextField
              label="Start time (HH:mm)"
              value={start}
              onChangeText={setStart}
              placeholder="09:00"
            />
          </View>
          <View style={{ flex: 1 }}>
            <TextField
              label="End time (HH:mm)"
              value={end}
              onChangeText={setEnd}
              placeholder="13:00"
            />
          </View>
        </View>
        <Text style={styles.label}>Slot duration</Text>
        <View style={styles.durationRow}>
          {["5", "10", "15", "20", "30", "60"].map((d) => (
            <ChipButton
              key={d}
              label={`${d} min`}
              active={duration === d}
              onPress={() => setDuration(d)}
            />
          ))}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Publish available slots"
          onPress={create}
          loading={busy}
          icon="add-circle-outline"
        />
      </Card>
      <View style={styles.rowBetween}>
        <Text style={styles.section}>Upcoming slots</Text>
        <Chip label={`${items.length} found`} tone="info" />
      </View>
      {items.length === 0 ? (
        <Card>
          <EmptyState
            title="No slots published"
            message="Create an availability window above to let patients book you."
            icon="time-outline"
          />
        </Card>
      ) : (
        items.map((slot) => (
          <Card key={slot._id} style={{ gap: 8 }}>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>{prettyDateTime(slot.startTime)}</Text>
              <Chip
                label={slot.status === "booked" ? "Booked" : "Available"}
                tone={slot.status === "booked" ? "success" : "neutral"}
              />
            </View>
            <Text style={styles.hint}>
              {prettyDateTime(slot.endTime)} · {slot.durationMinutes} minutes
            </Text>
            {slot.status === "available" ? (
              <View style={styles.actions}>
                <Button
                  compact
                  secondary
                  title="Edit slot"
                  icon="create-outline"
                  onPress={() =>
                    router.push({
                      pathname: "/module/edit-slot",
                      params: {
                        slotId: slot._id,
                        startTime: slot.startTime,
                        durationMinutes: String(slot.durationMinutes),
                      },
                    })
                  }
                />
                <Button
                  compact
                  danger
                  title="Remove slot"
                  onPress={() => remove(slot)}
                  icon="trash-outline"
                />
              </View>
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}
function ChipButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Text
      onPress={onPress}
      style={[
        styles.duration,
        {
          backgroundColor: active ? theme.colors.primary : "#EDF6F8",
          color: active ? "#FFFFFF" : theme.colors.ink,
        },
      ]}
    >
      {label}
    </Text>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: "900", color: theme.colors.ink },
  hint: { fontSize: 12, color: theme.colors.muted, lineHeight: 18 },
  row: { flexDirection: "row", gap: 10 },
  label: { fontSize: 12, fontWeight: "800", color: theme.colors.ink },
  dateButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.colors.line,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  dateText: { fontSize: 14, color: theme.colors.ink },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#00000066",
  },
  calendar: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    gap: 14,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: theme.colors.background,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.ink,
  },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  weekday: {
    width: "14.2857%",
    paddingVertical: 8,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.muted,
  },
  day: {
    width: "14.2857%",
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  selectedDay: { backgroundColor: theme.colors.primary },
  dayText: { fontSize: 13, fontWeight: "700", color: theme.colors.ink },
  selectedDayText: { color: "#FFFFFF" },
  durationRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  duration: {
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    fontSize: 11,
    fontWeight: "900",
  },
  error: { fontSize: 12, color: theme.colors.danger },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  section: { fontSize: 16, fontWeight: "900", color: theme.colors.ink },
});

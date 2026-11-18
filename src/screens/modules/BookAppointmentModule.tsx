import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
} from "@/components/ui";

type Doctor = {
  _id: string;
  name: string;
  email: string;
  experienceYears?: number | null;
  specialization?: string;
};
export default function BookAppointmentModule() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{
    rescheduleSlotId?: string;
    doctorId?: string;
  }>();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState(params.doctorId || "");
  const [date, setDate] = useState(
    dateInputValue(new Date(Date.now() + 86400000)),
  );
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1);
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [booking, setBooking] = useState("");
  const [error, setError] = useState("");
  const selectedDoctor = useMemo(
    () => doctors.find((d) => d._id === doctorId),
    [doctors, doctorId],
  );
  const selectedDate = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const parsed = new Date(`${date}T00:00:00`);
    return Number.isNaN(parsed.getTime()) || dateInputValue(parsed) !== date
      ? null
      : parsed;
  }, [date]);
  const calendarDays = useMemo(() => {
    const year = pickerMonth.getFullYear();
    const month = pickerMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    return Array.from({ length: cellCount }, (_, index) => {
      const dayNumber = index - firstWeekday + 1;
      return dayNumber < 1 || dayNumber > daysInMonth
        ? null
        : new Date(year, month, dayNumber);
    });
  }, [pickerMonth]);
  const loadDoctors = useCallback(async (refresh = false) => {
    if (!token) return;
    if (!refresh) setLoading(true);
    setError("");
    try {
      const list = await api.get<Doctor[]>("/slots/doctors", token);
      setDoctors(list);
      if (params.doctorId) setDoctorId(params.doctorId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (!refresh) setLoading(false);
    }
  }, [token, params.doctorId]);
  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);
  const findSlots = useCallback(async () => {
    setError("");
    if (!doctorId) {
      setError("Choose a doctor first.");
      return;
    }
    const parsed = new Date(`${date}T00:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime())) {
      setError("Enter the date as YYYY-MM-DD.");
      return;
    }
    const from = localIso(parsed);
    const to = localIso(new Date(parsed.getTime() + 86400000 - 1));
    try {
      setSearching(true);
      const result = await api.get<Slot[]>(
        `/slots/doctors/${doctorId}/slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&status=available`,
        token,
      );
      setSlots(result.filter((s) => new Date(s.startTime) > new Date()));
      if (!result.length)
        setError("No available slots were found for this date.");
    } catch (e: any) {
      setError(e.message || "Could not load slots.");
    } finally {
      setSearching(false);
    }
  }, [date, doctorId, token]);
  const refreshBookingData = async () => {
    await loadDoctors(true);
    if (doctorId) await findSlots();
  };
  const openDatePicker = () => {
    const dateToShow = selectedDate ?? new Date();
    setPickerMonth(
      new Date(dateToShow.getFullYear(), dateToShow.getMonth(), 1),
    );
    setDatePickerVisible(true);
  };
  const changePickerMonth = (amount: number) => {
    setPickerMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  };
  const chooseDate = (chosenDate: Date) => {
    setDate(dateInputValue(chosenDate));
    setSlots([]);
    setError("");
    setDatePickerVisible(false);
  };
  const choose = async (slot: Slot) => {
    try {
      setBooking(slot._id);
      if (params.rescheduleSlotId) {
        await api.patch(
          `/bookings/${params.rescheduleSlotId}/reschedule`,
          { newSlotId: slot._id },
          token,
        );
        Alert.alert(
          "Appointment rescheduled",
          "Your new appointment time has been saved.",
        );
      } else {
        await api.post("/bookings", { slotId: slot._id }, token);
        Alert.alert(
          "Appointment booked",
          "Your doctor appointment is confirmed.",
        );
      }
      router.replace("/module/appointments");
    } catch (e: any) {
      Alert.alert(
        "Booking not completed",
        e.message ||
          "This slot may have just been taken. Refresh and select another slot.",
      );
      setSlots((s) => s.filter((x) => x._id !== slot._id));
    } finally {
      setBooking("");
    }
  };
  if (loading)
    return (
      <Screen onRefresh={refreshBookingData}>
        <Loader label="Loading doctors…" />
      </Screen>
    );
  return (
    <Screen>
      <PageTitle
        title={
          params.rescheduleSlotId ? "Reschedule visit" : "Book an appointment"
        }
        subtitle={
          params.rescheduleSlotId
            ? "Choose a new available time with the same doctor."
            : "Choose a doctor and look for an open appointment slot."
        }
      />
      <Card>
        <Text style={styles.label}>1 · Select a doctor</Text>
        {doctors.length === 0 ? (
          <EmptyState
            title="No doctors available"
            message="There are no active doctor accounts to book at this time."
            icon="people-outline"
          />
        ) : (
          <View style={{ gap: 8 }}>
            {doctors.map((d) => (
              <Pressable
                key={d._id}
                onPress={() => {
                  if (!params.doctorId) setDoctorId(d._id);
                }}
                style={[
                  styles.doctor,
                  {
                    borderColor:
                      doctorId === d._id
                        ? theme.colors.primary
                        : theme.colors.line,
                    backgroundColor: doctorId === d._id ? "#EAF7FB" : "#FFFFFF",
                  },
                ]}
              >
                <View style={styles.doctorAvatar}>
                  <Ionicons
                    name="person"
                    color={theme.colors.primary}
                    size={18}
                  />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.doctorName}>Dr. {d.name}</Text>
                  <Text style={styles.meta}>{d.email}</Text>
                  {d.specialization ? (
                    <Text style={styles.meta}>
                      Specialization: {d.specialization}
                    </Text>
                  ) : null}
                  {typeof d.experienceYears === "number" ? (
                    <Text style={styles.meta}>
                      {d.experienceYears}{" "}
                      {d.experienceYears === 1 ? "year" : "years"} of experience
                    </Text>
                  ) : null}
                </View>
                {doctorId === d._id ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={theme.colors.primary}
                  />
                ) : null}
              </Pressable>
            ))}
          </View>
        )}
        {params.doctorId && selectedDoctor ? (
          <Text style={styles.meta}>Doctor is fixed for this reschedule.</Text>
        ) : null}
      </Card>
      <Card>
        <Text style={styles.label}>2 · Choose a date</Text>
        <View style={{ gap: 7 }}>
          <Text style={styles.label}>Appointment date (YYYY-MM-DD)</Text>
          <View style={styles.dateField}>
            <TextInput
              accessibilityLabel="Appointment date"
              value={date}
              onChangeText={(value) => {
                setDate(value);
                setSlots([]);
                setError("");
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#91A7AD"
              style={styles.dateInput}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose appointment date from calendar"
              onPress={openDatePicker}
              style={styles.datePickerButton}
            >
              <Ionicons
                name="calendar-outline"
                size={22}
                color={theme.colors.primary}
              />
            </Pressable>
          </View>
        </View>
        <Button
          title="Find available times"
          icon="search"
          onPress={findSlots}
          loading={searching}
          disabled={!doctorId}
        />
      </Card>
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close date picker"
            onPress={() => setDatePickerVisible(false)}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.dateModal}>
            <View style={styles.modalTitleRow}>
              <Text style={styles.modalTitle}>Choose appointment date</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close date picker"
                onPress={() => setDatePickerVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={theme.colors.ink}
                />
              </Pressable>
            </View>
            <View style={styles.calendarHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                onPress={() => changePickerMonth(-1)}
                style={styles.monthButton}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={theme.colors.ink}
                />
              </Pressable>
              <Text style={styles.monthTitle}>
                {pickerMonth.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next month"
                onPress={() => changePickerMonth(1)}
                style={styles.monthButton}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.ink}
                />
              </Pressable>
            </View>
            <View style={styles.weekdays}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                (day) => (
                  <Text key={day} style={styles.weekday}>
                    {day}
                  </Text>
                ),
              )}
            </View>
            <View style={styles.calendarGrid}>
              {calendarDays.map((day, index) => {
                if (!day) {
                  return (
                    <View
                      key={`empty-${index}`}
                      style={styles.calendarCell}
                    />
                  );
                }
                const isSelected =
                  selectedDate?.toDateString() === day.toDateString();
                return (
                  <Pressable
                    key={day.toISOString()}
                    accessibilityRole="button"
                    accessibilityLabel={day.toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                    onPress={() => chooseDate(day)}
                    style={styles.calendarCell}
                  >
                    <View
                      style={[
                        styles.calendarDay,
                        isSelected && styles.calendarDaySelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calendarDayText,
                          isSelected && styles.calendarDayTextSelected,
                        ]}
                      >
                        {day.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {slots.length ? (
        <Card>
          <Text style={styles.label}>3 · Available times</Text>
          {slots.map((slot) => (
            <View key={slot._id} style={styles.slot}>
              <View style={styles.timeIcon}>
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={theme.colors.primary}
                />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.time}>
                  {new Date(slot.startTime).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
                <Text style={styles.meta}>
                  {slot.durationMinutes} minutes ·{" "}
                  {prettyDateTime(slot.startTime)}
                </Text>
              </View>
              <Button
                compact
                title={
                  booking === slot._id
                    ? "Saving…"
                    : params.rescheduleSlotId
                      ? "Choose"
                      : "Book"
                }
                onPress={() => choose(slot)}
                loading={booking === slot._id}
              />
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "900", color: theme.colors.ink },
  dateField: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: "#FBFEFF",
    borderRadius: 13,
  },
  dateInput: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: theme.colors.ink,
  },
  datePickerButton: {
    width: 52,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.line,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#00000066",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  dateModal: {
    width: "100%",
    maxWidth: 380,
    gap: 18,
    padding: 18,
    borderRadius: 22,
    backgroundColor: theme.colors.white,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    color: theme.colors.ink,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: { fontSize: 16, fontWeight: "900", color: theme.colors.ink },
  weekdays: { flexDirection: "row" },
  weekday: {
    width: "14.2857%",
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.muted,
  },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarCell: {
    width: "14.2857%",
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDaySelected: { backgroundColor: theme.colors.primary },
  calendarDayText: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  calendarDayTextSelected: { color: theme.colors.white },
  doctor: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  doctorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  doctorName: { fontSize: 13, fontWeight: "900", color: theme.colors.ink },
  meta: { fontSize: 11, color: theme.colors.muted },
  slot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
    paddingVertical: 10,
  },
  timeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  time: { fontSize: 14, fontWeight: "900", color: theme.colors.ink },
  error: { fontSize: 12, color: theme.colors.danger },
});

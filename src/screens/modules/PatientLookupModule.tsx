import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { MedicalRecord } from "@/lib/types";
import { prettyDateTime, titleCase } from "@/lib/format";
import { theme } from "@/lib/theme";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  PageTitle,
  Screen,
  TextField,
} from "@/components/ui";

export default function PatientLookupModule() {
  const { token, user } = useAuth();
  const [card, setCard] = useState("");
  const [name, setName] = useState("");
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDiagnosis, setEditDiagnosis] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const startEdit = (r: MedicalRecord) => {
    setEditingId(r._id);
    setEditTitle(r.title);
    setEditDiagnosis(r.diagnosis || "");
    setEditNotes(r.notes || "");
  };
  const saveRecord = async (r: MedicalRecord) => {
    try {
      setBusy(true);
      const updated = await api.patch<MedicalRecord>(
        `/records/${r._id}`,
        { title: editTitle.trim(), diagnosis: editDiagnosis, notes: editNotes },
        token,
      );
      setRecords((xs) => xs.map((x) => (x._id === r._id ? updated : x)));
      setEditingId("");
    } catch (e: any) {
      Alert.alert(
        "Record not updated",
        e.message || "The backend did not allow this edit.",
      );
    } finally {
      setBusy(false);
    }
  };
  const deleteRecord = (r: MedicalRecord) =>
    Alert.alert(
      "Archive medical record",
      "This record will be soft-deleted and its stored file cleanup will be attempted.",
      [
        { text: "Keep record", style: "cancel" },
        {
          text: "Archive record",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/records/${r._id}`, token);
              setRecords((xs) => xs.filter((x) => x._id !== r._id));
            } catch (e: any) {
              Alert.alert("Record not archived", e.message);
            }
          },
        },
      ],
    );
  const search = async () => {
    setError("");
    setRecords([]);
    setName("");
    if (!card.trim()) {
      setError("Enter an ID card number.");
      return;
    }
    try {
      setBusy(true);
      const result = await api.get<{
        patient: { name: string };
        records: MedicalRecord[];
      }>(
        `/records/patient/${encodeURIComponent(card.trim().toUpperCase())}`,
        token,
      );
      setName(result.patient.name);
      setRecords(result.records);
    } catch (e: any) {
      setError(e.message || "Could not find patient records.");
    } finally {
      setBusy(false);
    }
  };
  const refreshSearch = async () => {
    if (card.trim()) await search();
  };
  return (
    <Screen onRefresh={refreshSearch}>
      <PageTitle
        title="Patient records"
        subtitle="Search a patient by ID card number. The backend checks your care access before returning records."
      />
      <Card>
        <TextField
          label="Patient ID card number"
          value={card}
          onChangeText={setCard}
          autoCapitalize="characters"
          placeholder="e.g. MC10001"
        />
        <Button
          title="Search records"
          onPress={search}
          loading={busy}
          icon="search"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>
      {name ? (
        <>
          <View style={styles.patient}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={21} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.meta}>Patient record found</Text>
            </View>
            <Chip label={`${records.length} records`} tone="info" />
          </View>
          {user?.role === "doctor" || user?.role === "admin" ? (
            <Button
              title="Create prescription"
              onPress={() =>
                router.push({
                  pathname: "/module/prescription",
                  params: { idCardNumber: card },
                })
              }
              icon="document-text-outline"
            />
          ) : null}
          {user?.role === "diagnosis_lab_manager" || user?.role === "admin" ? (
            <Button
              title="Upload lab report"
              onPress={() =>
                router.push({
                  pathname: "/module/upload-report",
                  params: { idCardNumber: card },
                })
              }
              icon="cloud-upload-outline"
              secondary
            />
          ) : null}
          {records.length === 0 ? (
            <Card>
              <EmptyState
                title="No clinical records"
                message="This patient does not have any active records in the system."
              />{" "}
            </Card>
          ) : (
            records.map((r) => (
              <Card key={r._id}>
                <View style={styles.recordTop}>
                  <Ionicons
                    name={
                      r.type === "prescription"
                        ? "document-text-outline"
                        : "flask-outline"
                    }
                    size={21}
                    color={theme.colors.primary}
                  />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={styles.name}>{r.title}</Text>
                    <Text style={styles.meta}>
                      {titleCase(r.type)} · {prettyDateTime(r.recordedAt)}
                    </Text>
                  </View>
                </View>
                {r.diagnosis ? (
                  <Text style={styles.meta}>{r.diagnosis}</Text>
                ) : null}
                {r.aiPrediction?.result ? (
                  <Chip
                    label={`AI: ${r.aiPrediction.result.prediction || "Available"}`}
                    tone="info"
                  />
                ) : null}
                {r.file ? (
                  <Button
                    compact
                    secondary
                    icon="document-attach-outline"
                    title="View attached file"
                    onPress={() =>
                      router.push({
                        pathname: "/file-viewer",
                        params: { recordId: r._id, title: r.title },
                      })
                    }
                  />
                ) : null}
                {(() => {
                  const creatorId =
                    typeof r.uploadedBy === "string"
                      ? r.uploadedBy
                      : r.uploadedBy?._id;
                  const allowedType =
                    (user?.role === "doctor" && r.type === "prescription") ||
                    (user?.role === "diagnosis_lab_manager" &&
                      r.type === "lab_report");
                  const canEdit =
                    user?.role === "admin" ||
                    (creatorId === user?.id && allowedType);
                  return canEdit ? (
                    <>
                      <View style={styles.actions}>
                        <Pressable
                          onPress={() =>
                            editingId === r._id
                              ? setEditingId("")
                              : startEdit(r)
                          }
                        >
                          <Text style={styles.action}>Edit record</Text>
                        </Pressable>
                        <Pressable onPress={() => deleteRecord(r)}>
                          <Text
                            style={[
                              styles.action,
                              { color: theme.colors.danger },
                            ]}
                          >
                            Archive
                          </Text>
                        </Pressable>
                      </View>
                      {editingId === r._id ? (
                        <Card style={styles.editor}>
                          <Text style={styles.name}>Edit this record</Text>
                          <TextField
                            label="Record title"
                            value={editTitle}
                            onChangeText={setEditTitle}
                          />
                          <TextField
                            label="Diagnosis"
                            value={editDiagnosis}
                            onChangeText={setEditDiagnosis}
                          />
                          <TextField
                            label="Notes"
                            value={editNotes}
                            onChangeText={setEditNotes}
                            multiline
                          />
                          <Button
                            title="Save record changes"
                            compact
                            onPress={() => saveRecord(r)}
                            loading={busy}
                          />
                        </Card>
                      ) : null}
                    </>
                  ) : null;
                })()}
              </Card>
            ))
          )}
        </>
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  error: { fontSize: 12, color: theme.colors.danger },
  patient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.line,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14, fontWeight: "900", color: theme.colors.ink },
  meta: { fontSize: 11, color: theme.colors.muted, lineHeight: 17 },
  recordTop: { flexDirection: "row", gap: 10, alignItems: "center" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 16 },
  action: { fontSize: 12, fontWeight: "900", color: theme.colors.primary },
  editor: { backgroundColor: "#F1FAFB", borderColor: "#D7EDF0" },
});

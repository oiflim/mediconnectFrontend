import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { MedicalRecord } from "@/lib/types";
import { prettyDateTime, titleCase } from "@/lib/format";
import { theme } from "@/lib/theme";
import { Button, Card, Chip, Loader, PageTitle, Screen } from "@/components/ui";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Could not load this record.";
}

export default function RecordViewer() {
  const { recordId } = useLocalSearchParams<{ recordId: string }>();
  const { token, loading: authLoading } = useAuth();
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!token) return;
    if (!recordId) {
      setError("Record identifier is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    api.get<MedicalRecord>(`/records/${encodeURIComponent(recordId)}`, token)
      .then((result) => {
        if (active) setRecord(result);
      })
      .catch((requestError: unknown) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [recordId, token]);

  if (authLoading) return <Screen><Loader label="Checking secure access…" /></Screen>;
  if (!token) return <Redirect href="/(auth)/login" />;
  if (loading) return <Screen><Loader label="Loading medical record…" /></Screen>;

  const openFile = () => {
    if (!record) return;
    router.push({
      pathname: "/file-viewer",
      params: { recordId: record._id, title: record.title },
    });
  };

  return (
    <Screen>
      <PageTitle
        title={record?.type === "prescription" ? "Prescription details" : "Lab report"}
        subtitle={record ? `${titleCase(record.type)} · ${prettyDateTime(record.recordedAt)}` : "Record details"}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close record"
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={21} color={theme.colors.ink} />
          </Pressable>
        }
      />
      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
          <Button title="Back to records" secondary onPress={() => router.back()} />
        </Card>
      ) : record ? (
        <Card>
          <View style={styles.recordHeader}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={styles.title}>{record.title}</Text>
              <Text style={styles.meta}>Recorded {prettyDateTime(record.recordedAt)}</Text>
            </View>
            <Chip
              label={record.type === "prescription" ? "Prescription" : "Lab report"}
              tone={record.type === "prescription" ? "info" : "neutral"}
            />
          </View>

          {record.type === "prescription" ? (
            <>
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Disease / diagnosis</Text>
                <Text style={styles.value}>{record.diagnosis || "Not provided"}</Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Medicine and dosage</Text>
                {record.medicines?.length ? record.medicines.map((medicine, index) => (
                  <View key={`${medicine.name}-${index}`} style={styles.medicine}>
                    <Text style={styles.medicineName}>{medicine.name}</Text>
                    <DetailLine label="Dose" value={medicine.dosage} />
                    <DetailLine label="How often" value={medicine.frequency} />
                    <DetailLine label="How many days" value={medicine.duration} />
                    {medicine.instructions ? <DetailLine label="Instructions" value={medicine.instructions} /> : null}
                  </View>
                )) : <Text style={styles.value}>No medicine details provided</Text>}
              </View>
            </>
          ) : (
            <>
              {record.reportType ? (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Report type</Text>
                  <Text style={styles.value}>{titleCase(record.reportType)}</Text>
                </View>
              ) : null}
              {record.diagnosis ? (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Diagnosis / findings</Text>
                  <Text style={styles.value}>{record.diagnosis}</Text>
                </View>
              ) : null}
              {record.aiPrediction?.result ? (
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>AI insight</Text>
                  <Text style={styles.value}>{record.aiPrediction.result.prediction || "Prediction available"}</Text>
                  <Text style={styles.meta}>Decision-support output only; not a medical diagnosis.</Text>
                </View>
              ) : null}
            </>
          )}

          {record.notes ? (
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.value}>{record.notes}</Text>
            </View>
          ) : null}

          {record.file ? (
            <Button
              title={record.type === "prescription" ? "View prescription attachment" : "Open lab report"}
              icon="document-attach-outline"
              onPress={openFile}
            />
          ) : null}
        </Card>
      ) : null}
    </Screen>
  );
}

function DetailLine({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.value}>{value || "Not provided"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceSoft,
  },
  recordHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: "800",
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  detailSection: {
    gap: 8,
  },
  sectionTitle: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  value: {
    color: theme.colors.ink,
    fontSize: 14,
    lineHeight: 21,
  },
  medicine: {
    gap: 7,
    padding: 13,
    borderRadius: 14,
    backgroundColor: "#F1FAFB",
  },
  medicineName: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: "800",
  },
  detailLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
  },
  detailLabel: {
    flex: 1,
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
  },
});

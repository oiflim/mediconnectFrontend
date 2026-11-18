import React, { useState } from "react";

import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import * as DocumentPicker from "expo-document-picker";
import { File as ExpoFile } from "expo-file-system";

import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { theme } from "@/lib/theme";

import {
  Button,
  Card,
  Chip,
  PageTitle,
  Screen,
  TextField,
} from "@/components/ui";

// =====================================================
// TYPES
// =====================================================

type SelectedUploadFile = {
  name: string;
  uri: string;
  mimeType: string;
  size?: number;
  blob: Blob;
};

type AIResult = {
  prediction?: string;
  confidence?: number;
  pneumonia_probability?: number;
  normal_probability?: number;
};

type UploadedRecord = {
  _id?: string;
  id?: string;
  title?: string;
  reportType?: string;
  downloadUrl?: string;
  file?: {
    originalName?: string;
    downloadUrl?: string;
  };
  aiPrediction?: {
    status?: string;
    result?: AIResult;
    errorCode?: string;
    disclaimer?: string;
  };
};

// =====================================================
// MIME TYPE HELPER
// =====================================================

function getMimeType(name: string, suppliedType?: string | null): string {
  if (suppliedType) {
    return suppliedType;
  }

  const extension = name.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";

    case "png":
      return "image/png";

    case "pdf":
      return "application/pdf";

    default:
      return "application/octet-stream";
  }
}

// =====================================================
// PERCENTAGE FORMATTER
// =====================================================

function formatPercent(value?: number): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return `${(value <= 1 ? value * 100 : value).toFixed(1)}%`;
}

// =====================================================
// UPLOAD RESPONSE PARSER
// =====================================================

function unwrapUploadResponse(
  status: number,
  responseText: string,
): UploadedRecord {
  let body: any = {};

  try {
    body = JSON.parse(responseText);
  } catch {
    body = {
      message: responseText || "Invalid server response",
    };
  }

  if (status < 200 || status >= 300 || body.success === false) {
    throw new Error(
      body?.error?.message ||
        body?.message ||
        `Upload failed with HTTP ${status}`,
    );
  }

  return body?.data ?? body?.record ?? body;
}

// =====================================================
// UPLOAD REPORT MODULE
// =====================================================

export default function UploadReportModule() {
  const params = useLocalSearchParams<{
    idCardNumber?: string;
  }>();

  const { token } = useAuth();

  const [idCardNumber, setIdCardNumber] = useState(params.idCardNumber || "");

  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState("general");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");

  const [file, setFile] = useState<SelectedUploadFile | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [uploadedRecord, setUploadedRecord] = useState<UploadedRecord | null>(
    null,
  );

  // ===================================================
  // PICK FILE
  // ===================================================

  const pick = async () => {
    try {
      setError("");
      setUploadedRecord(null);

      // ANDROID / IOS
      // Use Expo's native File picker.
      // It returns a File object directly, avoiding
      // the DocumentPicker cache-copy problem.

      if (Platform.OS !== "web") {
        const result = await ExpoFile.pickFileAsync({
          mimeTypes: ["image/jpeg", "image/png", "application/pdf"],
          multipleFiles: false,
        });

        if (result.canceled) {
          return;
        }

        const selected = result.result;

        const mimeType = getMimeType(selected.name, selected.type);

        setFile({
          name: selected.name,
          uri: selected.uri,
          mimeType,
          size: selected.size,
          blob: selected,
        });

        if (!title) {
          setTitle(selected.name.replace(/\.[^/.]+$/, ""));
        }

        console.log("[MediConnect] Native file selected:", {
          name: selected.name,
          mimeType,
          size: selected.size,
          uriScheme: selected.uri.split(":")[0],
        });

        return;
      }

      // WEB
      // Browser document picker.

      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "application/pdf"],
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];

      let selectedBlob: Blob;

      if (asset.file) {
        selectedBlob = asset.file;
      } else {
        const response = await fetch(asset.uri);

        if (!response.ok) {
          throw new Error("Could not read the selected file.");
        }

        selectedBlob = await response.blob();
      }

      const mimeType = getMimeType(asset.name, asset.mimeType);

      setFile({
        name: asset.name,
        uri: asset.uri,
        mimeType,
        size: asset.size,
        blob: selectedBlob,
      });

      if (!title) {
        setTitle(asset.name.replace(/\.[^/.]+$/, ""));
      }

      console.log("[MediConnect] Web file selected:", {
        name: asset.name,
        mimeType,
        size: asset.size,
      });
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Could not select the file.";

      console.error("[MediConnect] File selection failed:", e);

      setError(message);
    }
  };

  // ===================================================
  // SUBMIT REPORT
  // ===================================================

  const submit = async () => {
    setError("");
    setUploadedRecord(null);

    if (!idCardNumber.trim()) {
      setError("Patient ID card number is required.");
      return;
    }

    if (!file) {
      setError("Please select a report file.");
      return;
    }

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    if (
      reportType === "chest_xray" &&
      !["image/jpeg", "image/png"].includes(file.mimeType)
    ) {
      setError("Chest X-ray AI accepts JPG and PNG images only.");
      return;
    }

    try {
      setBusy(true);

      // STEP 1: Create multipart FormData.

      const form = new FormData();

      form.append("idCardNumber", idCardNumber.trim().toUpperCase());

      form.append("reportType", reportType);

      form.append("title", title.trim() || file.name);

      form.append("diagnosis", diagnosis);
      form.append("notes", notes);

      // STEP 2: Attach actual Blob-compatible file.
      // Native: Expo File object.
      // Web: Browser Blob/File.

      form.append("file", file.blob, file.name);

      console.log("[MediConnect] Starting report upload:", {
        fileName: file.name,
        mimeType: file.mimeType,
        fileSize: file.size,
        reportType,
        platform: Platform.OS,
        hasToken: Boolean(token),
      });

      // STEP 3: Send the multipart request.
      // api.ts uses expo/fetch and preserves FormData.

      const response = await api.post<UploadedRecord>(
        "/records/lab-reports",
        form,
        token,
      );

      console.log("[MediConnect] Report upload completed:", {
        recordId: response?._id,
        reportType: response?.reportType,
        aiStatus: response?.aiPrediction?.status,
      });

      // STEP 4: Show saved report and AI result.

      setUploadedRecord(response);

      Alert.alert(
        "Upload completed",
        reportType === "chest_xray"
          ? response?.aiPrediction?.status === "completed"
            ? "Your X-ray was uploaded and AI analysis completed."
            : "Your X-ray was uploaded, but AI analysis is unavailable."
          : "Your lab report was successfully saved.",
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Report upload failed.";

      console.error("[MediConnect] Upload failed:", e);

      setError(message);
    } finally {
      setBusy(false);
    }
  };

  // ===================================================
  // AI RESULT
  // ===================================================

  const ai = uploadedRecord?.aiPrediction;
  const aiResult = ai?.result;

  const prediction = aiResult?.prediction;

  const confidence = formatPercent(aiResult?.confidence);

  const pneumoniaProbability = formatPercent(aiResult?.pneumonia_probability);

  const normalProbability = formatPercent(aiResult?.normal_probability);

  // ===================================================
  // UI
  // ===================================================

  return (
    <Screen>
      <PageTitle
        title="Upload lab report"
        subtitle="Attach a report to a patient. Chest X-rays are processed by your existing AI model."
      />

      <Card>
        <TextField
          label="Patient ID card number *"
          value={idCardNumber}
          onChangeText={setIdCardNumber}
          autoCapitalize="characters"
          placeholder="Patient ID card"
        />

        <TextField
          label="Report title"
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Chest X-ray report"
        />

        <Text style={styles.label}>Report category</Text>

        <View style={styles.typeRow}>
          {[
            {
              value: "general",
              label: "General report",
            },
            {
              value: "chest_xray",
              label: "Chest X-ray (AI)",
            },
          ].map((item) => (
            <Pressable
              key={item.value}
              disabled={busy}
              onPress={() => {
                setReportType(item.value);
                setUploadedRecord(null);
                setError("");
              }}
              style={[
                styles.typeCard,
                {
                  borderColor:
                    reportType === item.value
                      ? theme.colors.primary
                      : theme.colors.line,

                  backgroundColor:
                    reportType === item.value ? "#EAF7FB" : "#FFFFFF",
                },
              ]}
            >
              <Ionicons
                name={
                  item.value === "chest_xray"
                    ? "scan-outline"
                    : "document-text-outline"
                }
                size={18}
                color={theme.colors.primary}
              />

              <Text style={styles.typeText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <TextField
          label="Diagnosis (optional)"
          value={diagnosis}
          onChangeText={setDiagnosis}
          placeholder="Clinical note"
        />

        <TextField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Additional context"
          multiline
        />

        {/* FILE PICKER */}

        <Pressable onPress={pick} disabled={busy} style={styles.fileBox}>
          <View style={styles.fileIcon}>
            <Ionicons
              name="cloud-upload-outline"
              size={22}
              color={theme.colors.primary}
            />
          </View>

          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.fileTitle}>
              {file?.name || "Choose a report file"}
            </Text>

            <Text style={styles.fileSub}>
              {file
                ? `${file.mimeType} · ${
                    file.size
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                      : "Ready to upload"
                  }`
                : "PDF, JPG or PNG"}
            </Text>
          </View>

          <Ionicons
            name="folder-open-outline"
            color={theme.colors.primary}
            size={20}
          />
        </Pressable>

        {/* AI NOTICE */}

        {reportType === "chest_xray" ? (
          <View style={styles.notice}>
            <Ionicons name="sparkles" size={17} color={theme.colors.primary} />

            <Text style={styles.noticeText}>
              The Express backend uploads the image to ImageKit and forwards the
              JPG/PNG image to your FastAPI pneumonia model.
            </Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title="Upload report"
          icon="cloud-upload-outline"
          onPress={submit}
          loading={busy}
          disabled={!file || busy}
        />
      </Card>

      {/* =================================================
          UPLOAD RESULT
      ================================================= */}

      {uploadedRecord ? (
        <Card>
          <View style={styles.resultHeader}>
            <Ionicons
              name="checkmark-circle"
              size={25}
              color={theme.colors.success}
            />

            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.resultTitle}>Report saved successfully</Text>

              <Text style={styles.resultSubtitle}>
                The report has been attached to the patient's record.
              </Text>
            </View>
          </View>

          {reportType === "chest_xray" ? (
            <>
              <View style={styles.aiResultHeader}>
                <Ionicons
                  name="sparkles"
                  size={21}
                  color={theme.colors.primary}
                />

                <Text style={styles.resultTitle}>AI Pneumonia Analysis</Text>
              </View>

              {ai?.status === "completed" ? (
                <>
                  <View style={styles.predictionBox}>
                    <Text style={styles.predictionLabel}>MODEL PREDICTION</Text>

                    <Text style={styles.predictionValue}>
                      {prediction || "Prediction available"}
                    </Text>

                    {confidence ? (
                      <Text style={styles.confidence}>
                        Confidence: {confidence}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.probabilityRow}>
                    {pneumoniaProbability ? (
                      <View style={styles.probabilityCard}>
                        <Text style={styles.probabilityLabel}>Pneumonia</Text>

                        <Text style={styles.probabilityValue}>
                          {pneumoniaProbability}
                        </Text>
                      </View>
                    ) : null}

                    {normalProbability ? (
                      <View style={styles.probabilityCard}>
                        <Text style={styles.probabilityLabel}>Normal</Text>

                        <Text style={styles.probabilityValue}>
                          {normalProbability}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Chip label="AI analysis completed" tone="success" />

                  <Text style={styles.disclaimer}>
                    {ai.disclaimer ||
                      "AI-assisted screening only. This is not a medical diagnosis. A qualified clinician must review the X-ray."}
                  </Text>
                </>
              ) : (
                <View style={styles.warningBox}>
                  <Chip label="AI analysis unavailable" tone="warning" />

                  <Text style={styles.noticeText}>
                    The report was saved, but AI prediction could not be
                    completed.
                  </Text>

                  <Text style={styles.meta}>
                    Status: {ai?.status || "Unknown"}
                  </Text>

                  <Text style={styles.meta}>
                    Error: {ai?.errorCode || "Not provided"}
                  </Text>
                </View>
              )}
            </>
          ) : null}

          <Button
            title="View patient records"
            icon="folder-open-outline"
            secondary
            onPress={() => router.push("/module/records")}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.ink,
  },

  typeRow: {
    flexDirection: "row",
    gap: 8,
  },

  typeCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 13,
    padding: 12,
    gap: 7,
    alignItems: "center",
  },

  typeText: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.ink,
  },

  fileBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.primary,
    backgroundColor: "#F2FBFC",
    padding: 13,
    borderRadius: 15,
  },

  fileIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  fileTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: theme.colors.ink,
  },

  fileSub: {
    fontSize: 10,
    color: theme.colors.muted,
  },

  notice: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    padding: 11,
    borderRadius: 12,
    backgroundColor: "#DDF3F6",
  },

  noticeText: {
    flex: 1,
    fontSize: 12,
    color: "#45656D",
    lineHeight: 18,
  },

  error: {
    fontSize: 12,
    color: theme.colors.danger,
  },

  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  resultTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.ink,
  },

  resultSubtitle: {
    fontSize: 11,
    color: theme.colors.muted,
    lineHeight: 17,
  },

  aiResultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 8,
  },

  predictionBox: {
    backgroundColor: "#EAF7FB",
    borderRadius: 15,
    padding: 16,
    gap: 6,
  },

  predictionLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  predictionValue: {
    color: theme.colors.primary,
    fontSize: 25,
    fontWeight: "900",
  },

  confidence: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },

  probabilityRow: {
    flexDirection: "row",
    gap: 10,
  },

  probabilityCard: {
    flex: 1,
    padding: 12,
    backgroundColor: "#F4FAFB",
    borderRadius: 12,
    gap: 5,
  },

  probabilityLabel: {
    color: theme.colors.muted,
    fontSize: 11,
  },

  probabilityValue: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: "900",
  },

  warningBox: {
    backgroundColor: "#FFF8EA",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },

  meta: {
    color: theme.colors.muted,
    fontSize: 11,
  },

  disclaimer: {
    color: theme.colors.muted,
    fontSize: 11,
    lineHeight: 17,
  },
});

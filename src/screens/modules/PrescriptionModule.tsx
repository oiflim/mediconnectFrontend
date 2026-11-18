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
import * as ImagePicker from "expo-image-picker";
import { File as ExpoFile } from "expo-file-system";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { theme } from "@/lib/theme";
import { Button, Card, PageTitle, Screen, TextField } from "@/components/ui";

type SelectedPrescriptionFile = {
  name: string;
  uri: string;
  mimeType: string;
  size?: number;
  blob: Blob;
};

const supportedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

function getMimeType(name: string, suppliedType?: string | null) {
  if (suppliedType && supportedMimeTypes.has(suppliedType)) {
    return suppliedType;
  }
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "pdf") return "application/pdf";
  return "application/octet-stream";
}

export default function PrescriptionModule() {
  const params = useLocalSearchParams<{ idCardNumber?: string }>();
  const { token } = useAuth();
  const [idCardNumber, setIdCardNumber] = useState(params.idCardNumber || "");
  const [title, setTitle] = useState("Consultation prescription");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [medicineName, setMedicineName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);
  const [file, setFile] = useState<SelectedPrescriptionFile | null>(null);
  const [error, setError] = useState("");
  const selectFile = (selected: SelectedPrescriptionFile) => {
    if (!supportedMimeTypes.has(selected.mimeType)) {
      setFile(null);
      setError("Choose a JPG, PNG, or PDF prescription file.");
      return;
    }
    setFile(selected);
    setError("");
    if (title === "Consultation prescription") {
      setTitle(selected.name.replace(/\.[^/.]+$/, ""));
    }
  };
  const browseFile = async () => {
    setError("");
    setFileBusy(true);
    try {
      if (Platform.OS !== "web") {
        const result = await ExpoFile.pickFileAsync({
          mimeTypes: ["image/jpeg", "image/png", "application/pdf"],
          multipleFiles: false,
        });
        if (result.canceled) return;
        const selected = result.result;
        selectFile({
          name: selected.name,
          uri: selected.uri,
          mimeType: getMimeType(selected.name, selected.type),
          size: selected.size,
          blob: selected,
        });
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png", "application/pdf"],
        multiple: false,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      let blob: Blob;
      if (asset.file) {
        blob = asset.file;
      } else {
        const response = await fetch(asset.uri);
        if (!response.ok) {
          throw new Error("Could not read the selected file.");
        }
        blob = await response.blob();
      }
      selectFile({
        name: asset.name,
        uri: asset.uri,
        mimeType: getMimeType(asset.name, asset.mimeType),
        size: asset.size,
        blob,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not select the file.");
    } finally {
      setFileBusy(false);
    }
  };
  const takePhoto = async () => {
    setError("");
    setFileBusy(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("Allow camera access to take a prescription photo.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.9,
      });
      if (result.canceled || !result.assets.length) return;
      const asset = result.assets[0];
      const name = asset.fileName || `prescription-${Date.now()}.jpg`;
      const mimeType = getMimeType(name, asset.mimeType);
      selectFile({
        name,
        uri: asset.uri,
        mimeType,
        size: asset.fileSize,
        blob: new ExpoFile(asset.uri),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not take a photo.");
    } finally {
      setFileBusy(false);
    }
  };
  const submit = async () => {
    setError("");
    if (!idCardNumber.trim()) {
      setError("Patient ID card number is required.");
      return;
    }
    if (medicineName.trim() && !dosage.trim()) {
      setError("Enter a dosage for the medicine.");
      return;
    }
    if (file && !supportedMimeTypes.has(file.mimeType)) {
      setError("Choose a JPG, PNG, or PDF prescription file.");
      return;
    }
    try {
      setBusy(true);
      const payload = {
        idCardNumber: idCardNumber.trim().toUpperCase(),
        title,
        diagnosis,
        notes,
        medicines: medicineName.trim()
          ? [{ name: medicineName.trim(), dosage, frequency, duration, instructions }]
          : [],
      };
      if (file) {
        const form = new FormData();
        form.append("idCardNumber", payload.idCardNumber);
        form.append("title", payload.title);
        form.append("diagnosis", payload.diagnosis);
        form.append("notes", payload.notes);
        form.append("medicines", JSON.stringify(payload.medicines));
        form.append("file", file.blob, file.name);
        await api.post("/records/prescriptions", form, token);
      } else {
        await api.post("/records/prescriptions", payload, token);
      }
      setFile(null);
      Alert.alert(
        "Prescription saved",
        "The prescription is now part of the patient record.",
      );
      router.replace("/module/records");
    } catch (e: any) {
      setError(e.message || "Could not create prescription.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <PageTitle
        title="Create prescription"
        subtitle="Create a clinical prescription for an existing patient. The patient will receive an in-app notification."
      />
      <Card>
        <TextField
          label="Patient ID card number *"
          value={idCardNumber}
          onChangeText={setIdCardNumber}
          autoCapitalize="characters"
          placeholder="Patient ID card"
        />
        <Text style={styles.section}>Prescription attachment (optional)</Text>
        <Text style={styles.note}>
          Browse for a JPG, PNG, or PDF, or take a photo of the prescription.
        </Text>
        <View style={styles.fileButtons}>
          <Button
            compact
            secondary
            title="Browse files"
            icon="folder-open-outline"
            onPress={browseFile}
            loading={fileBusy}
            disabled={busy}
            style={styles.fileButton}
          />
          {Platform.OS !== "web" ? (
            <Button
              compact
              secondary
              title="Take photo"
              icon="camera-outline"
              onPress={takePhoto}
              loading={fileBusy}
              disabled={busy}
              style={styles.fileButton}
            />
          ) : null}
        </View>
        {file ? (
          <View style={styles.selectedFile}>
            <Ionicons
              name={file.mimeType === "application/pdf" ? "document-text-outline" : "image-outline"}
              size={20}
              color={theme.colors.primary}
            />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={styles.fileName}>{file.name}</Text>
              <Text style={styles.note}>{file.mimeType}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove attached prescription"
              onPress={() => setFile(null)}
              disabled={busy || fileBusy}
              style={styles.removeFile}
            >
              <Ionicons name="close" size={18} color={theme.colors.danger} />
            </Pressable>
          </View>
        ) : null}
        <TextField
          label="Prescription title"
          value={title}
          onChangeText={setTitle}
        />
        <TextField
          label="Diagnosis"
          value={diagnosis}
          onChangeText={setDiagnosis}
          placeholder="Clinical assessment"
        />
        <TextField
          label="Clinical notes"
          value={notes}
          onChangeText={setNotes}
          multiline
        />
        <Text style={styles.section}>Medicine details (optional)</Text>
        <TextField
          label="Medicine name"
          value={medicineName}
          onChangeText={setMedicineName}
          placeholder="Medicine and strength"
        />
        <TextField
          label="Dosage"
          value={dosage}
          onChangeText={setDosage}
          placeholder="1 tablet"
        />
        <TextField
          label="Frequency"
          value={frequency}
          onChangeText={setFrequency}
          placeholder="Twice daily"
        />
        <TextField
          label="Duration"
          value={duration}
          onChangeText={setDuration}
          placeholder="5 days"
        />
        <TextField
          label="Instructions"
          value={instructions}
          onChangeText={setInstructions}
          placeholder="After food"
        />
        <Text style={styles.note}>
          Enter clear instructions. Prescription information should be reviewed
          and supplied by an authorized clinician.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          title="Save prescription"
          onPress={submit}
          loading={busy}
          disabled={fileBusy}
          icon="document-text-outline"
        />
      </Card>
    </Screen>
  );
}
const styles = StyleSheet.create({
  section: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.ink,
    marginTop: 5,
  },
  note: { fontSize: 11, color: theme.colors.muted, lineHeight: 16 },
  fileButtons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  fileButton: { flexGrow: 1 },
  selectedFile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 11,
    borderRadius: 13,
    backgroundColor: "#F1FAFB",
  },
  fileName: { fontSize: 12, fontWeight: "800", color: theme.colors.ink },
  removeFile: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCECEC",
  },
  error: { fontSize: 12, color: theme.colors.danger },
});

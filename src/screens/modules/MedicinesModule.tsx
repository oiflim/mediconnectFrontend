import React, { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { Medicine } from "@/lib/types";
import { prettyDate, titleCase } from "@/lib/format";
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

export default function MedicinesModule({
  mode = "all",
}: {
  mode?: "all" | "low-stock" | "expired";
}) {
  const { token, user } = useAuth();
  const manager = user?.role === "medicine_manager" || user?.role === "admin";
  const [items, setItems] = useState<Medicine[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [name, setName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [category, setCategory] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [reorderLevel, setReorderLevel] = useState("10");
  const [expiryDate, setExpiryDate] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [description, setDescription] = useState("");
  const [unit, setUnit] = useState("unit");
  const load = useCallback(async (refresh = false) => {
    if (!token) return;
    if (!refresh) setLoading(true);
    setError("");
    try {
      const path =
        mode === "low-stock"
          ? "/medicines/low-stock"
          : mode === "expired"
            ? "/medicines/expired"
            : `/medicines?isActive=true&limit=200${query.trim() ? `&search=${encodeURIComponent(query.trim())}` : ""}`;
      setItems(await api.get<Medicine[]>(path, token));
    } catch (e: any) {
      setError(e.message || "Unable to load medicine data.");
    } finally {
      setLoading(false);
    }
  }, [token, mode, query]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const startEdit = (item: Medicine) => {
    setEditingId(item._id);
    setName(item.name);
    setGenericName(item.genericName || "");
    setCategory(item.category);
    setBatchNumber(item.batchNumber);
    setQuantity(String(item.quantity));
    setReorderLevel(String(item.reorderLevel));
    setExpiryDate(
      item.expiryDate
        ? new Date(item.expiryDate).toISOString().slice(0, 10)
        : "",
    );
    setManufacturer(item.manufacturer || "");
    setDescription(item.description || "");
    setUnit(item.unit || "unit");
    setShowAdd(true);
  };
  const saveMedicine = async () => {
    setError("");
    if (
      !name.trim() ||
      !category.trim() ||
      !batchNumber.trim() ||
      !expiryDate.trim()
    ) {
      setError("Name, category, batch number and expiry date are required.");
      return;
    }
    const exp = new Date(`${expiryDate}T23:59:00`);
    if (Number.isNaN(exp.getTime())) {
      setError("Enter expiry date as YYYY-MM-DD.");
      return;
    }
    try {
      setBusy(true);
      const payload = {
        name,
        genericName,
        category,
        batchNumber,
        quantity: Number(quantity || 0),
        reorderLevel: Number(reorderLevel || 10),
        expiryDate: exp.toISOString(),
        manufacturer,
        description,
        unit,
      };
      if (editingId) await api.patch(`/medicines/${editingId}`, payload, token);
      else await api.post("/medicines", payload, token);
      setShowAdd(false);
      setEditingId("");
      setName("");
      setGenericName("");
      setCategory("");
      setBatchNumber("");
      setQuantity("0");
      setReorderLevel("10");
      setExpiryDate("");
      setManufacturer("");
      setDescription("");
      setUnit("unit");
      load();
    } catch (e: any) {
      setError(e.message || "Medicine could not be created.");
    } finally {
      setBusy(false);
    }
  };
  const stock = async (item: Medicine, type: "add" | "remove") => {
    try {
      const next = await api.patch<Medicine>(
        `/medicines/${item._id}/stock`,
        { type, amount: 1 },
        token,
      );
      setItems((xs) => xs.map((x) => (x._id === item._id ? next : x)));
    } catch (e: any) {
      Alert.alert("Stock not updated", e.message);
    }
  };
  const toggleActive = async (item: Medicine) => {
    try {
      const next = await api.patch<Medicine>(
        `/medicines/${item._id}`,
        { isActive: !item.isActive },
        token,
      );
      setItems((xs) => xs.map((x) => (x._id === item._id ? next : x)));
    } catch (e: any) {
      Alert.alert("Unable to update item", e.message);
    }
  };
  const remove = async (item: Medicine) =>
    Alert.alert(
      "Delete medicine",
      "This permanently removes the medicine from the inventory catalogue.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/medicines/${item._id}`, token);
              setItems((xs) => xs.filter((x) => x._id !== item._id));
            } catch (e: any) {
              Alert.alert("Delete failed", e.message);
            }
          },
        },
      ],
    );
  if (loading)
    return (
      <Screen onRefresh={() => load(true)}>
        <Loader label="Loading medicine inventory…" />
      </Screen>
    );
  return (
    <Screen>
      <PageTitle
        title={
          mode === "low-stock"
            ? "Low-stock medicines"
            : mode === "expired"
              ? "Expired medicines"
              : "Medicine catalogue"
        }
        subtitle={
          manager
            ? "Manage medicine details and stock levels."
            : "Browse the medicine inventory and availability status."
        }
      />
      {mode === "all" ? (
        <Card style={{ gap: 9 }}>
          <TextField
            label="Search catalogue"
            placeholder="Medicine, generic name or batch"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => setQuery(search)}
            returnKeyType="search"
          />
          <Button
            compact
            title="Search"
            icon="search"
            onPress={() => setQuery(search)}
          />
        </Card>
      ) : null}
      {manager && mode === "all" ? (
        <Button
          title={showAdd ? "Close new medicine form" : "Add medicine"}
          icon={showAdd ? "close" : "add-circle-outline"}
          onPress={() => setShowAdd((x) => !x)}
        />
      ) : null}
      {showAdd ? (
        <Card>
          <Text style={styles.cardTitle}>
            {editingId ? "Edit inventory item" : "New inventory item"}
          </Text>
          <TextField
            label="Medicine name *"
            value={name}
            onChangeText={setName}
          />
          <TextField
            label="Generic name"
            value={genericName}
            onChangeText={setGenericName}
          />
          <TextField
            label="Category *"
            value={category}
            onChangeText={setCategory}
            placeholder="e.g. Analgesic"
          />
          <TextField
            label="Batch number *"
            value={batchNumber}
            onChangeText={setBatchNumber}
            autoCapitalize="characters"
          />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <TextField
                label="Quantity"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label="Reorder level"
                value={reorderLevel}
                onChangeText={setReorderLevel}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <TextField
            label="Expiry date (YYYY-MM-DD) *"
            value={expiryDate}
            onChangeText={setExpiryDate}
            placeholder="2027-08-31"
          />
          <TextField
            label="Unit"
            value={unit}
            onChangeText={setUnit}
            placeholder="tablet, bottle, box…"
          />
          <TextField
            label="Manufacturer"
            value={manufacturer}
            onChangeText={setManufacturer}
          />
          <TextField
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <Button
            title={editingId ? "Save inventory changes" : "Save inventory item"}
            onPress={saveMedicine}
            loading={busy}
          />
          <Button
            title="Close"
            onPress={() => {
              setShowAdd(false);
              setEditingId("");
            }}
            secondary
            compact
          />
        </Card>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {items.length === 0 ? (
        <Card>
          <EmptyState
            title="No medicines found"
            message="Try a different search or add a medicine to the catalogue."
            icon="medkit-outline"
          />
        </Card>
      ) : (
        items.map((item) => {
          const tone =
            item.availabilityStatus === "AVAILABLE"
              ? "success"
              : item.availabilityStatus === "LOW_STOCK"
                ? "warning"
                : item.availabilityStatus === "EXPIRED" ||
                    item.availabilityStatus === "OUT_OF_STOCK"
                  ? "danger"
                  : "neutral";
          return (
            <Card key={item._id}>
              <View style={styles.itemTop}>
                <View style={styles.itemIcon}>
                  <Ionicons
                    name="medkit-outline"
                    color={theme.colors.primary}
                    size={21}
                  />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.medicineName}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {item.genericName || item.category} · Batch{" "}
                    {item.batchNumber}
                  </Text>
                </View>
                <Chip
                  label={titleCase(item.availabilityStatus || "available")}
                  tone={tone as any}
                />
              </View>
              <View style={styles.detailGrid}>
                <Detail
                  label="Quantity"
                  value={`${item.quantity} ${item.unit || "units"}`}
                />
                <Detail label="Reorder at" value={String(item.reorderLevel)} />
                <Detail label="Expires" value={prettyDate(item.expiryDate)} />
                <Detail label="Manufacturer" value={item.manufacturer || "—"} />
              </View>
              {item.description ? (
                <Text style={styles.meta}>{item.description}</Text>
              ) : null}
              {manager ? (
                <View style={styles.actions}>
                  <Button
                    compact
                    secondary
                    title="+1 stock"
                    icon="add"
                    onPress={() => stock(item, "add")}
                  />
                  <Button
                    compact
                    secondary
                    title="−1 stock"
                    icon="remove"
                    onPress={() => stock(item, "remove")}
                    disabled={item.quantity <= 0}
                  />
                  <Button
                    compact
                    secondary
                    title={item.isActive ? "Deactivate" : "Activate"}
                    icon="power-outline"
                    onPress={() => toggleActive(item)}
                  />
                  <Button
                    compact
                    secondary
                    title="Edit"
                    icon="create-outline"
                    onPress={() => startEdit(item)}
                  />
                  <Pressable onPress={() => remove(item)} style={styles.delete}>
                    <Ionicons
                      name="trash-outline"
                      color={theme.colors.danger}
                      size={18}
                    />
                  </Pressable>
                </View>
              ) : null}
            </Card>
          );
        })
      )}
      {!manager ? (
        <Text style={styles.footnote}>
          This catalogue shows inventory information only. Ordering and payment
          are not available through the current backend.
        </Text>
      ) : null}
    </Screen>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  cardTitle: { fontSize: 15, fontWeight: "900", color: theme.colors.ink },
  row: { flexDirection: "row", gap: 10 },
  error: { fontSize: 12, color: theme.colors.danger },
  itemTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  medicineName: { fontSize: 14, fontWeight: "900", color: theme.colors.ink },
  meta: { fontSize: 11, color: theme.colors.muted, lineHeight: 17 },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    paddingVertical: 4,
  },
  detailLabel: { fontSize: 10, color: theme.colors.muted, fontWeight: "700" },
  detailValue: { fontSize: 12, color: theme.colors.ink, fontWeight: "800" },
  actions: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
  },
  delete: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FCECEC",
    alignItems: "center",
    justifyContent: "center",
  },
  footnote: {
    fontSize: 11,
    color: theme.colors.muted,
    lineHeight: 17,
    textAlign: "center",
  },
});

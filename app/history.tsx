import { useEffect, useState } from "react";
import {
  Alert,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Button,
  RefreshControl,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import dayjs from "dayjs";
import { Link, useRouter } from "expo-router";
import { currentWeekWindowSundayToSaturday, isoDate, fmtHm } from "../lib/week";
import { entriesInRange, weekTotals, deleteEntry } from "../lib/repo";
import type { OvertimeEntry } from "../lib/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function History() {
  const router = useRouter();
  const [{ start, end }] = useState(() => currentWeekWindowSundayToSaturday(dayjs()));
  const [rows, setRows] = useState<OvertimeEntry[]>([]);
  const [totals, setTotals] = useState({ hours: 0, gross: 0, tax: 0, net: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 24) + 24; // safe area + extra space

  async function load() {
    setRows(await entriesInRange(isoDate(start), isoDate(end)));
    setTotals(await weekTotals(isoDate(start), isoDate(end)));
  }

  useEffect(() => {
    load();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // CSV helpers

  async function ensureExportsDir() {
    const base = FileSystem.documentDirectory; // persistent app sandbox
    const dir = base + "exports/";
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    return dir;
  }

  function csvEscape(val: unknown): string {
    const s = String(val ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function buildCsv(entries: OvertimeEntry[]) {
    const header = ["Date","Start","End","Hours","Multiplier","BaseRate","Gross","Tax","Net"];
    const lines = [header.join(",")];
    for (const r of entries) {
      lines.push([
        r.date, fmtHm(r.start_min), fmtHm(r.end_min), (r.duration_min/60).toFixed(2),
        r.multiplier_applied.toFixed(2), r.base_rate_applied.toFixed(2),
        r.gross.toFixed(2), r.tax_withheld.toFixed(2), r.net.toFixed(2)
      ].map(csvEscape).join(","));
    }
    lines.push([
      "Totals","","", totals.hours.toFixed(2),"","",
      totals.gross.toFixed(2), totals.tax.toFixed(2), totals.net.toFixed(2)
    ].map(csvEscape).join(","));
    return lines.join("\r\n"); // CRLF-friendly for Excel
  }

  async function exportCsv() {
    try {
      const csv = buildCsv(rows);
      const filename = `overtime_week_${isoDate(start)}_${isoDate(end)}.csv`;

      if (Platform.OS === "web") {
        // Browser download
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      // Mobile: save to persistent app docs dir
      const dir = await ensureExportsDir();               // e.g., file:///.../documents/exports/
      const uri = dir + filename;                         // full persistent path
      await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });

      // Try to share/open
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: "text/csv", dialogTitle: "Share weekly overtime CSV" });
      }

      // Let the user know where it lives regardless
      alert(`CSV saved to:\n${uri}\n\nTip: You can export again or share this file from here.`);

    } catch (e: any) {
      alert(`Export failed: ${e?.message ?? e}`);
    }
  }

  async function listExports() {
    const dir = await ensureExportsDir();
    const files = await FileSystem.readDirectoryAsync(dir);
    alert(`exports/ contains:\n${files.join("\n") || "(empty)"}`);
  }

  async function handleDelete(id: number) {
    Alert.alert("Delete entry", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteEntry(id);
          await load();
        }
      }
    ]);
  }



  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, rowGap: 10, paddingBottom: bottomPad }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Text style={{ fontSize: 20, fontWeight: "700" }}>
            Week {isoDate(start)}–{isoDate(end)}
          </Text>

          {rows.length === 0 && (
            <View style={{ padding: 16, borderWidth: 1, borderRadius: 8 }}>
              <Text>No entries this week.</Text>
            </View>
          )}

          {rows.map((r) => (
            <View
              key={r.id}
              style={{ borderWidth: 1, borderRadius: 8, padding: 10, gap: 6 }}
            >
              <Text>
                {dayjs(r.date).format("ddd")} {r.date} • {fmtHm(r.start_min)}–{fmtHm(r.end_min)} • {r.multiplier_applied}x
              </Text>
              <Text>Duration: {(r.duration_min / 60).toFixed(2)} h</Text>
              <Text>Gross €{r.gross} • Tax €{r.tax_withheld} • Net €{r.net}</Text>

              <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
                <View style={{ flex: 1 }}>
                  {/* Edit navigates to Add in edit mode */}
                  <Link
                    asChild
                    href={{ pathname: "/add", params: { id: String(r.id) } }}
                  >
                    <Button title="Edit" />
                  </Link>
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Delete"
                    color="#c62828"
                    onPress={() => handleDelete(r.id!)}
                  />
                </View>
              </View>
            </View>
          ))}


          <View style={{ padding: 12, borderWidth: 1, borderRadius: 8 }}>
            <Text>
              Totals — Hours {totals.hours} • Gross €{totals.gross} • Tax €{totals.tax} • Net €
              {totals.net}
            </Text>
          </View>

          <View style={{ marginTop: 8 }}>
            <Button title="List Saved CSVs" onPress={listExports} />
          </View>


          {/* Action buttons inside scroll flow (no overlap with system nav) */}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Button title="Back to Dashboard" onPress={() => router.back()} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Refresh" onPress={onRefresh} />
              </View>
            </View>

            <View style={{ marginTop: 8 }}>
              <Button title="Export CSV" onPress={exportCsv} />
            </View>

            {/* final spacer to guarantee clearance above system nav */}
            <View style={{ height: bottomPad }} />
          </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

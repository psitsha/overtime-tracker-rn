import { useEffect, useState } from "react";
import {
  Alert,
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Button,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Print from "expo-print";
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

  function buildPdfHtml(rows: OvertimeEntry[], startISO: string, endISO: string, totals: {hours:number; gross:number; tax:number; net:number}) {
    const rowsHtml = rows.map(r => `
      <tr>
        <td>${dayjs(r.date).format("ddd")}</td>
        <td>${r.date}</td>
        <td>${fmtHm(r.start_min)}–${fmtHm(r.end_min)}</td>
        <td style="text-align:right">${(r.duration_min/60).toFixed(2)}</td>
        <td style="text-align:right">${r.multiplier_applied.toFixed(2)}x</td>
        <td style="text-align:right">€${r.gross.toFixed(2)}</td>
        <td style="text-align:right">€${r.tax_withheld.toFixed(2)}</td>
        <td style="text-align:right">€${r.net.toFixed(2)}</td>
      </tr>
    `).join("");

    return `
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:24px;}
        .wrap{max-width:720px;margin:0 auto;border:1px solid #eee;border-radius:16px;padding:24px;box-shadow:0 6px 18px rgba(0,0,0,.08)}
        h1{margin:0 0 8px;font-size:22px}
        h2{margin:0 0 16px;font-size:16px;color:#666}
        table{width:100%;border-collapse:collapse}
        th,td{padding:8px 6px;border-bottom:1px solid #eee;font-size:12px}
        th{background:#fafafa;text-align:left}
        .tot{margin-top:16px;padding-top:8px;border-top:2px solid #f0f0f0;font-size:14px}
        .r{text-align:right}
      </style>
    </head>
    <body>
      <div class="wrap">
        <h1>Overtime — ${startISO} → ${endISO}</h1>
        <h2>Weekly Summary</h2>
        <table>
          <thead>
            <tr>
              <th>Day</th><th>Date</th><th>Time</th>
              <th class="r">Hours</th><th class="r">Mult</th>
              <th class="r">Gross</th><th class="r">Tax</th><th class="r">Net</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="8" style="text-align:center;color:#888;">No entries</td></tr>`}
          </tbody>
        </table>
        <div class="tot">
          <div><b>Hours:</b> ${totals.hours.toFixed(2)}</div>
          <div><b>Gross:</b> €${totals.gross.toFixed(2)}</div>
          <div><b>Tax:</b> €${totals.tax.toFixed(2)}</div>
          <div><b>Net:</b> €${totals.net.toFixed(2)}</div>
        </div>
      </div>
    </body>
    </html>`;
  }

  async function exportPdf() {
    try {
      const startISO = isoDate(start);
      const endISO = isoDate(end);
      const html = buildPdfHtml(rows, startISO, endISO, totals);
      const filename = `overtime_${startISO}_${endISO}.pdf`;

      // If expo-print isn't available (e.g., web), fall back to HTML download
      const canUsePrint = Print && typeof (Print as any).printToFileAsync === "function";

      if (Platform.OS === "web" || !canUsePrint) {
        // Save HTML; user can Print -> Save as PDF from the browser
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `overtime_${startISO}_${endISO}.html`;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert?.("Saved", "Downloaded HTML. Open it and use the browser Print → Save as PDF.");
        return;
      }

      // Android / iOS: generate a PDF file in the app cache
      const { uri: cachePdfUri } = await Print.printToFileAsync({ html });

      if (Platform.OS === "android") {
        // Try to save to Downloads via SAF
        const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (perm.granted) {
          const base64 = await FileSystem.readAsStringAsync(cachePdfUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
            perm.directoryUri,
            filename,
            "application/pdf"
          );
          await FileSystem.writeAsStringAsync(destUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          Alert.alert("Saved", "PDF saved to the selected folder (e.g., Downloads).");
          return;
        }
        // Fallback: share sheet
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(cachePdfUri, {
            mimeType: "application/pdf",
            dialogTitle: "Share weekly PDF",
          });
          return;
        }
        Alert.alert("Saved (cache)", cachePdfUri);
        return;
      }

      // iOS: share sheet (user can save to Files/iCloud)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(cachePdfUri, {
          mimeType: "application/pdf",
          dialogTitle: "Share weekly PDF",
        });
      } else {
        Alert.alert("PDF ready", cachePdfUri);
      }
    } catch (e: any) {
      Alert.alert("Export failed", e?.message ?? String(e));
    }
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
            <Link href="/weekly-card" asChild>
              <Button title="List Saved PDFs" onPress={() => {}} />
            </Link>
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
              <Button title="Export PDF" onPress={exportPdf} />
            </View>

            {/* final spacer to guarantee clearance above system nav */}
            <View style={{ height: bottomPad }} />
          </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

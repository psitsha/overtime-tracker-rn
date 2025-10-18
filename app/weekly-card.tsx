// app/weekly-card.tsx
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Button,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";

import { entriesInRange, weekTotals } from "../lib/repo";
import type { OvertimeEntry } from "../lib/types";
import { fmtHm, isoDate } from "../lib/week";
import { theme } from "../lib/theme";

dayjs.extend(weekOfYear);

function weekStartSunday(d = dayjs()) {
  return d.subtract(d.day(), "day").startOf("day");
}
function weekRangeFromSunday(sunday: dayjs.Dayjs) {
  const start = sunday.startOf("day");
  const end = sunday.add(6, "day").endOf("day");
  return { start, end };
}

export default function WeeklyCard() {
  const [anchor, setAnchor] = useState(() => weekStartSunday(dayjs()));
  const { start, end } = useMemo(() => weekRangeFromSunday(anchor), [anchor]);

  const [rows, setRows] = useState<OvertimeEntry[]>([]);
  const [totals, setTotals] = useState({ hours: 0, gross: 0, tax: 0, net: 0 });
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(false);

  async function loadWeek(dStart: dayjs.Dayjs, dEnd: dayjs.Dayjs) {
    const s = isoDate(dStart),
      e = isoDate(dEnd);
    setRows(await entriesInRange(s, e));
    setTotals(await weekTotals(s, e));
  }
  async function refresh() {
    await loadWeek(start, end);
    const prevStart = anchor.subtract(1, "week");
    const nextStart = anchor.add(1, "week");
    const prev = await entriesInRange(isoDate(prevStart), isoDate(prevStart.add(6, "day")));
    const next = await entriesInRange(isoDate(nextStart), isoDate(nextStart.add(6, "day")));
    setHasPrev(prev.length > 0);
    setHasNext(next.length > 0);
  }
  useEffect(() => {
    refresh();
  }, [anchor.valueOf()]);

  function buildHtml(): string {
    const rowsHtml = rows
      .map(
        (r) => `
      <tr>
        <td>${dayjs(r.date).format("ddd")}</td>
        <td>${r.date}</td>
        <td>${fmtHm(r.start_min)}–${fmtHm(r.end_min)}</td>
        <td style="text-align:right">${(r.duration_min / 60).toFixed(2)}</td>
        <td style="text-align:right">${r.multiplier_applied.toFixed(2)}x</td>
        <td style="text-align:right">€${r.gross.toFixed(2)}</td>
        <td style="text-align:right">€${r.tax_withheld.toFixed(2)}</td>
        <td style="text-align:right">€${r.net.toFixed(2)}</td>
      </tr>`
      )
      .join("");

    return `<!doctype html><html><head><meta charset="utf-8" />
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;margin:24px}
        .card{max-width:680px;margin:0 auto;border:1px solid #eee;border-radius:16px;padding:24px;box-shadow:0 6px 18px rgba(0,0,0,.08)}
        h1{margin:0 0 8px;font-size:22px} h2{margin:0 0 16px;font-size:16px;color:#666}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{padding:8px 6px;border-bottom:1px solid #eee;font-size:12px}
        th{background:#fafafa;text-align:left}
        .tot{margin-top:16px;padding-top:8px;border-top:2px solid #f0f0f0;font-size:14px}
        .r{text-align:right}
      </style></head><body>
      <div class="card">
        <h1>Week ${start.week()} ${start.year()}</h1>
        <h2>${isoDate(start)} → ${isoDate(end)}</h2>
        <table><thead><tr>
          <th>Day</th><th>Date</th><th>Time</th>
          <th class="r">Hours</th><th class="r">Mult</th>
          <th class="r">Gross</th><th class="r">Tax</th><th class="r">Net</th>
        </tr></thead><tbody>
          ${rowsHtml || `<tr><td colspan="8" style="text-align:center;color:#888;">No entries</td></tr>`}
        </tbody></table>
        <div class="tot">
          <div><b>Hours:</b> ${totals.hours.toFixed(2)}</div>
          <div><b>Gross:</b> €${totals.gross.toFixed(2)}</div>
          <div><b>Tax:</b> €${totals.tax.toFixed(2)}</div>
          <div><b>Net:</b> €${totals.net.toFixed(2)}</div>
        </div>
      </div>
    </body></html>`;
  }

  async function downloadPdf() {
    try {
      const html = buildHtml();
      const { uri: cachePdfUri } = await Print.printToFileAsync({ html });
      const filename = `overtime_${isoDate(start)}_${isoDate(end)}.pdf`;

      if (Platform.OS === "web") {
        const buf = await (await fetch(cachePdfUri)).arrayBuffer();
        const blob = new Blob([buf], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      if (Platform.OS === "android") {
        const perm = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (perm.granted) {
          const base64 = await FileSystem.readAsStringAsync(cachePdfUri, { encoding: FileSystem.EncodingType.Base64 });
          const dest = await FileSystem.StorageAccessFramework.createFileAsync(
            perm.directoryUri,
            filename,
            "application/pdf"
          );
          await FileSystem.writeAsStringAsync(dest, base64, { encoding: FileSystem.EncodingType.Base64 });
          Alert.alert("Saved", "PDF saved to selected directory (e.g., Downloads).");
          return;
        }
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(cachePdfUri, { mimeType: "application/pdf", dialogTitle: "Share weekly PDF" });
          return;
        }
        Alert.alert("Saved (cache)", cachePdfUri);
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(cachePdfUri, { mimeType: "application/pdf", dialogTitle: "Share weekly PDF" });
      } else {
        Alert.alert("PDF ready", cachePdfUri);
      }
    } catch (e: any) {
      Alert.alert("PDF error", e?.message ?? String(e));
    }
  }

  const noData = rows.length === 0 && totals.hours === 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, alignItems: "center" }}
        >
          {/* Year */}
          <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>{start.year()}</Text>

          {/* Row with left arrow — card — right arrow */}
          <View
            style={{
              width: "100%",
              flexDirection: "row",
              alignItems: "stretch",
              justifyContent: "center",
            }}
          >
            {/* Left arrow */}
            <Pressable
              disabled={!hasPrev}
              onPress={() => setAnchor((a) => a.subtract(1, "week"))}
              style={{ justifyContent: "center", paddingHorizontal: 10, opacity: hasPrev ? 1 : 0.3 }}
            >
              <Text style={{ fontSize: 26 }}>‹</Text>
            </Pressable>

            {/* Card */}
            <View style={{ flex: 1, maxWidth: 440 }}>
              <View
                style={{
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: theme.border,
                  padding: 16,
                  backgroundColor: theme.cardBg,
                  shadowColor: "#000",
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}
              >
                {/* Branded header (two rows: title, then pill) */}
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image
                      source={require("../assets/logo.png")}
                      style={{ width: 32, height: 32, resizeMode: "contain", marginRight: 8 }}
                    />
                    <Text
                      style={{ fontSize: 20, fontWeight: "700", color: theme.primaryText, flexShrink: 1 }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      Overtime Summary
                    </Text>
                  </View>

                  {/* Date pill on its own line, right aligned */}
                  <View style={{ alignSelf: "flex-end" }}>
                    <View
                      style={{
                        backgroundColor: theme.primary,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 999,
                      }}
                    >
                      <Text style={{ color: "white", fontSize: 12 }}>
                        {isoDate(start)} → {isoDate(end)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Secondary heading */}
                <Text style={{ fontSize: 14, color: "#666", marginTop: 8, marginBottom: 12 }}>
                  Week {start.week()} {start.year()}
                </Text>

                {/* Illustration */}
                <View
                  style={{
                    height: 200,
                    borderRadius: 12,
                    backgroundColor: "#fff7e6",
                    alignItems: "center",
                    justifyContent: "center",
                    marginVertical: 8,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Text style={{ fontSize: 48 }}>💰</Text>
                </View>

                {/* Download */}
                <View style={{ marginTop: 8 }}>
                  <Button
                    title={noData ? "No Entries This Week" : "Download"}
                    onPress={downloadPdf}
                    disabled={noData}
                    color={Platform.OS === "ios" ? undefined : theme.primary}
                  />
                </View>
              </View>
            </View>

            {/* Right arrow */}
            <Pressable
              disabled={!hasNext}
              onPress={() => setAnchor((a) => a.add(1, "week"))}
              style={{ justifyContent: "center", paddingHorizontal: 10, opacity: hasNext ? 1 : 0.3 }}
            >
              <Text style={{ fontSize: 26 }}>›</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

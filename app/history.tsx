import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import dayjs from "dayjs";
import { currentWeekWindowSundayToSaturday, isoDate, fmtHm } from "../lib/week";
import { entriesInRange, weekTotals } from "../lib/repo";
import type { OvertimeEntry } from "../lib/types";

export default function History() {
  const [{ start, end }] = useState(() => currentWeekWindowSundayToSaturday(dayjs()));
  const [rows, setRows] = useState<OvertimeEntry[]>([]);
  const [totals, setTotals] = useState({ hours: 0, gross: 0, tax: 0, net: 0 });

  useEffect(() => {
    (async () => {
      setRows(await entriesInRange(isoDate(start), isoDate(end)));
      setTotals(await weekTotals(isoDate(start), isoDate(end)));
    })();
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>
        Week {isoDate(start)}–{isoDate(end)}
      </Text>
      {rows.map((r) => (
        <View key={r.id} style={{ borderWidth: 1, borderRadius: 8, padding: 10 }}>
          <Text>{r.date} • {fmtHm(r.start_min)}–{fmtHm(r.end_min)} • {r.multiplier_applied}x</Text>
          <Text>Gross €{r.gross} • Net €{r.net}</Text>
        </View>
      ))}
      <View style={{ padding: 12, borderWidth: 1, borderRadius: 8 }}>
        <Text>Totals — Hours {totals.hours} • Gross €{totals.gross} • Net €{totals.net}</Text>
      </View>
    </ScrollView>
  );
}

import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View, ScrollView, Button } from "react-native";
import dayjs from "dayjs";
import { currentWeekWindowSundayToSaturday, isoDate } from "../lib/week";
import { weekTotals } from "../lib/repo";

export default function Dashboard() {
  const [{ start, end }] = useState(() => currentWeekWindowSundayToSaturday(dayjs()));
  const [totals, setTotals] = useState({ hours: 0, gross: 0, tax: 0, net: 0 });

  async function refresh() {
    const t = await weekTotals(isoDate(start), isoDate(end));
    setTotals(t);
  }

  useEffect(() => { refresh(); }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text>Week (Sun–Sat): {isoDate(start)} → {isoDate(end)}</Text>
      <View style={{ padding: 12, borderWidth: 1, borderRadius: 8 }}>
        <Text>Hours: {totals.hours}</Text>
        <Text>Gross: €{totals.gross}</Text>
        <Text>Tax: €{totals.tax}</Text>
        <Text>Net: €{totals.net}</Text>
      </View>

      <Text style={{ marginTop: 8, fontWeight: "600" }}>Quick Add</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Link href={{ pathname: "/add", params: { preset: "6-8", type: "TIME_AND_HALF" }}} asChild>
          <Button title="6–8 (1.5x)" />
        </Link>
        <Link href={{ pathname: "/add", params: { preset: "7-8", type: "TIME_AND_HALF" }}} asChild>
          <Button title="7–8 (1.5x)" />
        </Link>
        <Link href={{ pathname: "/add", params: { preset: "17-18", type: "TIME_AND_HALF" }}} asChild>
          <Button title="17–18 (1.5x)" />
        </Link>
        <Link href={{ pathname: "/add", params: { preset: "17-19", type: "TIME_AND_HALF" }}} asChild>
          <Button title="17–19 (1.5x)" />
        </Link>
        <Link href={{ pathname: "/add", params: { preset: "SatVar", type: "TIME_AND_HALF" }}} asChild>
          <Button title="Saturday (var) 1.5x" />
        </Link>
        <Link href={{ pathname: "/add", params: { preset: "SunVar", type: "DOUBLE" }}} asChild>
          <Button title="Sunday (var) 2x" />
        </Link>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <Link href="/add" asChild><Button title="+ Add Custom Entry" /></Link>
        <Link href="/history" asChild><Button title="History" /></Link>
        <Link href="/settings" asChild><Button title="Settings" /></Link>
      </View>
    </ScrollView>
  );
}

import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View, ScrollView } from "react-native";
import dayjs from "dayjs";
import { currentWeekWindowSundayToSaturday, isoDate } from "../lib/week";
import { weekTotals } from "../lib/repo";
import { theme } from "../lib/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import Btn from "../components/Btn";

export default function Dashboard() {
  const router = useRouter();
  const [{ start, end }] = useState(() =>
    currentWeekWindowSundayToSaturday(dayjs())
  );
  const [totals, setTotals] = useState({ hours: 0, gross: 0, tax: 0, net: 0 });

  async function refresh() {
    const t = await weekTotals(isoDate(start), isoDate(end));
    setTotals(t);
  }
  useEffect(() => {
    refresh();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,          // tighter top spacing
          paddingBottom: 24,
          gap: 12,
        }}
      >
        {/* Centered heading with minimal top gap */}
        <Text
          style={{
            fontSize: 32,
            fontWeight: "800",
            textAlign: "center",
            alignSelf: "center",
            marginTop: 4,
            marginBottom: 4,
            color: theme.primaryText,
          }}
        >
          Dashboard
        </Text>

        <Text style={{ textAlign: "center", color: theme.mutedText }}>
          Week (Sun–Sat): {isoDate(start)} → {isoDate(end)}
        </Text>

        <View
          style={{
            padding: 12,
            borderWidth: 1,
            borderRadius: 12,
            borderColor: theme.border,
            backgroundColor: theme.cardBg,
          }}
        >
          <Text>Hours: {totals.hours}</Text>
          <Text>Gross: €{totals.gross}</Text>
          <Text>Tax: €{totals.tax}</Text>
          <Text>Net: €{totals.net}</Text>
        </View>

        <Text style={{ marginTop: 8, fontWeight: "600" }}>Quick Add</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Link href={{ pathname: "/add", params: { preset: "6-8", type: "TIME_AND_HALF" } }} asChild>
            <Btn variant="secondary" title="6–8 (1.5x)" />
          </Link>
          <Link href={{ pathname: "/add", params: { preset: "7-8", type: "TIME_AND_HALF" } }} asChild>
            <Btn variant="secondary" title="7–8 (1.5x)" />
          </Link>
          <Link href={{ pathname: "/add", params: { preset: "17-18", type: "TIME_AND_HALF" } }} asChild>
            <Btn variant="secondary" title="17–18 (1.5x)" />
          </Link>
          <Link href={{ pathname: "/add", params: { preset: "17-19", type: "TIME_AND_HALF" } }} asChild>
            <Btn variant="secondary" title="17–19 (1.5x)" />
          </Link>
          <Link href={{ pathname: "/add", params: { preset: "SatVar", type: "TIME_AND_HALF" } }} asChild>
            <Btn variant="secondary" title="Saturday (var) 1.5x" />
          </Link>
          <Link href={{ pathname: "/add", params: { preset: "SunVar", type: "DOUBLE" } }} asChild>
            <Btn variant="secondary" title="Sunday (var) 2x" />
          </Link>
        </View>

        <View style={{ gap: 12 }}>
          <Btn title="Add Entry" onPress={() => router.push("/add")} size="lg" />
          <Btn title="History" variant="secondary" onPress={() => router.push("/history")} />
          <Btn title="Settings" variant="secondary" onPress={() => router.push("/settings")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


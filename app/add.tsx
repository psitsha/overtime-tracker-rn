import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import { getSettings, insertEntry } from "../lib/repo";
import { minutesBetween, minsToHours, computePay, round2 } from "../lib/calc";

function timeToMin(d: Date) { return d.getHours() * 60 + d.getMinutes(); }
function withHm(base: Date, h: number, m: number) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m);
}

export default function AddEntry() {
  const router = useRouter();
  const params = useLocalSearchParams<{ preset?: string; type?: "TIME_AND_HALF" | "DOUBLE" }>();
  const type = params.type ?? "TIME_AND_HALF";
  const preset = params.preset;

  const [date, setDate] = useState<Date>(new Date());
  const [start, setStart] = useState<Date>(withHm(new Date(), 6, 0));
  const [end, setEnd] = useState<Date>(withHm(new Date(), 8, 0));
  const [note, setNote] = useState("");

  const [baseRate, setBaseRate] = useState(15.08);
  const [multiplier, setMultiplier] = useState(1.5);
  const [taxFlatPct, setTaxFlatPct] = useState(0.2);

  // Apply preset defaults (user can still edit)
  useEffect(() => {
    const today = new Date();
    if (preset === "6-8") { setStart(withHm(today, 6, 0)); setEnd(withHm(today, 8, 0)); }
    else if (preset === "7-8") { setStart(withHm(today, 7, 0)); setEnd(withHm(today, 8, 0)); }
    else if (preset === "17-18") { setStart(withHm(today, 17, 0)); setEnd(withHm(today, 18, 0)); }
    else if (preset === "17-19") { setStart(withHm(today, 17, 0)); setEnd(withHm(today, 19, 0)); }
    else if (preset === "SatVar" || preset === "SunVar") {
      setStart(withHm(today, 6, 0));
      setEnd(withHm(today, 14, 0));
    }
  }, [preset]);

  // Load settings
  useEffect(() => {
    (async () => {
      const s = await getSettings();
      setBaseRate(s.current_base_rate);
      const m = JSON.parse(s.multipliers_json) as { time_and_half: number; double: number };
      setMultiplier(type === "DOUBLE" ? m.double : m.time_and_half);
      const t = JSON.parse(s.tax_profile_json) as { mode: "flat"; flatPct: number };
      setTaxFlatPct(t.flatPct);
    })();
  }, [type]);

  const startMin = timeToMin(start);
  const endMin = timeToMin(end);
  const durationMin = minutesBetween(startMin, endMin);
  const hours = minsToHours(durationMin);
  const { gross, tax_withheld, net } = computePay({
    hours,
    baseRate,
    multiplier,
    taxProfile: { mode: "flat", flatPct: taxFlatPct },
  });

  async function save() {
    if (durationMin <= 0) { Alert.alert("Invalid duration"); return; }
    await insertEntry({
      date: dayjs(date).format("YYYY-MM-DD"),
      start_min: startMin,
      end_min: endMin,
      duration_min: durationMin,
      multiplier_applied: multiplier,
      base_rate_applied: baseRate,
      gross, tax_withheld, net,
      notes: note || null,
      created_at: new Date().toISOString(),
    });
    router.replace("/");
  }

  // Weekend quick chips (variable start/end)
  const chips = [
    { label: "Sat 6–10", h1:6, m1:0, h2:10, m2:0, mult:1.5 },
    { label: "Sat 6–12", h1:6, m1:0, h2:12, m2:0, mult:1.5 },
    { label: "Sat 6–14", h1:6, m1:0, h2:14, m2:0, mult:1.5 },
    { label: "Sat 8–10", h1:8, m1:0, h2:10, m2:0, mult:1.5 },
    { label: "Sat 8–12", h1:8, m1:0, h2:12, m2:0, mult:1.5 },
    { label: "Sat 8–14", h1:8, m1:0, h2:14, m2:0, mult:1.5 },
    { label: "Sun 6–10", h1:6, m1:0, h2:10, m2:0, mult:2.0 },
    { label: "Sun 6–12", h1:6, m1:0, h2:12, m2:0, mult:2.0 },
    { label: "Sun 6–14", h1:6, m1:0, h2:14, m2:0, mult:2.0 },
    { label: "Sun 8–10", h1:8, m1:0, h2:10, m2:0, mult:2.0 },
    { label: "Sun 8–12", h1:8, m1:0, h2:12, m2:0, mult:2.0 },
    { label: "Sun 8–14", h1:8, m1:0, h2:14, m2:0, mult:2.0 },
  ];

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Add Overtime Entry</Text>

      <Text>Date</Text>
      <DateTimePicker value={date} onChange={(_, d) => d && setDate(d)} mode="date" />

      <Text>Start</Text>
      <DateTimePicker value={start} onChange={(_, d) => d && setStart(d)} mode="time" />

      <Text>End</Text>
      <DateTimePicker value={end} onChange={(_, d) => d && setEnd(d)} mode="time" />

      <Text style={{ marginTop: 8, fontWeight: "600" }}>Weekend quick picks</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {chips.map((c) => (
          <Button
            key={c.label}
            title={c.label}
            onPress={() => {
              setStart(withHm(date, c.h1, c.m1));
              setEnd(withHm(date, c.h2, c.m2));
              setMultiplier(c.mult);
            }}
          />
        ))}
      </View>

      <View style={{ padding: 12, borderWidth: 1, borderRadius: 8 }}>
        <Text>Type: {type === "DOUBLE" ? "Double (2x)" : "Time & Half (1.5x)"}</Text>
        <Text>Duration: {round2(hours)} h</Text>
        <Text>Gross: €{gross}</Text>
        <Text>Tax: €{tax_withheld}</Text>
        <Text>Net: €{net}</Text>
      </View>

      <Text>Notes (optional)</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="approved by supervisor"
        style={{ borderWidth: 1, borderRadius: 6, padding: 8 }}
      />

      <Button title="Save Entry" onPress={save} />
    </View>
  );
}

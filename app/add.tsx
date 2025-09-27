import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  SafeAreaView,
  View,
  Text,
  TextInput,
  Button,
  Alert,
  Pressable,
} from "react-native";
import DateTimePicker, { AndroidEvent } from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getSettings, insertEntry } from "../lib/repo";
import { minutesBetween, minsToHours, computePay, round2 } from "../lib/calc";


function timeToMin(d: Date) { return d.getHours() * 60 + d.getMinutes(); }
function withHm(base: Date, h: number, m: number) {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m);
}

type PickerMode = "date" | "time";
type WhichField = "date" | "start" | "end";

export default function AddEntry() {
  const router = useRouter();
  const params = useLocalSearchParams<{ preset?: string; type?: "TIME_AND_HALF" | "DOUBLE" }>();
  const type = params.type ?? "TIME_AND_HALF";
  const preset = params.preset;

  const [date, setDate] = useState<Date>(new Date());
  const [start, setStart] = useState<Date>(withHm(new Date(), 6, 0));
  const [end, setEnd] = useState<Date>(withHm(new Date(), 8, 0));
  const [note, setNote] = useState("");
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";

  const [baseRate, setBaseRate] = useState(15.08);
  const [multiplier, setMultiplier] = useState(1.5);
  const [taxFlatPct, setTaxFlatPct] = useState(0.2);

 // ---- SINGLE PICKER CONTROL ----
  const [show, setShow] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>("date");
  const [pickerWhich, setPickerWhich] = useState<WhichField>("date");
  const [tempValue, setTempValue] = useState<Date>(new Date());

  function openPicker(which: WhichField, mode: PickerMode) {
    setPickerWhich(which);
    setPickerMode(mode);
    setTempValue(which === "date" ? date : which === "start" ? start : end);
    setShow(true);
  }

  function onPickerChange(e: AndroidEvent, d?: Date) {
    // Android fires twice; act only on "set" and always close
    if (e.type === "set" && d) {
      if (pickerWhich === "date") setDate(d);
      else if (pickerWhich === "start") setStart(d);
      else setEnd(d);
    }
    setShow(false);
  }
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
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
                      padding: 16,
                      // Give extra bottom space so content isn’t hidden behind footer on mobile.
                      paddingBottom: isWeb ? 24 : 96,
                      rowGap: 12,
                      // Nice centering on wide web screens
                      ...(isWeb ? { maxWidth: 720, width: "100%", alignSelf: "center" } : {}),
                    }}
          // contentContainerStyle={{ padding: 16, paddingBottom: (insets.bottom || 16) + 96, rowGap: 12 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Add Overtime Entry</Text>

          {/* Date / Start / End fields (your existing Pressables) */}
          <Text style={{ marginTop: 8 }}>Date</Text>
          <Pressable onPress={() => openPicker("date", "date")} style={{borderWidth:1,borderRadius:6,padding:12}}>
            <Text>{dayjs(date).format("YYYY-MM-DD")}</Text>
          </Pressable>

          <Text style={{ marginTop: 8 }}>Start</Text>
          <Pressable onPress={() => openPicker("start", "time")} style={{borderWidth:1,borderRadius:6,padding:12}}>
            <Text>{String(start.getHours()).padStart(2,"0")}:{String(start.getMinutes()).padStart(2,"0")}</Text>
          </Pressable>

          <Text style={{ marginTop: 8 }}>End</Text>
          <Pressable onPress={() => openPicker("end", "time")} style={{borderWidth:1,borderRadius:6,padding:12}}>
            <Text>{String(end.getHours()).padStart(2,"0")}:{String(end.getMinutes()).padStart(2,"0")}</Text>
          </Pressable>

          {/* Weekend quick picks */}
          <Text style={{ marginTop: 8, fontWeight: "600" }}>Weekend quick picks</Text>
          <View style={{ flexDirection:"row", flexWrap:"wrap", gap:8 }}>
            {chips.map((c)=>(
              <Button key={c.label} title={c.label} onPress={()=>{
                setStart(withHm(date, c.h1, c.m1));
                setEnd(withHm(date, c.h2, c.m2));
                setMultiplier(c.mult);
              }} />
            ))}
          </View>

          {/* Calculations */}
          <View style={{ padding: 12, borderWidth: 1, borderRadius: 8 }}>
            <Text>Type: {type === "DOUBLE" ? "Double (2x)" : "Time & Half (1.5x)"}</Text>
            <Text>Duration: {round2(hours)} h</Text>
            <Text>Gross: €{gross}</Text>
            <Text>Tax: €{tax_withheld}</Text>
            <Text>Net: €{net}</Text>
          </View>

          {/* Notes */}
          <Text>Notes (optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="approved by supervisor"
            multiline
            style={{ borderWidth: 1, borderRadius: 6, padding: 8, minHeight: 48 }}
          />
        </ScrollView>

        {/* Fixed bottom action bar */}
        <View
          style={[
              {
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 12,
                backgroundColor: "white",
                borderTopWidth: 1,
                borderColor: "#ddd",
                gap: 8,
                flexDirection: "row",
                justifyContent: "space-between",
              },
              isWeb
                ? { position: "relative" }           // on web: just part of the flow (scroll to it)
                : { position: "absolute", left: 0, right: 0, bottom: 0 }, // on mobile: fixed at bottom
          ]}
        >
          <View style={{ flex: 1, marginRight: 8 }}>
            <Button title="Cancel" color="#777" onPress={() => router.back()} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Save Entry" onPress={save} />
          </View>
        </View>

        {/* Single mounted native picker */}
        {show && (
          <DateTimePicker
            value={tempValue}
            mode={pickerMode}
            is24Hour
            onChange={onPickerChange}
            display="default"
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

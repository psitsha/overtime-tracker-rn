import { useEffect, useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import { getSettings, updateSettings } from "../lib/repo";

export default function Settings() {
  const [base, setBase] = useState("15.08");
  const [flat, setFlat] = useState("0.20");

  useEffect(() => {
    (async () => {
      const s = await getSettings();
      setBase(String(s.current_base_rate));
      const tax = JSON.parse(s.tax_profile_json) as { mode: "flat"; flatPct: number };
      setFlat(String(tax.flatPct));
    })();
  }, []);

  async function save() {
    const baseNum = parseFloat(base);
    const flatNum = parseFloat(flat);
    if (Number.isNaN(baseNum) || Number.isNaN(flatNum)) {
      Alert.alert("Please enter valid numbers.");
      return;
    }
    await updateSettings({
      current_base_rate: baseNum,
      tax_profile_json: JSON.stringify({ mode: "flat", flatPct: flatNum }),
    });
    Alert.alert("Saved");
  }

  return (
    <View style={{ padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>Settings</Text>
      <Text>Week starts on: Sunday</Text>
      <Text>Base hourly rate (€)</Text>
      <TextInput
        keyboardType="decimal-pad"
        value={base}
        onChangeText={setBase}
        style={{ borderWidth: 1, borderRadius: 6, padding: 8 }}
      />
      <Text>Flat tax % (0.2 = 20%)</Text>
      <TextInput
        keyboardType="decimal-pad"
        value={flat}
        onChangeText={setFlat}
        style={{ borderWidth: 1, borderRadius: 6, padding: 8 }}
      />
      <Button title="Save Settings" onPress={save} />
    </View>
  );
}

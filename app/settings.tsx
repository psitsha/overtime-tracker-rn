import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
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
    Alert.alert("Settings saved");
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 16,
            rowGap: 12,
            paddingBottom: 24, // extra space so last button is never clipped
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 20, fontWeight: "700" }}>Settings</Text>

          <Text>Week starts on: Sunday</Text>

          <Text>Base hourly rate (€)</Text>
          <TextInput
            keyboardType="decimal-pad"
            value={base}
            onChangeText={setBase}
            style={{
              borderWidth: 1,
              borderRadius: 6,
              padding: 8,
              minHeight: 40,
            }}
          />

          <Text>Flat tax % (0.2 = 20%)</Text>
          <TextInput
            keyboardType="decimal-pad"
            value={flat}
            onChangeText={setFlat}
            style={{
              borderWidth: 1,
              borderRadius: 6,
              padding: 8,
              minHeight: 40,
            }}
          />

          {/* Save button right below inputs */}
          <View style={{ marginTop: 16 }}>
            <Button title="Save Settings" onPress={save} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

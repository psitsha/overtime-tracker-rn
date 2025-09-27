import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { initSchema } from "../lib/db";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await initSchema();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{flex:1, alignItems:"center", justifyContent:"center"}}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Overtime Tracker" }} />
      <Stack.Screen name="add" options={{ title: "Add Entry" }} />
      <Stack.Screen name="history" options={{ title: "History" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}

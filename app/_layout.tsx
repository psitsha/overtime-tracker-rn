import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { initSchema } from "../lib/db";
import * as SplashScreen from "expo-splash-screen";
import { Asset } from "expo-asset";
import { theme } from "../lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          initSchema(),
          Asset.loadAsync([require("../assets/logo.png")]),
        ]);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <Stack
      initialRouteName="welcome"               // ← start here
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.primaryText,
        headerTitle: "Overtime Tracker",
      }}
    >
      <Stack.Screen
        name="welcome"
        options={{ headerShown: false }}       // full-screen welcome
      />
      <Stack.Screen name="index" options={{ title: "Overtime Tracker" }} />
      <Stack.Screen name="add" options={{ title: "Add Entry" }} />
      <Stack.Screen name="history" options={{ title: "History" }} />
      <Stack.Screen name="weekly-card" options={{ title: "Weekly-PDF-Documents" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}

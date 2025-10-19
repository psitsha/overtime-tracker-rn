import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { initSchema } from "../lib/db";
import * as SplashScreen from "expo-splash-screen";
import { Asset } from "expo-asset";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // preload splash image so it exists immediately after hide
        await Promise.all([
          initSchema(),
          Asset.loadAsync([
            // change to require("../app/assets/logo.png") if that’s your path
            require("../assets/logo.png"),
          ]),
        ]);
      } catch (e) {
        console.warn("startup error", e);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  // Return null to keep the native splash visible
  if (!ready) return null;

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Overtime Tracker" }} />
      <Stack.Screen name="add" options={{ title: "Add Entry" }} />
      <Stack.Screen name="history" options={{ title: "History" }} />
      <Stack.Screen name="weekly-card" options={{ title: "Weekly-PDF-Documents" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}

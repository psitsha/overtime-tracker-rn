// app/_layout.tsx
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import { initSchema } from "../lib/db";
import * as SplashScreen from "expo-splash-screen";
import { Asset } from "expo-asset";
import { theme } from "../lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppHeaderTitle({ text }: { text: string }) {
  const router = useRouter();
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Pressable
        onPress={() => router.replace("/")}            // ← go home immediately
        hitSlop={10}                                    // easier to tap
        accessibilityRole="button"
        accessibilityLabel="Go to Dashboard"
      >
        <Image
          source={require("../assets/logo.png")}
          style={{ width: 86, height: 56, marginRight: 2, resizeMode: "contain" }}
        />
      </Pressable>
      <Text style={{ fontSize: 18, fontWeight: "700", color: theme.primaryText }}>
        {text}
      </Text>
    </View>
  );
}

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
      initialRouteName="welcome"
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.primaryText,
        headerTitleAlign: "left",
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="index"       options={{ headerTitle: () => <AppHeaderTitle text="Overtime Tracker" /> }} />
      <Stack.Screen name="add"         options={{ headerTitle: () => <AppHeaderTitle text="Add Entry" /> }} />
      <Stack.Screen name="history"     options={{ headerTitle: () => <AppHeaderTitle text="History" /> }} />
      <Stack.Screen name="weekly-card" options={{ headerTitle: () => <AppHeaderTitle text="Weekly PDFs" /> }} />
      <Stack.Screen name="settings"    options={{ headerTitle: () => <AppHeaderTitle text="Settings" /> }} />
    </Stack>
  );
}

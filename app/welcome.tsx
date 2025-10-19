import { SafeAreaView } from "react-native-safe-area-context";
import { Image, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Btn from "../components/Btn";
import { theme } from "../lib/theme";

export default function Welcome() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        {/* Big logo */}
        <Image
          source={require("../assets/logo.png")}
          style={{ width: 620, height: 420, resizeMode: "contain", marginBottom: 4 }}
        />

        {/* Tagline (optional) */}
        <Text style={{ fontSize: 18, color: theme.mutedText, textAlign: "center", marginBottom: 24 }}>
          Track your grind, own your time
        </Text>

        {/* Enter app */}
        <Btn
          title="Enter App"
          size="lg"
          onPress={() => router.replace("/")} // replace so Back won't return here
          style={{ alignSelf: "stretch" }}
        />
      </View>
    </SafeAreaView>
  );
}

import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import "../global.css";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";
import "react-native-get-random-values";


export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // Don’t block initial render during font loading to avoid a blank screen
  // We can optionally show a small overlay indicator if desired.
  // if (!loaded) {
  //   return (
  //     <Stack>
  //       <Stack.Screen name="index" options={{ headerShown: false }} />
  //     </Stack>
  //   );
  // }


  return (
    <SafeAreaProvider>
      <ThemeProvider value={DefaultTheme}>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: "#ffffff" },
            headerTitleStyle: { color: "#111111" },
            headerTintColor: "#111111",
            headerShadowVisible: true,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

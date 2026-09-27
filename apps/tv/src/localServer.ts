import { Platform } from "react-native";

export function localServerUrl() {
  return process.env.EXPO_PUBLIC_LOCAL_SERVER_URL?.trim() ||
    (Platform.OS === "web" ? "ws://localhost:8083" : "ws://10.0.2.2:8083");
}

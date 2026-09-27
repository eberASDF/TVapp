export function localServerUrl() {
  return process.env.EXPO_PUBLIC_LOCAL_SERVER_URL?.trim() || "ws://10.0.2.2:8083";
}

export function localServerUrl() {
  const url = process.env.EXPO_PUBLIC_LOCAL_SERVER_URL?.trim();
  if (!url || !/^ws:\/\/[^/]+:\d{2,5}$/.test(url))
    throw new Error("Configura EXPO_PUBLIC_LOCAL_SERVER_URL con la IP local de tu PC en apps/mobile/.env.");
  return url;
}

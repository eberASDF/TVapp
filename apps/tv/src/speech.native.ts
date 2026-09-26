import { isRunningInExpoGo } from "expo";

// Expo Go no incluye este módulo. Cargarlo solo en una compilación propia
// evita que NativeEventEmitter falle incluso antes de mostrar el tablero.
function nativeSpeech(): typeof import("react-native-tts").default {
  return require("react-native-tts").default;
}
let ready: Promise<void> | undefined;
export async function speak(text: string) {
  if (isRunningInExpoGo()) return;
  const Tts = nativeSpeech();
  if (!ready)
    ready = Tts.getInitStatus()
      .then(async () => {
        const voices = (await Tts.voices()).filter(
          (voice) =>
            voice.language.toLowerCase().startsWith("es") &&
            !voice.networkConnectionRequired &&
            !voice.notInstalled,
        );
        const voice =
          voices.find((v) => v.language.toLowerCase() === "es-mx") ?? voices[0];
        if (!voice)
          throw new Error(
            "Instala una voz española sin conexión en Android TV.",
          );
        await Tts.setDefaultLanguage(voice.language);
        await Tts.setDefaultVoice(voice.id);
        await Tts.setDefaultRate(0.48);
        await Tts.setDucking(true);
      })
      .catch((error) => {
        ready = undefined;
        throw error;
      });
  await ready;
  await Tts.speak(text);
}
export async function stopSpeech() {
  if (isRunningInExpoGo()) return;
  await nativeSpeech().stop();
}

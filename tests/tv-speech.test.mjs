import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../apps/tv/src/speech.native.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function loadSpeech(expoGo, nativeModule) {
  const exports = {};
  runInNewContext(outputText, {
    exports,
    require(name) {
      if (name === "expo") return { isRunningInExpoGo: () => expoGo };
      if (name === "react-native-tts") {
        assert.equal(expoGo, false, "Expo Go must never load the native TTS module");
        return { default: nativeModule };
      }
      throw new Error(`Unexpected module: ${name}`);
    },
  });
  return exports;
}

test("Expo Go can mount, announce and unmount without native TTS", async () => {
  const speech = loadSpeech(true);
  await speech.stopSpeech();
  await speech.speak("Entrada registrada");
  await speech.stopSpeech();
});

test("Native builds retain offline Spanish speech and stop playback", async () => {
  const calls = [];
  const native = {
    getInitStatus: async () => calls.push("init"),
    voices: async () => [{ id: "offline-mx", language: "es-MX", networkConnectionRequired: false, notInstalled: false }],
    setDefaultLanguage: async (value) => calls.push(value),
    setDefaultVoice: async (value) => calls.push(value),
    setDefaultRate: async () => {},
    setDucking: async () => {},
    speak: async (value) => calls.push(value),
    stop: async () => calls.push("stop"),
  };
  const speech = loadSpeech(false, native);
  await speech.speak("Entrada");
  await speech.speak("Salida");
  await speech.stopSpeech();
  assert.deepEqual(calls, ["init", "es-MX", "offline-mx", "Entrada", "Salida", "stop"]);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../apps/mobile/src/biometricPunch.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function setup({ os = "android", overrides = {} } = {}) {
  const calls = [];
  const biometrics = {
    AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2 },
    SecurityLevel: { BIOMETRIC_STRONG: 3 },
    supportedAuthenticationTypesAsync: async () => [1],
    hasHardwareAsync: async () => true,
    isEnrolledAsync: async () => true,
    getEnrolledLevelAsync: async () => 3,
    authenticateAsync: async (options) => {
      calls.push(options);
      return { success: true };
    },
    ...overrides,
  };
  const exports = {};
  runInNewContext(outputText, {
    exports,
    require(name) {
      if (name === "react-native") return { Platform: { OS: os } };
      if (name === "expo") return { isRunningInExpoGo: () => true };
      if (name === "expo-local-authentication") return biometrics;
      throw new Error(`Unexpected module ${name}`);
    },
  });
  return { confirm: exports.withBiometricConfirmation, calls };
}

test("Each entry and exit requires successful biometrics before recording", async () => {
  const { confirm, calls } = setup();
  let saved = 0;
  for (const tipo of ["entrada", "salida"]) {
    const result = await confirm(tipo, async () => {
      assert.equal(calls.length, saved + 1);
      saved++;
      return tipo;
    });
    assert.equal(result, tipo);
  }
  assert.equal(saved, 2);
  for (const options of calls) {
    assert.equal(options.disableDeviceFallback, true);
    assert.equal(options.biometricsSecurityLevel, "strong");
  }
});

for (const error of ["user_cancel", "authentication_failed", "lockout"]) {
  test(`${error}: no local or cloud record is written`, async () => {
    const { confirm } = setup({ overrides: {
      authenticateAsync: async () => ({ success: false, error }),
    } });
    let saved = false;
    await assert.rejects(confirm("entrada", async () => { saved = true; }));
    assert.equal(saved, false);
  });
}

for (const [name, options] of [
  ["browser", { os: "web" }],
  ["no sensor", { overrides: { hasHardwareAsync: async () => false } }],
  ["no enrollment", { overrides: { isEnrolledAsync: async () => false } }],
  ["weak face unlock", { overrides: { getEnrolledLevelAsync: async () => 2 } }],
  ["Face ID in Expo Go", { os: "ios", overrides: { supportedAuthenticationTypesAsync: async () => [2] } }],
]) {
  test(`${name}: reject without prompting or recording`, async () => {
    const { confirm, calls } = setup(options);
    let saved = false;
    await assert.rejects(confirm("entrada", async () => { saved = true; }));
    assert.equal(saved, false);
    assert.equal(calls.length, 0);
  });
}

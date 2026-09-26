import * as Crypto from "expo-crypto";

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function employeeIdFromName(value: string) {
  return normalizeName(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function employeeCredential(nombre: string, clave: string) {
  const normalName = normalizeName(nombre);
  const id = employeeIdFromName(normalName);
  if (!normalName || !id || normalName.length > 15 || clave.length < 6 || clave.length > 15)
    throw new Error("Escribe el nombre registrado y una clave de 6 a 15 caracteres.");
  const claveHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `tvapp:v1:${id}:${clave}`,
  );
  return { id, nombre: normalName, claveHash };
}

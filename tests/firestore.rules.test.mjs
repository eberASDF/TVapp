import { readFile, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import * as firestore from "firebase/firestore";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, writeBatch, where } from "firebase/firestore";

const schedule = { empresa: "TVapp", entradaEsperada: "07:00", salidaEsperada: "15:00", toleranciaMinutos: 5, zonaHoraria: "America/Phoenix", desfaseUtcHoras: -7 };
const parts = new Intl.DateTimeFormat("en-CA", { timeZone: schedule.zonaHoraria, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(Date.now());
const local = Object.fromEntries(parts.map((part) => [part.type, part.value]));
const dia = Number(`${local.year}${local.month}${local.day}`);
const idFor = (id, tipo) => `${id}_${dia}_${tipo}`;
const hashFor = (id, clave = "clave-escolar-larga") => createHash("sha256").update(`tvapp:v1:${id}:${clave}`).digest("hex");
const employee = (id, nombre, clave = "clave-escolar-larga") => ({ id, nombre, claveHash: hashFor(id, clave) });
const record = (person, tipo, override = {}) => ({
  empleadoId: person.id, nombre: person.nombre, tipo, timestamp: serverTimestamp(), dia,
  zonaHoraria: schedule.zonaHoraria, entradaEsperada: schedule.entradaEsperada,
  salidaEsperada: schedule.salidaEsperada, toleranciaMinutos: schedule.toleranciaMinutos,
  ...override,
});
const proof = (person, tipo, override = {}) => ({ empleadoId: person.id, nombre: person.nombre, tipo, claveHash: person.claveHash, ...override });

function loadTypeScript(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  new Function("exports", "require", outputText)(exports, (name) => {
    if (name === "firebase/firestore") return firestore;
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected module: ${name}`);
  });
  return exports;
}
const domain = loadTypeScript("../packages/shared/src/domain.ts");
function attendanceFor(db) {
  return loadTypeScript("../packages/shared/src/attendance.ts", {
    "./firebase": { services: { db } },
    "./domain": domain,
    "./types": { defaultSchedule: schedule },
  });
}
let env;
before(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-tvapp", firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") } });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      ...[
        ["ana-lopez", "Ana López", true], ["inactivo", "Inactivo", false],
        ["api", "Api", true], ["directo", "Directo", true], ["alterado", "Alterado", true],
        ["salida-sola", "Salida Sola", true], ["huella", "Huella", true],
        ["limpiable", "Limpiable", true],
      ].map(([id, nombre, activo]) => setDoc(doc(db, "empleados", id), { nombre, activo, claveHash: hashFor(id) })),
      setDoc(doc(db, "tablero", "aviso"), { titulo: "Aviso", orden: 0, activo: true }),
    ]);
  });
});
after(async () => { await env?.cleanup(); });
const client = () => env.unauthenticatedContext().firestore();
async function pairedWrite(db, person, tipo, overrideRecord = {}, overrideProof = {}) {
  const id = idFor(person.id, tipo);
  const batch = writeBatch(db);
  batch.set(doc(db, "comprobaciones", id), proof(person, tipo, overrideProof));
  batch.set(doc(db, "asistencias", id), record(person, tipo, overrideRecord));
  return batch.commit();
}

test("TV anónima lee registros y tablero; claves y comprobaciones son privadas", async () => {
  const db = client();
  await assertSucceeds(getDocs(collection(db, "asistencias")));
  await assertSucceeds(getDoc(doc(db, "tablero/aviso")));
  await assertFails(getDoc(doc(db, "empleados/ana-lopez")));
  await assertFails(getDocs(collection(db, "empleados")));
  await assertFails(getDoc(doc(db, "comprobaciones", idFor("ana-lopez", "entrada"))));
  await assertFails(getDocs(collection(db, "comprobaciones")));
});

test("móvil registra con su transacción y TV recibe onSnapshot", async () => {
  const db = client();
  const person = employee("api", "Api");
  const id = idFor(person.id, "entrada");
  const seen = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("TV no recibió el registro")), 10000);
    const off = onSnapshot(query(collection(db, "asistencias"), where("dia", "==", dia), orderBy("timestamp", "desc"), limit(100)), (snap) => {
      const found = snap.docs.find((item) => item.id === id);
      if (found) { clearTimeout(timeout); off(); resolve(found.data()); }
    }, reject);
  });
  const { registerAttendance, attendanceFromFirestore } = attendanceFor(db);
  const entrada = await registerAttendance(person, "entrada");
  assert.equal(entrada.id, id);
  assert.equal(entrada.empleadoId, person.id);
  assert.equal(entrada.dia, dia);
  const received = await seen;
  assert.equal(received.nombre, "Api");
  assert.equal(typeof received.timestamp.toMillis, "function");
  assert.equal("claveHash" in received, false);
  await assert.rejects(registerAttendance(person, "entrada"));
  const salida = await registerAttendance(person, "salida");
  assert.equal(salida.id, idFor(person.id, "salida"));
  const historical = attendanceFromFirestore("old", { ...received, timestamp: firestore.Timestamp.fromDate(new Date("2026-09-21T14:05:01Z")) }, { ...schedule, entradaEsperada: "10:00", toleranciaMinutos: 0 });
  assert.equal(historical.minutosRetardo, 1);
});

test("clave errónea, nombre falso, inactivo y empleado desconocido no registran", async () => {
  const db = client();
  for (const person of [
    employee("ana-lopez", "Ana López", "clave-incorrecta"),
    employee("ana-lopez", "Otra persona"),
    employee("inactivo", "Inactivo"),
    employee("desconocido", "Desconocido"),
  ]) await assertFails(pairedWrite(db, person, "entrada"));
  assert.equal((await getDocs(collection(db, "asistencias"))).docs.some((item) => item.data().empleadoId === "ana-lopez"), false);
});

test("sin comprobación atómica, sin entrada o con duplicado no registra", async () => {
  const db = client();
  const person = employee("directo", "Directo");
  await assertFails(setDoc(doc(db, "asistencias", idFor(person.id, "entrada")), record(person, "entrada")));
  await assertFails(setDoc(doc(db, "comprobaciones", idFor(person.id, "entrada")), proof(person, "entrada")));
  await assertFails(pairedWrite(db, person, "salida"));
  await assertSucceeds(pairedWrite(db, person, "entrada"));
  await assertFails(pairedWrite(db, person, "entrada"));
  await assertSucceeds(pairedWrite(db, person, "salida"));
  await assertFails(pairedWrite(db, person, "salida"));
});

test("rechaza alteraciones de identidad, hora, día, horario y biometría", async () => {
  const db = client();
  const person = employee("alterado", "Alterado");
  for (const change of [
    { empleadoId: "api" }, { nombre: "Otro" }, { dia: dia - 1 },
    { timestamp: new Date(0) }, { zonaHoraria: "UTC" },
    { entradaEsperada: "08:00" }, { toleranciaMinutos: 99 },
    { huella: "dato biométrico" },
  ]) await assertFails(pairedWrite(db, person, "entrada", change));
  await assertFails(pairedWrite(db, person, "entrada", {}, { clave: "texto plano" }));
  await assertFails(pairedWrite(db, person, "entrada", {}, { claveHash: "0".repeat(64) }));
});

test("borrado público retira asistencia de la TV y permite registrar de nuevo", async () => {
  const db = client();
  const person = employee("limpiable", "Limpiable");
  const id = idFor(person.id, "entrada");
  await assertSucceeds(pairedWrite(db, person, "entrada"));
  await assertFails(deleteDoc(doc(db, "asistencias", id)));
  await assertFails(deleteDoc(doc(db, "comprobaciones", id)));
  const removed = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("TV no retiró el registro")), 10000);
    const off = onSnapshot(doc(db, "asistencias", id), (snap) => {
      if (!snap.exists()) { clearTimeout(timeout); off(); resolve(); }
    }, reject);
  });
  const batch = writeBatch(db);
  batch.delete(doc(db, "asistencias", id));
  batch.delete(doc(db, "comprobaciones", id));
  await assertSucceeds(batch.commit());
  await removed;
  await assertSucceeds(pairedWrite(db, person, "entrada"));
});

test("nadie crea empleados ni modifica registros o claves desde la app", async () => {
  const db = client();
  await assertFails(setDoc(doc(db, "empleados/nuevo"), { nombre: "Nuevo", activo: true, claveHash: hashFor("nuevo") }));
  await assertFails(updateDoc(doc(db, "empleados/api"), { activo: false }));
  await assertFails(updateDoc(doc(db, "asistencias", idFor("api", "entrada")), { nombre: "Falso" }));
  await assertFails(deleteDoc(doc(db, "empleados/api")));
  await assertFails(updateDoc(doc(db, "comprobaciones", idFor("api", "entrada")), { claveHash: "0".repeat(64) }));
  await assertFails(setDoc(doc(db, "tablero/nuevo"), { titulo: "Texto" }));
});

test("Limpiar historial elimina registros y comprobaciones; TV queda vacía", async () => {
  const db = client();
  const person = employee("limpiable", "Limpiable");
  const id = idFor(person.id, "entrada");
  const empty = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("TV no vació el historial")), 10000);
    const off = onSnapshot(query(collection(db, "asistencias"), where("dia", "==", dia), orderBy("timestamp", "desc"), limit(100)), (snap) => {
      if (snap.empty) { clearTimeout(timeout); off(); resolve(); }
    }, reject);
  });
  const { clearAttendanceHistory } = attendanceFor(db);
  assert.ok((await clearAttendanceHistory()) >= 1);
  await empty;
  await assertSucceeds(pairedWrite(db, person, "entrada"));
  assert.equal((await getDoc(doc(db, "asistencias", id))).exists(), true);
});

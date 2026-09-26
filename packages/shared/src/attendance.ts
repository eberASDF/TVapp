import {
  DocumentData,
  Timestamp,
  doc,
  getDocFromServer,
  getDocsFromServer,
  collection,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { services } from "./firebase";
import {
  Attendance,
  PunchType,
  Schedule,
  classifyPunch,
  dayNumber,
} from "./domain";
import { defaultSchedule } from "./types";

function millis(value: unknown) {
  if (value instanceof Timestamp) return value.toMillis();
  if (value && typeof (value as { toMillis?: unknown }).toMillis === "function")
    return (value as { toMillis: () => number }).toMillis();
  if (typeof value === "number") return value;
  throw new Error("El registro no tiene una hora válida.");
}

export function attendanceFromFirestore(
  id: string,
  data: DocumentData,
  schedule: Schedule,
): Attendance {
  const timestamp = millis(data.timestamp);
  const recordedSchedule: Schedule = {
    ...schedule,
    entradaEsperada: data.entradaEsperada ?? schedule.entradaEsperada,
    salidaEsperada: data.salidaEsperada ?? schedule.salidaEsperada,
    toleranciaMinutos: data.toleranciaMinutos ?? schedule.toleranciaMinutos,
    zonaHoraria: data.zonaHoraria ?? schedule.zonaHoraria,
  };
  return {
    id,
    empleadoId: String(data.empleadoId),
    nombre: String(data.nombre),
    tipo: data.tipo as PunchType,
    timestamp,
    zonaHoraria: recordedSchedule.zonaHoraria,
    ...classifyPunch(data.tipo as PunchType, timestamp, recordedSchedule),
  };
}

export async function registerAttendance(
  employee: { id: string; nombre: string; claveHash: string },
  tipo: PunchType,
): Promise<Attendance> {
  const firebase = services;
  if (!firebase) throw new Error("Firebase no está configurado.");
  const schedule = defaultSchedule;
  let recordId = "";

  await runTransaction(firebase.db, async (tx) => {
    const dia = dayNumber(Date.now(), schedule.zonaHoraria);
    recordId = `${employee.id}_${dia}_${tipo}`;
    const recordRef = doc(firebase.db, "asistencias", recordId);
    const proofRef = doc(firebase.db, "comprobaciones", recordId);
    const entryRef = doc(firebase.db, "asistencias", `${employee.id}_${dia}_entrada`);
    const [recordSnap, entrySnap] = await Promise.all([
      tx.get(recordRef),
      tipo === "salida" ? tx.get(entryRef) : Promise.resolve(null),
    ]);
    if (recordSnap.exists())
      throw new Error(`Ya registraste tu ${tipo} de hoy.`);
    if (tipo === "salida" && !entrySnap?.exists())
      throw new Error("Registra tu entrada antes de la salida.");
    tx.set(proofRef, {
      empleadoId: employee.id,
      nombre: employee.nombre,
      tipo,
      claveHash: employee.claveHash,
    });
    tx.set(recordRef, {
      empleadoId: employee.id,
      nombre: employee.nombre,
      tipo,
      timestamp: serverTimestamp(),
      dia,
      zonaHoraria: schedule.zonaHoraria,
      entradaEsperada: schedule.entradaEsperada,
      salidaEsperada: schedule.salidaEsperada,
      toleranciaMinutos: schedule.toleranciaMinutos,
    });
  });

  const recordSnap = await getDocFromServer(
    doc(firebase.db, "asistencias", recordId),
  );
  if (!recordSnap.exists()) throw new Error("No se confirmó el registro.");
  return attendanceFromFirestore(
    recordSnap.id,
    recordSnap.data(),
    schedule,
  );
}

export async function clearAttendanceHistory(): Promise<number> {
  const firebase = services;
  if (!firebase) throw new Error("Firebase no está configurado.");
  const records = await getDocsFromServer(collection(firebase.db, "asistencias"));
  const docs = records.docs;
  for (let start = 0; start < docs.length; start += 200) {
    const batch = writeBatch(firebase.db);
    for (const record of docs.slice(start, start + 200)) {
      batch.delete(record.ref);
      batch.delete(doc(firebase.db, "comprobaciones", record.id));
    }
    await batch.commit();
  }
  return docs.length;
}

import {
  DocumentData,
  Timestamp,
  doc,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
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

export async function validateEmployeeCredential(
  employee: { id: string; nombre: string; claveHash: string },
): Promise<void> {
  const firebase = services;
  if (!firebase) throw new Error("Firebase no está configurado.");
  if (employee.nombre.includes("/")) throw new Error("Nombre inválido.");
  // Documento inexistente: las reglas autorizan su lectura solo si nombre y hash coinciden.
  try {
    await getDocFromServer(doc(
      firebase.db,
      "validaciones",
      employee.id,
      "nombres",
      employee.nombre,
      "claves",
      employee.claveHash,
    ));
  } catch (cause) {
    if ((cause as { code?: string }).code === "permission-denied")
      throw new Error("Nombre o clave incorrectos.");
    throw cause;
  }
}

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
    fotoMiniatura: typeof data.fotoMiniatura === "string" ? data.fotoMiniatura : undefined,
    ...classifyPunch(data.tipo as PunchType, timestamp, recordedSchedule),
  };
}

export async function registerAttendance(
  employee: { id: string; nombre: string; claveHash: string },
  tipo: PunchType,
  fotoMiniatura: string,
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
      fotoMiniatura,
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

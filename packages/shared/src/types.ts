export type { Attendance, AttendanceStatus, PunchType, Schedule } from "./domain";
export { classifyPunch, dayNumber, localTime, requireSchedule, validateSequence } from "./domain";
export interface ContentItem {
  id: string;
  titulo: string;
  tipo: "aviso" | "imagen" | "video";
  texto: string;
  storagePath: string;
  activo: boolean;
  orden: number;
  duracionSegundos: number;
}
export const statusLabels = {
  a_tiempo: "A tiempo",
  tarde: "Tarde",
  salida_anticipada: "Salida anticipada",
};
export const defaultSchedule = {
  empresa: "TVapp",
  entradaEsperada: "07:00",
  salidaEsperada: "15:00",
  toleranciaMinutos: 5,
  zonaHoraria: "America/Phoenix",
  desfaseUtcHoras: -7,
};
export function dayKey(now: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
export function timeLabel(now: number, timeZone: string) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}
export function readableError(error: unknown) {
  const code = (error as { code?: string })?.code ?? "";
  if (code.includes("unavailable") || code.includes("network"))
    return "Sin conexión. No se confirmó el registro; reintenta cuando vuelva la red.";
  if (code.includes("permission-denied"))
    return "Nombre o clave incorrectos, o empleado inactivo.";
  return error instanceof Error
    ? error.message
    : "No se pudo completar la operación.";
}

export type PunchType = "entrada" | "salida";
export type AttendanceStatus = "a_tiempo" | "tarde" | "salida_anticipada";

export interface Schedule {
  entradaEsperada: string;
  salidaEsperada: string;
  toleranciaMinutos: number;
  zonaHoraria: string;
  desfaseUtcHoras: number;
  empresa: string;
}

export interface Attendance {
  id: string;
  empleadoId: string;
  nombre: string;
  tipo: PunchType;
  timestamp: number;
  dia: number;
  fecha: string;
  estado: AttendanceStatus;
  minutosRetardo: number;
  zonaHoraria: string;
  fotoMiniatura?: string;
}

export class DomainError extends Error {}

export function requireSchedule(input: unknown): Schedule {
  if (!input || typeof input !== "object")
    throw new DomainError("Configura el horario de la empresa.");
  const s = input as Schedule;
  const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if (
    !clock.test(s.entradaEsperada) ||
    !clock.test(s.salidaEsperada) ||
    s.entradaEsperada >= s.salidaEsperada
  )
    throw new DomainError(
      "Usa un horario diurno: entrada anterior a salida, formato HH:mm.",
    );
  if (
    !Number.isInteger(s.toleranciaMinutos) ||
    s.toleranciaMinutos < 0 ||
    s.toleranciaMinutos > 120
  )
    throw new DomainError("La tolerancia debe ser de 0 a 120 minutos.");
  if (
    !Number.isInteger(s.desfaseUtcHoras) ||
    s.desfaseUtcHoras < -12 ||
    s.desfaseUtcHoras > 14
  )
    throw new DomainError("Desfase UTC inválido.");
  if (typeof s.zonaHoraria !== "string" || !s.zonaHoraria.trim())
    throw new DomainError("Indica la zona horaria IANA.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: s.zonaHoraria }).format();
  } catch {
    throw new DomainError("Zona horaria inválida.");
  }
  if (
    typeof s.empresa !== "string" ||
    !s.empresa.trim() ||
    s.empresa.length > 80
  )
    throw new DomainError("Nombre de empresa inválido.");
  return { ...s, empresa: s.empresa.trim() };
}

export function localTime(now: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    fecha: `${p.year}-${p.month}-${p.day}`,
    dia: Number(`${p.year}${p.month}${p.day}`),
    seconds: Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second),
  };
}

export function dayNumber(now: number, timeZone: string) {
  return localTime(now, timeZone).dia;
}

export function classifyPunch(tipo: PunchType, now: number, schedule: Schedule) {
  const { fecha, dia, seconds } = localTime(now, schedule.zonaHoraria);
  const toSeconds = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    return h * 3600 + m * 60;
  };
  const lateSeconds =
    seconds -
    toSeconds(schedule.entradaEsperada) -
    schedule.toleranciaMinutos * 60;
  const estado: AttendanceStatus =
    tipo === "entrada"
      ? lateSeconds > 0
        ? "tarde"
        : "a_tiempo"
      : seconds < toSeconds(schedule.salidaEsperada)
        ? "salida_anticipada"
        : "a_tiempo";
  return {
    dia,
    fecha,
    estado,
    minutosRetardo:
      tipo === "entrada" ? Math.max(0, Math.ceil(lateSeconds / 60)) : 0,
  };
}

export function validateSequence(
  tipo: PunchType,
  state: { entrada?: string; salida?: string } | undefined,
) {
  if (tipo === "entrada" && state?.entrada)
    throw new DomainError("Ya registraste tu entrada de hoy.");
  if (tipo === "salida" && !state?.entrada)
    throw new DomainError("Registra tu entrada antes de la salida.");
  if (tipo === "salida" && state?.salida)
    throw new DomainError("Ya registraste tu salida de hoy.");
}

import { Directory, File, Paths } from "expo-file-system";
import type { Attendance, PunchType } from "@tvapp/shared";

export type Capture = {
  id: string;
  uri: string;
  nombre: string;
  tipo: PunchType;
  timestamp: number;
};

const folder = new Directory(Paths.document, "capturas");
const index = new File(folder, "index.json");

export async function loadCaptures(): Promise<Capture[]> {
  if (!index.exists) return [];
  const entries: unknown = JSON.parse(await index.text());
  if (!Array.isArray(entries)) throw new Error("No se pudo leer el historial de capturas.");
  return entries as Capture[];
}

export async function saveCapture(record: Attendance, sourceUri: string): Promise<Capture> {
  folder.create({ idempotent: true, intermediates: true });
  const destination = new File(folder, `${record.id}.jpg`);
  const source = new File(sourceUri);
  await source.copy(destination, { overwrite: true });
  try { source.delete(); } catch { /* El sistema también limpia su caché. */ }
  const capture: Capture = {
    id: record.id,
    uri: destination.uri,
    nombre: record.nombre,
    tipo: record.tipo,
    timestamp: record.timestamp,
  };
  const previous = await loadCaptures();
  index.create({ overwrite: true });
  index.write(JSON.stringify([capture, ...previous.filter((item) => item.id !== capture.id)]));
  return capture;
}

export function clearCaptures() {
  if (folder.exists) folder.delete();
}

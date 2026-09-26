import { useEffect, useState } from "react";
import { AppState } from "react-native";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { services } from "./firebase";
import { attendanceFromFirestore } from "./attendance";
import {
  Attendance,
  ContentItem,
  Schedule,
  dayNumber,
  dayKey,
  readableError,
} from "./types";

export function useClock() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 1000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  return now;
}
export function useAttendance(
  enabled: boolean,
  schedule: Schedule,
  uid?: string,
) {
  const now = useClock();
  const date = dayKey(now, schedule.zonaHoraria);
  const dia = dayNumber(now, schedule.zonaHoraria);
  const [state, setState] = useState<{
    rows: Attendance[];
    error: string;
    cached: boolean;
    ready: boolean;
  }>({ rows: [], error: "", cached: true, ready: false });
  useEffect(() => {
    setState({ rows: [], error: "", cached: true, ready: false });
    if (!services || !enabled) return;
    const constraints = [
      where("dia", "==", dia),
      ...(uid ? [where("empleadoId", "==", uid)] : []),
      orderBy("timestamp", "desc"),
      limit(100),
    ];
    return onSnapshot(
      query(collection(services.db, "asistencias"), ...constraints),
      { includeMetadataChanges: true },
      (snap) => {
        setState({
          rows: snap.docs
            .filter((d) => !d.metadata.hasPendingWrites && d.data().timestamp)
            .map((d) => attendanceFromFirestore(d.id, d.data(), schedule)),
          error: "",
          cached: snap.metadata.fromCache,
          ready: true,
        });
      },
      (error) =>
        setState({
          rows: [],
          error: readableError(error),
          cached: true,
          ready: false,
        }),
    );
  }, [enabled, dia, uid, schedule]);
  return { ...state, date };
}
export function useContent(enabled: boolean) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!services || !enabled) return;
    return onSnapshot(
      query(collection(services.db, "tablero"), orderBy("orden", "asc")),
      (snap) => {
        setItems(
          snap.docs.map((d) => ({ ...d.data(), id: d.id }) as ContentItem),
        );
        setError("");
      },
      (error) => setError(readableError(error)),
    );
  }, [enabled]);
  return { items, error };
}

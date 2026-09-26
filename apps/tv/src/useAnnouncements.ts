import { useEffect, useRef, useState } from "react";
import { Attendance, statusLabels } from "@tvapp/shared";
import { speak, stopSpeech } from "./speech";

export function useAnnouncements(
  rows: Attendance[],
  cached: boolean,
  ready: boolean,
  scope: string,
) {
  const seen = useRef(new Set<string>());
  const initialized = useRef(false);
  const [queue, setQueue] = useState<Attendance[]>([]);
  const [audioError, setAudioError] = useState("");
  const active = queue[0];
  useEffect(() => {
    seen.current.clear();
    initialized.current = false;
    setQueue([]);
    void stopSpeech().catch(() => {});
  }, [scope]);
  useEffect(() => {
    if (cached || !ready) return;
    if (!initialized.current) {
      rows.forEach((row) => seen.current.add(row.id));
      initialized.current = true;
      return;
    }
    const added = rows.filter((row) => !seen.current.has(row.id));
    rows.forEach((row) => seen.current.add(row.id));
    // No anunciar todo el historial al iniciar ni registros antiguos al reconectar.
    const fresh = added
      .filter((row) => Date.now() - row.timestamp < 120000)
      .sort((a, b) => a.timestamp - b.timestamp);
    if (fresh.length)
      setQueue((previous) => [...previous, ...fresh].slice(-30));
  }, [rows, cached, ready, scope]);
  useEffect(() => {
    if (!active) return;
    void speak(
      `Gracias, ${active.nombre}. ${active.tipo === "entrada" ? "Entrada" : "Salida"} registrada. ${statusLabels[active.estado]}.`,
    ).catch(() =>
      setAudioError(
        "Voz no disponible. Revisa el motor de texto a voz y el idioma español en la TV.",
      ),
    );
    const timer = setTimeout(
      () => setQueue((previous) => previous.slice(1)),
      6500,
    );
    return () => clearTimeout(timer);
  }, [active?.id]);
  useEffect(
    () => () => {
      void stopSpeech().catch(() => {});
    },
    [],
  );
  return {
    active,
    audioError,
    enqueue: (row: Attendance) => setQueue((previous) => [...previous, row]),
  };
}

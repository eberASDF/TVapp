import { useEffect, useMemo, useState } from "react";
import { Attendance } from "@tvapp/shared";
import { localServerUrl } from "./localServer";

export function useVisibleAttendance(rows: Attendance[]) {
  const [cutoff, setCutoff] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const connect = () => {
      if (cancelled) return;
      socket = new WebSocket(localServerUrl());
      socket.onopen = () => socket?.send(JSON.stringify({ type: "hello", role: "tv-history" }));
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data));
          if (message.type === "cutoff" && Number.isSafeInteger(message.value) && message.value >= 0) {
            setCutoff(message.value);
            setReady(true);
          }
        } catch { /* Ignorar mensajes ajenos al protocolo. */ }
      };
      socket.onclose = () => {
        setReady(false);
        if (!cancelled) retry = setTimeout(connect, 2000);
      };
    };
    connect();
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      socket?.close();
    };
  }, []);

  return {
    rows: useMemo(() => ready ? rows.filter((row) => row.timestamp > (cutoff ?? 0)) : [], [rows, cutoff, ready]),
    ready,
    scope: String(cutoff ?? 0),
  };
}

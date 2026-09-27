import { localServerUrl } from "./localServer";

export function clearTvHistory(): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(localServerUrl());
    const timeout = setTimeout(() => finish(new Error("No respondió el servidor local de TVapp.")), 8000);
    let finished = false;
    function finish(error?: Error) {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      socket.close();
      if (error) reject(error); else resolve();
    }
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "hello", role: "mobile-control" }));
      socket.send(JSON.stringify({ type: "clear-history" }));
    };
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data));
        if (message.type === "cutoff") finish();
        if (message.type === "error") finish(new Error(message.message));
      } catch { /* Ignorar mensajes ajenos al protocolo. */ }
    };
    socket.onerror = () => finish(new Error("No se pudo conectar con el servidor local de TVapp."));
    socket.onclose = () => finish(new Error("Se cerró la conexión con el servidor local."));
  });
}

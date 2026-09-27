import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";

const defaultStateFile = join(process.cwd(), "runtime", "display-state.json");

export async function startLocalServer({ port = 8083, stateFile = defaultStateFile } = {}) {
  let cutoff = 0;
  try {
    const saved = JSON.parse(await readFile(stateFile, "utf8"));
    if (Number.isSafeInteger(saved.cutoff) && saved.cutoff >= 0) cutoff = saved.cutoff;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const http = createServer((request, response) => {
    response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    response.end("TVapp local activo\n");
  });
  const wss = new WebSocketServer({ server: http, maxPayload: 64000 });
  const clients = new Map();
  let saving = Promise.resolve();
  const send = (socket, message) => {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  };
  const broadcast = (role, message) => {
    for (const [socket, actualRole] of clients) if (actualRole === role) send(socket, message);
  };

  wss.on("connection", (socket) => {
    socket.on("message", (buffer) => {
      let message;
      try { message = JSON.parse(buffer.toString()); } catch { return; }
      if (!message || typeof message !== "object") return;
      const role = clients.get(socket);
      if (message.type === "hello" && !role) {
        if (!["mobile-control", "tv-history"].includes(message.role)) return;
        clients.set(socket, message.role);
        if (message.role === "tv-history") send(socket, { type: "cutoff", value: cutoff });
        return;
      }
      if (role === "mobile-control" && message.type === "clear-history") {
        saving = saving.then(async () => {
          cutoff = Math.max(Date.now(), cutoff + 1);
          await mkdir(dirname(stateFile), { recursive: true });
          const temporary = `${stateFile}.tmp`;
          await writeFile(temporary, JSON.stringify({ cutoff }), "utf8");
          await rename(temporary, stateFile);
          const notice = { type: "cutoff", value: cutoff };
          broadcast("tv-history", notice);
          send(socket, notice);
        }).catch(() => send(socket, { type: "error", message: "No se pudo guardar el corte local." }));
      }
    });
    socket.on("close", () => {
      clients.delete(socket);
    });
  });

  await new Promise((done, reject) => {
    http.once("error", reject);
    http.listen(port, "0.0.0.0", done);
  });
  return {
    port: http.address().port,
    close: async () => {
      for (const socket of clients.keys()) socket.terminate();
      await new Promise((done) => wss.close(done));
      await new Promise((done) => http.close(done));
    },
  };
}

function localAddresses() {
  return Object.values(networkInterfaces()).flat()
    .filter((entry) => entry?.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const server = await startLocalServer();
  console.log(`Servidor local del historial TVapp: puerto ${server.port}`);
  console.log("En apps/mobile/.env, agrega una de estas direcciones de tu PC:");
  for (const address of localAddresses()) console.log(`EXPO_PUBLIC_LOCAL_SERVER_URL=ws://${address}:${server.port}`);
  console.log("La TV emulada usa ws://10.0.2.2:8083 automáticamente.");
}

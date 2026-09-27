import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { startLocalServer } from "./local-server.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tv = join(root, "apps", "tv");
const stateFile = join(root, "runtime", "display-state.json");

let localServer;
try {
  localServer = await startLocalServer({ stateFile });
  console.log("Control local del historial disponible en el puerto 8083.");
} catch (error) {
  if (error?.code !== "EADDRINUSE") throw error;
  const response = await fetch("http://127.0.0.1:8083/", { signal: AbortSignal.timeout(2000) });
  if (!response.ok || await response.text() !== "TVapp local activo\n") {
    throw new Error("El puerto 8083 está ocupado por otro servicio.");
  }
  console.log("Usando el control local del historial que ya está activo.");
}

const expo = join(root, "node_modules", "expo", "bin", "cli");
const child = spawn(process.execPath, [expo, "start", "--go", "--port", "8082"], {
  cwd: tv,
  stdio: "inherit",
  windowsHide: true,
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", async (error) => {
  if (localServer) await localServer.close();
  console.error(error);
  process.exitCode = 1;
});

child.on("exit", async (code) => {
  if (localServer) await localServer.close();
  process.exitCode = code ?? 0;
});

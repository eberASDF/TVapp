import { createHash } from "node:crypto";
import { createInterface } from "node:readline/promises";

const io = createInterface({ input: process.stdin, output: process.stdout });
const nombre = (await io.question("Nombre completo del empleado ficticio: ")).trim().replace(/\s+/g, " ");
io.close();
const id = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
if (!nombre || !id || nombre.length > 80 || !process.stdin.isTTY) {
  process.stderr.write("Usa un terminal interactivo y un nombre de hasta 80 caracteres.\n");
  process.exit(1);
}

process.stdout.write("Clave (mínimo 8 caracteres; no se muestra): ");
process.stdin.setRawMode(true);
process.stdin.resume();
const clave = await new Promise((resolve, reject) => {
  let input = "";
  const onData = (chunk) => {
    for (const character of chunk.toString("utf8")) {
      if (character === "\u0003") {
        process.stdin.off("data", onData);
        reject(new Error("Cancelado."));
        return;
      }
      if (character === "\r" || character === "\n") {
        process.stdout.write("\n");
        process.stdin.off("data", onData);
        resolve(input);
        return;
      }
      if (character === "\b" || character === "\u007f")
        input = input.slice(0, -1);
      else if (!/[\u0000-\u001f]/.test(character))
        input += character;
    }
  };
  process.stdin.on("data", onData);
}).finally(() => {
  process.stdin.setRawMode(false);
  process.stdin.pause();
});
if (clave.length < 8) {
  process.stderr.write("La clave debe tener al menos 8 caracteres.\n");
  process.exit(1);
}
const claveHash = createHash("sha256").update(`tvapp:v1:${id}:${clave}`).digest("hex");
process.stdout.write(`Crea empleados/${id} en Firestore con estos campos:\n`);
process.stdout.write(`nombre (string): ${nombre}\nactivo (boolean): true\nclaveHash (string): ${claveHash}\n`);

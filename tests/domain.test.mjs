import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = readFileSync(
  new URL("../packages/shared/src/domain.ts", import.meta.url),
  "utf8",
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
});
const domain = {};
runInNewContext(outputText, { exports: domain });
const schedule = {
  empresa: "TVapp",
  entradaEsperada: "07:00",
  salidaEsperada: "15:00",
  toleranciaMinutos: 5,
  zonaHoraria: "America/Phoenix",
  desfaseUtcHoras: -7,
};
const at = (hour) => Date.parse(`2026-09-21T${hour}-07:00`);

test("07:05:00 está dentro de tolerancia y 07:05:01 es un minuto tarde", () => {
  assert.equal(
    domain.classifyPunch("entrada", at("07:05:00"), schedule).estado,
    "a_tiempo",
  );
  const late = domain.classifyPunch("entrada", at("07:05:01"), schedule);
  assert.equal(late.estado, "tarde");
  assert.equal(late.minutosRetardo, 1);
  assert.equal(
    domain.classifyPunch("entrada", at("07:17:00"), schedule).minutosRetardo,
    12,
  );
});

test("la salida antes de las 15:00 se marca anticipada", () => {
  assert.equal(
    domain.classifyPunch("salida", at("14:59:59"), schedule).estado,
    "salida_anticipada",
  );
  assert.equal(
    domain.classifyPunch("salida", at("15:00:00"), schedule).estado,
    "a_tiempo",
  );
});

test("la fecha del registro usa America/Phoenix", () => {
  const punch = domain.classifyPunch(
    "entrada",
    Date.parse("2026-09-22T06:59:00Z"),
    schedule,
  );
  assert.equal(punch.fecha, "2026-09-21");
  assert.equal(punch.dia, 20260921);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";
import { startLocalServer } from "../scripts/local-server.mjs";

const open = (url) => new Promise((resolve, reject) => {
  const socket = new WebSocket(url);
  socket.once("open", () => resolve(socket));
  socket.once("error", reject);
});
const next = (socket) => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("No llegó el mensaje local")), 3000);
  socket.once("message", (buffer) => {
    clearTimeout(timeout);
    resolve(JSON.parse(buffer.toString()));
  });
});
const send = (socket, message) => socket.send(JSON.stringify(message));

test("corte visual persistente y señalización local sin Firestore", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tvapp-local-"));
  const stateFile = join(directory, "display-state.json");
  const server = await startLocalServer({ port: 0, stateFile });
  const url = `ws://127.0.0.1:${server.port}`;
  const sockets = [];
  try {
    const tvHistory = await open(url); sockets.push(tvHistory);
    const initial = next(tvHistory);
    send(tvHistory, { type: "hello", role: "tv-history" });
    assert.deepEqual(await initial, { type: "cutoff", value: 0 });

    const mobileControl = await open(url); sockets.push(mobileControl);
    send(mobileControl, { type: "hello", role: "mobile-control" });
    const tvCutoff = next(tvHistory);
    const mobileCutoff = next(mobileControl);
    send(mobileControl, { type: "clear-history" });
    const changed = await tvCutoff;
    assert.equal(changed.type, "cutoff");
    assert.ok(changed.value > 0);
    assert.deepEqual(await mobileCutoff, changed);
    assert.equal(JSON.parse(await readFile(stateFile, "utf8")).cutoff, changed.value);

    const anotherTv = await open(url); sockets.push(anotherTv);
    const replay = next(anotherTv);
    send(anotherTv, { type: "hello", role: "tv-history" });
    assert.deepEqual(await replay, changed);

    const tvCamera = await open(url); sockets.push(tvCamera);
    send(tvCamera, { type: "hello", role: "tv-camera" });
    const mobileCamera = await open(url); sockets.push(mobileCamera);
    send(mobileCamera, { type: "hello", role: "mobile-camera" });
    const offer = next(tvCamera);
    send(mobileCamera, { type: "offer", sessionId: "demo-1", sdp: "v=0\r\n" });
    assert.deepEqual(await offer, { type: "offer", sessionId: "demo-1", sdp: "v=0\r\n" });
    const answer = next(mobileCamera);
    send(tvCamera, { type: "answer", sessionId: "demo-1", sdp: "v=0\r\n" });
    assert.deepEqual(await answer, { type: "answer", sessionId: "demo-1", sdp: "v=0\r\n" });
    const stopped = next(tvCamera);
    send(mobileCamera, { type: "stop" });
    assert.deepEqual(await stopped, { type: "stop" });
  } finally {
    for (const socket of sockets) socket.terminate();
    await server.close();
    await rm(directory, { recursive: true, force: true });
  }
});

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera } from "expo-camera";
import { mediaDevices, MediaStream, RTCPeerConnection } from "react-native-webrtc";
import { localServerUrl } from "./localServer";

function waitForCandidates(peer: RTCPeerConnection): Promise<void> {
  if (peer.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      peer.onicegatheringstatechange = null;
      reject(new Error("No se estableció la conexión de cámara."));
    }, 15000);
    peer.onicegatheringstatechange = () => {
      if (peer.iceGatheringState === "complete") {
        clearTimeout(timeout);
        peer.onicegatheringstatechange = null;
        resolve();
      }
    };
  });
}

function connect(url: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url);
    const timeout = setTimeout(() => fail(), 6000);
    const fail = () => {
      clearTimeout(timeout);
      socket.close();
      reject(new Error("No se pudo conectar con el servidor local de TVapp."));
    };
    socket.onopen = () => { clearTimeout(timeout); resolve(socket); };
    socket.onerror = fail;
  });
}

export function useLiveCamera() {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const peer = useRef<RTCPeerConnection | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const session = useRef("");
  const generation = useRef(0);

  const stop = useCallback(async () => {
    generation.current++;
    session.current = "";
    if (socket.current?.readyState === WebSocket.OPEN)
      socket.current.send(JSON.stringify({ type: "stop" }));
    socket.current?.close();
    socket.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    peer.current?.close();
    peer.current = null;
    setActive(false);
    setStatus("");
  }, []);

  const start = useCallback(async () => {
    if (session.current) return;
    const url = localServerUrl();
    setBusy(true);
    const current = ++generation.current;
    try {
      setStatus("Conectando con la TV…");
      const connectionSocket = await connect(url);
      if (current !== generation.current) { connectionSocket.close(); return; }
      socket.current = connectionSocket;
      connectionSocket.send(JSON.stringify({ type: "hello", role: "mobile-camera" }));
      const permission = await Camera.requestCameraPermissionsAsync();
      if (!permission.granted) throw new Error("Permiso de cámara denegado.");
      const local = await mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: 640, height: 360, frameRate: 15 },
      });
      if (current !== generation.current) { local.getTracks().forEach((track) => track.stop()); return; }
      stream.current = local;
      const rtc = new RTCPeerConnection({ iceServers: [] });
      peer.current = rtc;
      local.getTracks().forEach((track) => rtc.addTrack(track, local));
      rtc.onconnectionstatechange = () => {
        if (current !== generation.current) return;
        setStatus(rtc.connectionState === "connected" ? "Cámara en vivo en la TV" :
          rtc.connectionState === "failed" || rtc.connectionState === "disconnected"
            ? "TV desconectada; reinicia la cámara." : "Esperando la TV…");
      };
      await rtc.setLocalDescription(await rtc.createOffer());
      await waitForCandidates(rtc);
      if (current !== generation.current) return;
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
      session.current = id;
      connectionSocket.onmessage = (event) => {
        try {
          const answer = JSON.parse(String(event.data));
          if (answer.type === "replaced") {
            void stop().then(() => setStatus("Otra cámara reemplazó esta transmisión."));
            return;
          }
          if (answer.type !== "answer" || answer.sessionId !== id ||
            !answer.sdp || rtc.signalingState !== "have-local-offer") return;
          void rtc.setRemoteDescription({ type: "answer", sdp: answer.sdp })
            .catch(() => setStatus("No se pudo conectar la TV. Reinicia la cámara."));
        } catch { /* Ignorar mensajes ajenos al protocolo. */ }
      };
      connectionSocket.onclose = () => {
        if (session.current === id) void stop().then(() => setStatus("Servidor local desconectado."));
      };
      connectionSocket.send(JSON.stringify({ type: "offer", sessionId: id, sdp: rtc.localDescription?.sdp }));
      setActive(true);
      setStatus("Esperando la TV…");
    } catch (cause) {
      await stop();
      throw cause;
    } finally {
      setBusy(false);
    }
  }, [stop]);

  useEffect(() => () => { void stop(); }, [stop]);
  return { active, busy, status, start, stop };
}

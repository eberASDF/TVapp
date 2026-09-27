import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MediaStream, RTCPeerConnection, RTCView } from "react-native-webrtc";
import { colors } from "@tvapp/shared/src/ui";
import { localServerUrl } from "./localServer";

function waitForCandidates(peer: RTCPeerConnection): Promise<void> {
  if (peer.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      peer.onicegatheringstatechange = null;
      reject(new Error("Sin conexión de video"));
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

export function LiveCamera() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("Esperando cámara del teléfono");
  const peer = useRef<RTCPeerConnection | null>(null);
  const session = useRef("");
  const generation = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    const close = () => {
      generation.current++;
      peer.current?.close();
      peer.current = null;
      session.current = "";
      setUrl("");
    };
    const connect = () => {
      if (cancelled) return;
      socket = new WebSocket(localServerUrl());
      socket.onopen = () => socket?.send(JSON.stringify({ type: "hello", role: "tv-camera" }));
      socket.onmessage = (event) => {
        let offer;
        try { offer = JSON.parse(String(event.data)); } catch { return; }
        if (offer.type === "stop") {
          close();
          setStatus("Esperando cámara del teléfono");
          return;
        }
        if (offer.type !== "offer" || typeof offer.sessionId !== "string" || typeof offer.sdp !== "string") return;
        if (session.current === offer.sessionId && peer.current) return;
        close();
        setStatus("Conectando cámara…");
        session.current = offer.sessionId;
        const current = generation.current;
        const rtc = new RTCPeerConnection({ iceServers: [] });
        peer.current = rtc;
        rtc.ontrack = (track: { streams: MediaStream[] }) => {
          if (current === generation.current && track.streams[0]) setUrl(track.streams[0].toURL());
        };
        rtc.onconnectionstatechange = () => {
          if (current !== generation.current) return;
          if (rtc.connectionState === "connected") setStatus("");
          if (rtc.connectionState === "disconnected" || rtc.connectionState === "failed") {
            close();
            setStatus("Cámara desconectada; reinicia la transmisión en el teléfono.");
          }
        };
        void (async () => {
          try {
            await rtc.setRemoteDescription({ type: "offer", sdp: offer.sdp });
            await rtc.setLocalDescription(await rtc.createAnswer());
            await waitForCandidates(rtc);
            if (current !== generation.current || socket?.readyState !== WebSocket.OPEN) return;
            socket.send(JSON.stringify({ type: "answer", sessionId: offer.sessionId, sdp: rtc.localDescription?.sdp }));
          } catch {
            if (current === generation.current) {
              close();
              setStatus("No se pudo conectar la cámara. Reinicia la transmisión en el teléfono.");
            }
          }
        })();
      };
      socket.onclose = () => {
        close();
        setStatus("Conectando con el servidor local…");
        if (!cancelled) retry = setTimeout(connect, 2000);
      };
    };
    connect();
    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      socket?.close();
      close();
    };
  }, []);

  return <View style={styles.container}>
    {!!url && <RTCView streamURL={url} objectFit="contain" style={styles.video} />}
    {!!status && <Text style={styles.status}>{status}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#070d16", alignItems: "center", justifyContent: "center" },
  video: { ...StyleSheet.absoluteFill },
  status: { color: colors.muted, fontSize: 18, textAlign: "center", padding: 24 },
});

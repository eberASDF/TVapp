import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  PunchType,
  configurationError,
  defaultSchedule,
  readableError,
  registerAttendance,
  services,
  timeLabel,
  useClock,
  validateEmployeeCredential,
} from "@tvapp/shared";
import { Action, Field, Message, colors, ui } from "@tvapp/shared/src/ui";
import { withBiometricConfirmation } from "./src/biometricPunch";
import { employeeCredential } from "./src/identity";
import { Capture, clearCaptures, discardStagedCapture, loadCaptures, saveCapture, stageCapture } from "./src/captures";
import { createThumbnail } from "./src/thumbnail";
import { clearTvHistory } from "./src/clearTvHistory";

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Main />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Main() {
  const schedule = defaultSchedule;
  const now = useClock();
  const [screen, setScreen] = useState<"home" | "captures">("home");
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [pendingType, setPendingType] = useState<PunchType | null>(null);
  const [nombre, setNombre] = useState("");
  const [clave, setClave] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const punching = useRef(false);
  const cameraRef = useRef<CameraView>(null);
  const cameraAction = useRef<(() => void) | null>(null);

  useEffect(() => {
    void loadCaptures().then(setCaptures).catch((cause) => setError(readableError(cause)));
  }, []);

  async function startPunch(tipo: PunchType) {
    if (punching.current || !services) return;
    punching.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await withBiometricConfirmation(tipo, async () => true);
      setNombre("");
      setClave("");
      setPendingType(tipo);
    } catch (e) {
      setError(readableError(e));
    } finally {
      punching.current = false;
      setBusy(false);
    }
  }

  async function takePhoto(): Promise<string> {
    const permission = await Camera.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error("Permiso de cámara denegado.");
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cameraAction.current = null;
        setCameraActive(false);
        reject(new Error("La cámara no estuvo disponible."));
      }, 12000);
      cameraAction.current = () => {
        cameraAction.current = null;
        void (async () => {
          try {
            const photo = await cameraRef.current?.takePictureAsync({ quality: 0.6 });
            if (!photo?.uri) throw new Error("No se pudo tomar la foto.");
            resolve(photo.uri);
          } catch (cause) {
            reject(cause);
          } finally {
            clearTimeout(timeout);
            setCameraActive(false);
          }
        })();
      };
      setCameraActive(true);
    });
  }

  async function confirmIdentity() {
    if (!pendingType || busy) return;
    setBusy(true);
    setError("");
    const tipo = pendingType;
    let stagedUri: string | null = null;
    let registered = false;
    try {
      const employee = await employeeCredential(nombre, clave);
      await validateEmployeeCredential(employee);
      setPendingType(null);
      setNombre("");
      setClave("");
      const photoUri = await takePhoto();
      stagedUri = await stageCapture(photoUri);
      const fotoMiniatura = await createThumbnail(stagedUri);
      const result = await registerAttendance(employee, tipo, fotoMiniatura);
      registered = true;
      setMessage(tipo === "entrada" ? "Bienvenido a tu turno" : "Gracias por completar tu turno");
      try {
        const capture = await saveCapture(result, stagedUri);
        stagedUri = null;
        setCaptures((previous) => [capture, ...previous.filter((item) => item.id !== capture.id)]);
      } catch {
        setError("La asistencia se registró, pero no se pudo añadir la foto a Capturas.");
      }
    } catch (e) {
      setError(readableError(e));
    } finally {
      if (stagedUri && !registered) {
        try { discardStagedCapture(stagedUri); } catch { /* Conservar el error original. */ }
      }
      setNombre("");
      setClave("");
      setPendingType(null);
      setBusy(false);
    }
  }

  function confirmClear() {
    Alert.alert("Limpiar historial", "La TV mostrará solo los registros nuevos. Las asistencias y las capturas seguirán guardadas.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Limpiar TV", onPress: () => { void clearHistory(); } },
    ]);
  }

  async function clearHistory() {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await clearTvHistory();
      setScreen("home");
      setMessage("Historial de la TV limpiado.");
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setBusy(false);
    }
  }

  function confirmClearCaptures() {
    Alert.alert("Limpiar capturas", "Se eliminarán solo las fotos guardadas en este teléfono. Los registros de Firebase permanecerán.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Limpiar capturas", onPress: () => {
        try {
          clearCaptures();
          setCaptures([]);
          setError("");
        } catch (cause) {
          setError(readableError(cause));
        }
      } },
    ]);
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>{screen === "home" ? "Checador" : "Capturas"}</Text>
          {screen === "captures" && (
            <Pressable accessibilityRole="button" onPress={() => setScreen("home")}>
              <Text style={styles.link}>Volver</Text>
            </Pressable>
          )}
        </View>
        {screen === "home" ? <>
          <View style={styles.clockSection}>
            <Text style={styles.clock}>{timeLabel(now, schedule.zonaHoraria)}</Text>
            <Text style={styles.date}>{new Intl.DateTimeFormat("es-MX", {
              timeZone: schedule.zonaHoraria, weekday: "long", day: "numeric", month: "long",
            }).format(now)}</Text>
          </View>
          <View style={styles.actions}>
            <Action label="Registrar entrada" onPress={() => startPunch("entrada")} disabled={busy || !services} />
            <Action label="Registrar salida" onPress={() => startPunch("salida")} disabled={busy || !services} secondary />
            {busy && <ActivityIndicator color={colors.teal} />}
            <Message text={message} />
            <Message text={error || configurationError || ""} error />
          </View>
          <View style={styles.footer}>
            <Pressable accessibilityRole="button" onPress={() => setScreen("captures")} disabled={busy}>
              <Text style={styles.link}>Capturas</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={confirmClear} disabled={busy}>
              <Text style={styles.link}>Limpiar historial</Text>
            </Pressable>
          </View>
        </> : <>
          <Pressable accessibilityRole="button" onPress={confirmClearCaptures} disabled={busy || captures.length === 0}>
            <Text style={styles.link}>Limpiar capturas</Text>
          </Pressable>
          {captures.length === 0 && <Text style={styles.empty}>Aún no hay capturas.</Text>}
          {captures.map((capture) => (
            <View style={styles.captureRow} key={capture.id}>
              <Image source={{ uri: capture.uri }} style={styles.thumbnail} />
              <View style={styles.captureInfo}>
                <Text style={styles.captureName}>{capture.nombre}</Text>
                <Text style={styles.captureDetail}>{new Intl.DateTimeFormat("es-MX", {
                  timeZone: schedule.zonaHoraria, dateStyle: "medium", timeStyle: "short",
                }).format(capture.timestamp)}</Text>
                <Text style={styles.captureDetail}>{capture.tipo === "entrada" ? "Entrada" : "Salida"}</Text>
              </View>
            </View>
          ))}
          <Message text={error} error />
        </>}
      </ScrollView>
      <Modal visible={!!pendingType} transparent animationType="fade" onRequestClose={() => { if (!busy) { setNombre(""); setClave(""); setPendingType(null); } }}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalPanel}>
            <Text style={styles.section}>Identificar empleado</Text>
            <Text style={ui.description}>Escribe tu nombre y clave.</Text>
            <Field label="Nombre" value={nombre} onChange={setNombre} placeholder="Nombre completo" maxLength={15} />
            <Field label="Clave" value={clave} onChange={setClave} secure maxLength={15} />
            <Action label={busy ? "Verificando…" : `Confirmar ${pendingType}`} onPress={confirmIdentity} disabled={busy || !nombre.trim() || !clave} />
            <Action label="Cancelar" secondary onPress={() => { setNombre(""); setClave(""); setPendingType(null); }} disabled={busy} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {cameraActive && <View style={styles.captureOverlay}>
        <CameraView ref={cameraRef} facing="front" onCameraReady={() => cameraAction.current?.()} style={styles.captureCamera} />
        <Text style={styles.captureStatus}>Tomando foto…</Text>
      </View>}
    </>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", maxWidth: 560, alignSelf: "center", padding: 24, gap: 24, paddingBottom: 36 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { color: colors.text, fontSize: 24, fontWeight: "700" },
  clockSection: { paddingVertical: 42, alignItems: "center", gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  clock: { fontSize: 64, color: colors.text, fontWeight: "300", letterSpacing: -3, fontVariant: ["tabular-nums"] },
  date: { fontSize: 14, color: colors.muted, textTransform: "capitalize" },
  actions: { gap: 14, paddingTop: 8 },
  footer: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 22 },
  link: { color: colors.teal, fontSize: 14, fontWeight: "600" },
  section: { color: colors.text, fontSize: 15, fontWeight: "600" },
  empty: { color: colors.muted, fontSize: 15, paddingVertical: 28 },
  captureRow: { flexDirection: "row", gap: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  thumbnail: { width: 88, height: 88, backgroundColor: colors.panel },
  captureInfo: { flex: 1, gap: 6, justifyContent: "center" },
  captureName: { color: colors.text, fontSize: 16, fontWeight: "600" },
  captureDetail: { color: colors.muted, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: "#000b", justifyContent: "center", padding: 24 },
  modalPanel: { width: "100%", maxWidth: 440, alignSelf: "center", backgroundColor: colors.bg, padding: 24, gap: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  captureOverlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.bg },
  captureCamera: { flex: 1 },
  captureStatus: { position: "absolute", bottom: 30, alignSelf: "center", color: colors.text, fontSize: 15, fontWeight: "600" },
});

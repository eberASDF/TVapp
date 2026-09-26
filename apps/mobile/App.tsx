import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  PunchType,
  configurationError,
  defaultSchedule,
  readableError,
  registerAttendance,
  services,
  timeLabel,
  useAttendance,
  useClock,
} from "@tvapp/shared";
import { Action, Badge, Field, Message, colors, ui } from "@tvapp/shared/src/ui";
import { withBiometricConfirmation } from "./src/biometricPunch";
import { employeeCredential } from "./src/identity";

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
  const [selected, setSelected] = useState<{ id: string; nombre: string } | null>(null);
  const [pendingType, setPendingType] = useState<PunchType | null>(null);
  const [nombre, setNombre] = useState("");
  const [clave, setClave] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const punching = useRef(false);
  const live = useAttendance(!!selected, schedule, selected?.id);
  const entrada = live.rows.find((row) => row.tipo === "entrada");
  const salida = live.rows.find((row) => row.tipo === "salida");

  async function startPunch(tipo: PunchType) {
    if (punching.current || !services) return;
    punching.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await withBiometricConfirmation(tipo, async () => true);
      setPendingType(tipo);
    } catch (e) {
      setError(readableError(e));
    } finally {
      punching.current = false;
      setBusy(false);
    }
  }

  async function confirmIdentity() {
    if (!pendingType || busy) return;
    setBusy(true);
    setError("");
    const tipo = pendingType;
    try {
      const employee = await employeeCredential(nombre, clave);
      const result = await registerAttendance(employee, tipo);
      setSelected({ id: employee.id, nombre: employee.nombre });
      setMessage(
        `${tipo === "entrada" ? "Entrada" : "Salida"} registrada a las ${timeLabel(result.timestamp, schedule.zonaHoraria)}.${result.minutosRetardo ? ` Retardo: ${result.minutosRetardo} min.` : ""}`,
      );
    } catch (e) {
      setError(readableError(e));
    } finally {
      setClave("");
      setPendingType(null);
      setBusy(false);
    }
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={ui.eyebrow}>TVAPP / CHECADOR</Text>
            <Text style={styles.brand}>{schedule.empresa}</Text>
          </View>
          <Text style={styles.avatar}>
            {selected?.nombre.split(" ").slice(0, 2).map((part) => part[0]).join("") ?? "TV"}
          </Text>
        </View>
        <Text style={styles.greeting}>
          {selected ? `Hola, ${selected.nombre.split(" ")[0]}.` : "Checador de asistencia"}
        </Text>
        <View style={styles.clockCard}>
          <Text style={styles.clock}>{timeLabel(now, schedule.zonaHoraria)}</Text>
          <Text style={styles.date}>
            {new Intl.DateTimeFormat("es-MX", {
              timeZone: schedule.zonaHoraria,
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(now)}
          </Text>
          <Text style={ui.description}>
            Horario {schedule.entradaEsperada} — {schedule.salidaEsperada}
          </Text>
          <Text style={styles.small}>{schedule.toleranciaMinutos} min de tolerancia</Text>
        </View>
        <View style={ui.card}>
          <View style={styles.row}>
            <Text style={styles.section}>Mi asistencia</Text>
            <Text style={{ color: colors.teal, fontSize: 12 }}>
              {salida ? "Jornada completada" : entrada ? "Dentro de jornada" : "Por comenzar"}
            </Text>
          </View>
          <View style={styles.row}>
            <View style={styles.punchTime}>
              <Text style={ui.label}>ENTRADA</Text>
              <Text style={styles.time}>{entrada ? timeLabel(entrada.timestamp, schedule.zonaHoraria) : "— : —"}</Text>
              {entrada && <Badge status={entrada.estado} />}
              {!!entrada?.minutosRetardo && <Text style={styles.small}>{entrada.minutosRetardo} min de retardo</Text>}
            </View>
            <View style={styles.punchTime}>
              <Text style={ui.label}>SALIDA</Text>
              <Text style={styles.time}>{salida ? timeLabel(salida.timestamp, schedule.zonaHoraria) : "— : —"}</Text>
              {salida && <Badge status={salida.estado} />}
            </View>
          </View>
          <Action label="Registrar entrada" onPress={() => startPunch("entrada")} disabled={busy || !services} />
          <Action label="Registrar salida" onPress={() => startPunch("salida")} disabled={busy || !services} secondary />
          {busy && <ActivityIndicator color={colors.teal} />}
          <Message text={message} />
          <Message text={error || configurationError || live.error} error />
        </View>
      </ScrollView>
      <Modal visible={!!pendingType} transparent animationType="fade" onRequestClose={() => !busy && setPendingType(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[ui.card, styles.modalCard]}>
            <Text style={styles.section}>Identificar empleado</Text>
            <Text style={ui.description}>Escribe el nombre y la clave registrados en Firestore.</Text>
            <Field label="Nombre" value={nombre} onChange={setNombre} placeholder="Nombre completo" maxLength={15} />
            <Field label="Clave" value={clave} onChange={setClave} secure maxLength={15} />
            <Action label={busy ? "Verificando…" : `Confirmar ${pendingType}`} onPress={confirmIdentity} disabled={busy || !nombre.trim() || !clave} />
            <Action label="Cancelar" secondary onPress={() => { setClave(""); setPendingType(null); }} disabled={busy} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", maxWidth: 560, alignSelf: "center", padding: 24, gap: 20, paddingBottom: 36 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { color: colors.text, fontSize: 17, fontWeight: "700", marginTop: 7 },
  avatar: { backgroundColor: colors.card, borderRadius: 14, padding: 15, color: colors.teal, fontWeight: "700", overflow: "hidden" },
  greeting: { fontSize: 30, color: colors.text, fontWeight: "700", letterSpacing: -0.8 },
  clockCard: { backgroundColor: colors.panel, borderRadius: 22, padding: 26, gap: 9, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  clock: { fontSize: 64, color: colors.text, fontWeight: "300", letterSpacing: -3, fontVariant: ["tabular-nums"] },
  date: { fontSize: 14, color: colors.muted, textTransform: "capitalize" },
  small: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" },
  section: { color: colors.text, fontSize: 15, fontWeight: "600" },
  punchTime: { flex: 1, gap: 10, paddingVertical: 12 },
  time: { fontSize: 26, fontWeight: "500", color: colors.text, fontVariant: ["tabular-nums"] },
  modalOverlay: { flex: 1, backgroundColor: "#000b", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 440, alignSelf: "center" },
});

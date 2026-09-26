import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import {
  ContentItem,
  configurationError,
  defaultSchedule,
  statusLabels,
  timeLabel,
  useAttendance,
  useClock,
  useContent,
} from "@tvapp/shared";
import { Badge, Message, colors } from "@tvapp/shared/src/ui";
import { Media } from "./src/Media";
import { useAnnouncements } from "./src/useAnnouncements";

export default function App() {
  useKeepAwake();
  const now = useClock();
  const schedule = defaultSchedule;
  const live = useAttendance(true, schedule);
  const remote = useContent(true);
  const rows = live.rows;
  const items = useMemo(
    () => remote.items.filter((item) => item.activo),
    [remote.items],
  );
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const item = items[index % Math.max(1, items.length)];
  const { width, height } = useWindowDimensions();
  const scale = Math.max(0.4, Math.min(1.75, width / 1280, height / 720));
  const s = useMemo(() => styles(scale), [scale]);
  const announcements = useAnnouncements(
    rows,
    live.cached,
    live.ready,
    live.date,
  );

  useEffect(() => setIndex(0), [items]);
  useEffect(() => {
    if (paused || !item || items.length < 2) return;
    const timer = setTimeout(
      () => setIndex((previous) => (previous + 1) % items.length),
      item.duracionSegundos * 1000,
    );
    return () => clearTimeout(timer);
  }, [index, item, items.length, paused]);
  return (
    <View style={s.root}>
      <View style={s.topbar}>
        <View style={s.brandGroup}>
          <View style={s.logo}>
            <Text style={s.logoText}>tv.</Text>
          </View>
          <View>
            <Text style={s.brand}>{schedule.empresa}</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <View style={s.connection}>
            <View
              style={[
                s.dot,
                {
                  backgroundColor: live.cached ? colors.amber : colors.teal,
                },
              ]}
            />
            <Text style={s.connectionText}>
              {live.cached ? "RECONECTANDO" : "EN VIVO"}
            </Text>
          </View>
          <View style={s.headerDivider} />
          <View>
            <Text style={s.topTime}>
              {timeLabel(now, schedule.zonaHoraria)}
            </Text>
            <Text style={s.topDate}>
              {new Intl.DateTimeFormat("es-MX", {
                timeZone: schedule.zonaHoraria,
                weekday: "short",
                day: "numeric",
                month: "short",
              }).format(now)}
            </Text>
          </View>
        </View>
      </View>
      <View style={s.columns}>
        <View style={s.boardColumn}>
          <View style={s.boardTop}>
            <Text style={s.boardTitle}>Avisos</Text>
          </View>
          <View style={s.board}>
            {item ? (
              item.tipo === "aviso" ? (
                <Notice item={item} scale={scale} />
              ) : (
                <Media key={item.id + item.storagePath} item={item} />
              )
            ) : (
              <View style={s.empty}>
                <Text style={s.heading}>Sin avisos por mostrar</Text>
              </View>
            )}
            {announcements.active && (
              <View style={s.toast} accessibilityLiveRegion="polite">
                <View style={s.toastIcon}>
                  <Text style={{ fontSize: 22 * scale, color: colors.teal }}>
                    ✓
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={s.toastTitle}>
                    Gracias, {announcements.active.nombre.split(" ")[0]}.
                  </Text>
                  <Text style={s.toastBody}>
                    {announcements.active.tipo === "entrada"
                      ? "Entrada"
                      : "Salida"}{" "}
                    registrada · {statusLabels[announcements.active.estado]}
                  </Text>
                </View>
                <Text style={s.toastTime}>
                  {timeLabel(
                    announcements.active.timestamp,
                    schedule.zonaHoraria,
                  )}
                </Text>
              </View>
            )}
          </View>
          {items.length > 1 && (
            <View style={s.boardBottom}>
              <View style={s.dots}>
                {items.map((it, i) => (
                  <View
                    key={it.id}
                    style={[
                      s.carouselDot,
                      i === index % items.length && s.activeDot,
                    ]}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
        <View style={s.attendanceColumn}>
          <View style={s.attendanceHeading}>
            <Text style={s.heading}>Asistencia de hoy</Text>
            <View style={s.count}>
              <Text style={s.countText}>{rows.length}</Text>
            </View>
          </View>
          <Text style={s.listLabel}>REGISTROS RECIENTES</Text>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: 10 * scale }}
            showsVerticalScrollIndicator={false}
          >
            {!rows.length && (
              <Text style={s.body}>
                {live.ready
                  ? "Los registros aparecerán aquí al checar."
                  : "Conectando…"}
              </Text>
            )}
            {rows.map((row) => (
              <View style={s.person} key={row.id}>
                <View style={s.avatar}>
                  <Text style={s.initials}>
                    {row.nombre
                      .split(" ")
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 7 * scale }}>
                  <Text style={s.name} numberOfLines={1}>
                    {row.nombre}
                  </Text>
                  <View style={s.personDetail}>
                    <Text style={s.personTime}>
                      {timeLabel(row.timestamp, schedule.zonaHoraria)} ·{" "}
                      {row.tipo === "entrada" ? "Entrada" : "Salida"}
                    </Text>
                    <Badge status={row.estado} />
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={s.schedule}>
            <Text style={s.listLabel}>HORARIO DE HOY</Text>
            <Text style={s.scheduleTime}>
              {schedule.entradaEsperada}{" "}
              <Text style={{ color: colors.muted }}>—</Text>{" "}
              {schedule.salidaEsperada}
            </Text>
            <Text style={s.scheduleNote}>
              {schedule.toleranciaMinutos} min de tolerancia
            </Text>
          </View>
        </View>
      </View>
      {!!(
        configurationError ||
        live.error ||
        remote.error ||
        announcements.audioError
      ) && (
        <View style={{ paddingHorizontal: 24 }}>
          <Message
            error
            text={
              configurationError ||
              live.error ||
              remote.error ||
              announcements.audioError
            }
          />
        </View>
      )}
    </View>
  );
}
function Notice({ item, scale }: { item: ContentItem; scale: number }) {
  const s = styles(scale);
  return (
    <View style={s.notice}>
      <View style={{ maxWidth: "82%", gap: 24 * scale }}>
        <Text style={s.hero}>{item.titulo}</Text>
        <Text style={s.heroBody}>{item.texto}</Text>
      </View>
    </View>
  );
}
const styles = (z: number) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.bg,
      padding: 26 * z,
      paddingBottom: 16 * z,
    },
    login: {
      flex: 1,
      backgroundColor: colors.bg,
      justifyContent: "center",
      alignItems: "center",
      gap: 24,
    },
    topbar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: 24 * z,
    },
    brandGroup: { flexDirection: "row", gap: 14 * z, alignItems: "center" },
    logo: {
      width: 48 * z,
      height: 48 * z,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    logoText: { fontSize: 27 * z, fontWeight: "900", color: colors.teal },
    brand: { fontSize: 20 * z, fontWeight: "700", color: colors.text },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 24 * z },
    connection: { flexDirection: "row", alignItems: "center", gap: 8 * z },
    dot: {
      width: 6 * z,
      height: 6 * z,
      borderRadius: 3 * z,
      backgroundColor: colors.teal,
    },
    connectionText: {
      fontSize: 10 * z,
      color: colors.muted,
      fontWeight: "600",
      letterSpacing: 1.2 * z,
    },
    headerDivider: { height: 32 * z, width: 1, backgroundColor: colors.border },
    topTime: {
      fontSize: 25 * z,
      fontWeight: "500",
      color: colors.text,
      textAlign: "right",
      fontVariant: ["tabular-nums"],
    },
    topDate: {
      fontSize: 10 * z,
      color: colors.muted,
      marginTop: 3 * z,
      textAlign: "right",
      textTransform: "capitalize",
    },
    columns: { flex: 1, flexDirection: "row", minHeight: 0 },
    boardColumn: { width: "70%", paddingRight: 24 * z, gap: 14 * z },
    attendanceColumn: {
      width: "30%",
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
      paddingLeft: 24 * z,
      gap: 16 * z,
    },
    boardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    boardTitle: {
      fontSize: 16 * z,
      fontWeight: "600",
      color: colors.text,
    },
    board: {
      flex: 1,
      overflow: "hidden",
      minHeight: 180 * z,
      backgroundColor: colors.bg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    empty: { flex: 1, justifyContent: "center", padding: 40 * z, gap: 15 * z },
    boardBottom: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 2 * z,
    },
    dots: { flexDirection: "row", gap: 6 * z },
    carouselDot: {
      width: 5 * z,
      height: 5 * z,
      borderRadius: 5 * z,
      backgroundColor: colors.border,
    },
    activeDot: { width: 22 * z, backgroundColor: colors.teal },
    notice: {
      flex: 1,
      padding: 38 * z,
      backgroundColor: colors.bg,
      justifyContent: "center",
      overflow: "hidden",
    },
    hero: {
      fontSize: 49 * z,
      lineHeight: 55 * z,
      fontWeight: "600",
      letterSpacing: -1.8 * z,
      color: "#ecf4ef",
    },
    heroBody: { fontSize: 16 * z, lineHeight: 25 * z, color: "#b9cfca" },
    attendanceHeading: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 3 * z,
    },
    heading: {
      fontSize: 21 * z,
      color: colors.text,
      fontWeight: "600",
      marginTop: 7 * z,
      letterSpacing: -0.6 * z,
    },
    count: {
      padding: 2 * z,
    },
    countText: { color: colors.teal, fontSize: 14 * z, fontWeight: "700" },
    listLabel: {
      fontSize: 9 * z,
      letterSpacing: 1.5 * z,
      color: colors.muted,
      marginTop: 2 * z,
    },
    person: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12 * z,
      paddingVertical: 12 * z,
      borderBottomWidth: 1,
      borderBottomColor: "#1c2939",
    },
    avatar: {
      width: 36 * z,
      height: 36 * z,
      backgroundColor: colors.bg,
      justifyContent: "center",
      alignItems: "center",
    },
    initials: { color: "#a2b9ca", fontSize: 12 * z, fontWeight: "600" },
    name: { color: colors.text, fontSize: 13 * z, fontWeight: "500" },
    personDetail: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 4 * z,
      flexWrap: "wrap",
    },
    personTime: { fontSize: 10 * z, color: colors.muted },
    body: { fontSize: 15 * z, color: colors.muted, lineHeight: 23 * z },
    schedule: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 17 * z,
      gap: 8 * z,
    },
    scheduleTime: { fontSize: 20 * z, fontWeight: "500", color: colors.text },
    scheduleNote: { fontSize: 10 * z, color: colors.muted },
    toast: {
      position: "absolute",
      left: 18 * z,
      right: 18 * z,
      bottom: 18 * z,
      padding: 18 * z,
      flexDirection: "row",
      alignItems: "center",
      gap: 14 * z,
      backgroundColor: colors.bg,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    toastIcon: {
      width: 36 * z,
      height: 36 * z,
      backgroundColor: colors.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    toastTitle: { fontSize: 17 * z, color: colors.text, fontWeight: "600" },
    toastBody: { fontSize: 12 * z, color: "#a0c4b8" },
    toastTime: { fontSize: 16 * z, color: colors.teal },
    footer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      paddingTop: 14 * z,
    },
  });

import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { getDownloadURL, ref } from "firebase/storage";
import { useVideoPlayer, VideoView } from "expo-video";
import { ContentItem, readableError, services } from "@tvapp/shared";
import { colors } from "@tvapp/shared/src/ui";

function Video({
  uri,
  onError,
}: {
  uri: string;
  onError: (text: string) => void;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.volume = 0.25;
    p.play();
  });
  useEffect(() => {
    const sub = player.addListener("statusChange", (event) => {
      if (event.status === "error")
        onError(
          "No se pudo reproducir el video. Revisa el archivo y la conexión.",
        );
    });
    return () => sub.remove();
  }, [player, onError]);
  return (
    <VideoView
      style={StyleSheet.absoluteFill}
      player={player}
      nativeControls={false}
      contentFit="contain"
    />
  );
}
export function Media({ item }: { item: ContentItem }) {
  const [uri, setUri] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    setUri("");
    setError("");
    if (services?.storage && item.storagePath)
      getDownloadURL(ref(services.storage, item.storagePath))
        .then((url) => {
          if (current) setUri(url);
        })
        .catch((e) => {
          if (current) setError(readableError(e));
        });
    return () => {
      current = false;
    };
  }, [item.storagePath]);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#07101a",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {uri &&
        !error &&
        (item.tipo === "video" ? (
          <Video uri={uri} onError={setError} />
        ) : (
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            onError={() => setError("No se pudo cargar la imagen.")}
          />
        ))}
      {(!uri || error) && (
        <Text style={{ color: colors.muted, padding: 30, textAlign: "center" }}>
          {error || "Cargando contenido…"}
        </Text>
      )}
    </View>
  );
}

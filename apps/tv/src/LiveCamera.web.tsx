import React from "react";
import { Text, View } from "react-native";
import { colors } from "@tvapp/shared/src/ui";

export function LiveCamera() {
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
    <Text style={{ color: colors.muted }}>Cámara en vivo disponible en Android.</Text>
  </View>;
}

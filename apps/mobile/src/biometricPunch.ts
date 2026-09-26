import { Platform } from "react-native";
import * as Biometrics from "expo-local-authentication";

export async function withBiometricConfirmation<T>(
  tipo: "entrada" | "salida",
  register: () => Promise<T>,
): Promise<T> {
  if (Platform.OS === "web")
    throw new Error("Abre el checador en Expo Go en tu Android para usar la huella.");
  const types = await Biometrics.supportedAuthenticationTypesAsync();
  if (!types.includes(Biometrics.AuthenticationType.FINGERPRINT))
    throw new Error("Este dispositivo no tiene lector de huella disponible.");
  if (!(await Biometrics.hasHardwareAsync()))
    throw new Error("Este dispositivo no tiene un sensor biométrico disponible.");
  if (!(await Biometrics.isEnrolledAsync()))
    throw new Error("Primero registra tu huella en los ajustes de seguridad de Android.");
  if (
    Platform.OS === "android" &&
    (await Biometrics.getEnrolledLevelAsync()) !== Biometrics.SecurityLevel.BIOMETRIC_STRONG
  )
    throw new Error("Configura una huella o biometría de alta seguridad. El desbloqueo facial básico no sirve para checar.");

  const result = await Biometrics.authenticateAsync({
    promptMessage: tipo === "entrada" ? "Confirmar entrada" : "Confirmar salida",
    cancelLabel: "Cancelar",
    disableDeviceFallback: true,
    biometricsSecurityLevel: "strong",
    fallbackLabel: "",
  });
  if (!result.success) {
    const cancelled = ["user_cancel", "app_cancel", "system_cancel"].includes(result.error);
    throw new Error(cancelled
      ? "Cancelado. No se registró asistencia."
      : result.error === "lockout"
        ? "Biometría bloqueada temporalmente. Desbloquea tu teléfono e inténtalo después. No se registró asistencia."
        : "No se pudo confirmar la biometría. No se registró asistencia.");
  }
  return register();
}

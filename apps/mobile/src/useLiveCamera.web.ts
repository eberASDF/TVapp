export function useLiveCamera() {
  return { active: false, busy: false, status: "Cámara en vivo disponible en Android.",
    start: async () => {}, stop: async () => {} };
}

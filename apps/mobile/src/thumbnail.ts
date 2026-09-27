import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

// Base64 de unos 30 KiB como máximo; la foto capturada permanece solo en el teléfono.
export const MAX_THUMBNAIL_LENGTH = 40_000;

export async function createThumbnail(uri: string): Promise<string> {
  for (const [width, compress] of [[320, 0.4], [240, 0.35], [160, 0.25], [120, 0.2]] as const) {
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width, height: null });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
    if (saved.base64 && saved.base64.length <= MAX_THUMBNAIL_LENGTH)
      return saved.base64;
  }
  throw new Error("No se pudo reducir la foto para registrar la asistencia.");
}

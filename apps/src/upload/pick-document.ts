import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

export type FileType = "pdf" | "image";

const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export interface PickedDocument {
  uri: string;
  name: string;
  mimeType: string;
  fileType: FileType;
}

function fileTypeFromMimeType(mimeType: string): FileType {
  return mimeType === "application/pdf" ? "pdf" : "image";
}

// Câmera — Specs 01/02 permitem foto de exame/laudo. expo-image-picker
// sempre captura como JPEG; mimeType às vezes vem ausente no resultado,
// por isso o fallback.
export async function pickFromCamera(): Promise<PickedDocument | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Permissão de câmera negada. Habilite nas configurações do celular pra tirar a foto.");
  }

  const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? "image/jpeg";
  return {
    uri: asset.uri,
    name: asset.fileName ?? `documento-${Date.now()}.jpg`,
    mimeType,
    fileType: fileTypeFromMimeType(mimeType),
  };
}

// Arquivo — PDF ou imagem já existente (Files no iOS, que também expõe
// Fotos; seletor de arquivos do sistema no Android).
export async function pickFromDocument(): Promise<PickedDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ALLOWED_DOCUMENT_TYPES, copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? "application/pdf";
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType,
    fileType: fileTypeFromMimeType(mimeType),
  };
}

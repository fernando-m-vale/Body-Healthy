import { useState } from "react";
import { pickFromCamera, pickFromDocument, type FileType, type PickedDocument } from "./pick-document";
import { uploadFileToS3 } from "./upload-file";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/auth-context";

interface UploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
}

interface UseUploadFlowOptions<TRegistered> {
  getUploadUrl: (token: string, fileType: FileType, contentType: string) => Promise<UploadUrlResponse>;
  register: (token: string, fileKey: string, fileType: FileType) => Promise<TRegistered>;
  onUploaded: (registered: TRegistered) => void;
}

// Orquestra pick → getUploadUrl → PUT no S3 → register (Specs 01/02, seção
// 5: "mesmo padrão da Spec 01/S3"). Único ponto que muda por domínio são as
// duas funções de API passadas — resto (seleção de arquivo, upload binário,
// estado de loading/erro) é idêntico entre exame e laudo de imagem.
export function useUploadFlow<TRegistered>({ getUploadUrl, register, onUploaded }: UseUploadFlowOptions<TRegistered>) {
  const { token } = useAuth();
  const [selectedFile, setSelectedFile] = useState<PickedDocument | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runPicker(picker: () => Promise<PickedDocument | null>) {
    setError(null);
    try {
      const file = await picker();
      if (file) {
        setSelectedFile(file);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível selecionar o arquivo.");
    }
  }

  async function handleContinue() {
    if (!selectedFile || !token) {
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { uploadUrl, fileKey } = await getUploadUrl(token, selectedFile.fileType, selectedFile.mimeType);
      await uploadFileToS3(uploadUrl, selectedFile.uri, selectedFile.mimeType);
      const registered = await register(token, fileKey, selectedFile.fileType);
      onUploaded(registered);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Não foi possível enviar o arquivo. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return {
    selectedFile,
    sheetVisible,
    openSheet: () => setSheetVisible(true),
    closeSheet: () => setSheetVisible(false),
    pickCamera: () => runPicker(pickFromCamera),
    pickDocument: () => runPicker(pickFromDocument),
    handleContinue,
    loading,
    error,
  };
}

import { apiRequest } from "./client";
import type { FileType } from "../upload/pick-document";

export type { FileType };
export type LabSource = "fleury" | "dasa" | "hermes_pardini" | "generic";
export type ExamStatus = "uploaded" | "processing" | "pending_confirmation" | "confirmed" | "failed" | "discarded";

interface UploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
}

export function getUploadUrl(token: string, fileType: FileType, contentType: string): Promise<UploadUrlResponse> {
  return apiRequest<UploadUrlResponse>("/exams/upload-url", {
    method: "POST",
    token,
    body: { fileType, contentType },
  });
}

export interface ExamSummary {
  id: string;
  status: ExamStatus;
  fileType: FileType;
  labSource: LabSource | null;
  examDate: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

export function registerExam(
  token: string,
  fileKey: string,
  fileType: FileType,
  labSource: LabSource | null = null,
): Promise<ExamSummary> {
  return apiRequest<ExamSummary>("/exams", { method: "POST", token, body: { fileKey, fileType, labSource } });
}

export interface ExamMarker {
  id: string;
  name: string;
  value: number;
  unit: string;
  referenceMin: number | null;
  referenceMax: number | null;
  userCorrected: boolean;
  trend: string | null;
}

export interface ExamDetail extends ExamSummary {
  markers: ExamMarker[];
}

export function getExam(token: string, id: string): Promise<ExamDetail> {
  return apiRequest<ExamDetail>(`/exams/${id}`, { token });
}

export interface ConfirmMarkerInput {
  id: string;
  value: number;
  unit: string;
  referenceMin: number | null;
  referenceMax: number | null;
}

// POST /exams/:id/confirm — Spec 01, RNF03: exige a lista completa dos
// marcadores extraídos, não uma confirmação parcial.
export function confirmExam(token: string, id: string, markers: ConfirmMarkerInput[]): Promise<ExamDetail> {
  return apiRequest<ExamDetail>(`/exams/${id}/confirm`, { method: "POST", token, body: { markers } });
}

// POST /exams/:id/discard — Spec 01 v4, seção 4 passo 7: alternativa à
// confirmação, válido a partir de "pending_confirmation" ou "failed", nunca
// a partir de "confirmed". Sem comentário (diferente do laudo de imagem).
export function discardExam(token: string, id: string): Promise<ExamSummary> {
  return apiRequest<ExamSummary>(`/exams/${id}/discard`, { method: "POST", token });
}

import { apiRequest } from "./client";
import type { FileType } from "../upload/pick-document";

export type { FileType };
export type ReportStatus = "uploaded" | "processing" | "pending_review" | "reviewed" | "failed" | "discarded";

interface UploadUrlResponse {
  uploadUrl: string;
  fileKey: string;
}

export function getUploadUrl(token: string, fileType: FileType, contentType: string): Promise<UploadUrlResponse> {
  return apiRequest<UploadUrlResponse>("/imaging-reports/upload-url", {
    method: "POST",
    token,
    body: { fileType, contentType },
  });
}

export interface ReportSummary {
  id: string;
  status: ReportStatus;
  fileType: FileType;
  reportType: string | null;
  examDate: string | null;
  createdAt: string;
  reviewedAt: string | null;
  userFlagged: boolean;
}

export function registerReport(
  token: string,
  fileKey: string,
  fileType: FileType,
  reportType: string | null = null,
): Promise<ReportSummary> {
  return apiRequest<ReportSummary>("/imaging-reports", { method: "POST", token, body: { fileKey, fileType, reportType } });
}

export interface ReportFinding {
  description: string;
  outOfReferenceRange: boolean;
}

export interface ReportDetail extends ReportSummary {
  aiSummary: string | null;
  findings: ReportFinding[];
  flagComment: string | null;
}

export function getReport(token: string, id: string): Promise<ReportDetail> {
  return apiRequest<ReportDetail>(`/imaging-reports/${id}`, { token });
}

// POST /imaging-reports/:id/review — Spec 02, seção 5 passo 5: aceitar
// (userFlagged: false) ou sinalizar como incorreto (userFlagged: true) com
// comentário livre opcional.
export function reviewReport(
  token: string,
  id: string,
  userFlagged: boolean,
  comment?: string,
): Promise<ReportDetail> {
  return apiRequest<ReportDetail>(`/imaging-reports/${id}/review`, {
    method: "POST",
    token,
    body: { userFlagged, comment },
  });
}

// POST /imaging-reports/:id/retry — reprocessa o mesmo arquivo (seção 5
// passo 6, opção "Tentar reprocessar").
export function retryReport(token: string, id: string): Promise<ReportSummary> {
  return apiRequest<ReportSummary>(`/imaging-reports/${id}/retry`, { method: "POST", token });
}

// POST /imaging-reports/:id/discard — usado tanto pra "Enviar outro
// arquivo" quanto "Não subir agora" (seção 5 passo 6).
export function discardReport(token: string, id: string): Promise<ReportSummary> {
  return apiRequest<ReportSummary>(`/imaging-reports/${id}/discard`, { method: "POST", token });
}

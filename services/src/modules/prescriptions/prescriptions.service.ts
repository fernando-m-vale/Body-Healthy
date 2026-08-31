import type { PrismaClient } from "../../generated/prisma/client";
import type { KeyProvider } from "../../lib/key-provider";
import { encryptField, decryptField } from "../../lib/field-encryption";
import { logAccess } from "../../lib/audit-log";
import type { PrescriptionEntryBody } from "./prescriptions.schemas";

export class EntryNotFoundError extends Error {}

interface DecryptedEntry {
  id: string;
  name: string;
  category: string;
  startDate: Date;
  endDate: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function createEntry(
  prisma: PrismaClient,
  keyProvider: KeyProvider,
  userId: string,
  body: PrescriptionEntryBody,
): Promise<DecryptedEntry> {
  // Cifragem acontece antes de qualquer chamada ao Prisma — se falhar aqui, a
  // exceção propaga e nada é persistido (spec, seção 8: nunca fallback em
  // texto plano).
  const nameEncrypted = await encryptField(body.name, keyProvider);
  const notesEncrypted = body.notes ? await encryptField(body.notes, keyProvider) : null;

  const entry = await prisma.prescriptionEntry.create({
    data: {
      userId,
      nameEncrypted,
      category: body.category,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      notesEncrypted,
    },
  });

  return {
    id: entry.id,
    name: body.name,
    category: entry.category,
    startDate: entry.startDate,
    endDate: entry.endDate,
    notes: body.notes ?? null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export async function updateEntry(
  prisma: PrismaClient,
  keyProvider: KeyProvider,
  userId: string,
  accessedBy: string,
  entryId: string,
  body: PrescriptionEntryBody,
): Promise<DecryptedEntry> {
  const existing = await prisma.prescriptionEntry.findFirst({ where: { id: entryId, userId } });
  if (!existing) {
    throw new EntryNotFoundError();
  }

  // Buscar o item para editar já conta como acesso de leitura (spec, seção 6
  // passo 4) — fail-closed: se o log não gravar, a edição não prossegue.
  await logAccess(prisma, { userId, accessedBy, resource: `PrescriptionEntry:${entryId}` });

  const nameEncrypted = await encryptField(body.name, keyProvider);
  const notesEncrypted = body.notes ? await encryptField(body.notes, keyProvider) : null;

  const entry = await prisma.prescriptionEntry.update({
    where: { id: entryId },
    data: {
      nameEncrypted,
      category: body.category,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      notesEncrypted,
    },
  });

  return {
    id: entry.id,
    name: body.name,
    category: entry.category,
    startDate: entry.startDate,
    endDate: entry.endDate,
    notes: body.notes ?? null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export async function deleteEntry(
  prisma: PrismaClient,
  userId: string,
  accessedBy: string,
  entryId: string,
): Promise<void> {
  const existing = await prisma.prescriptionEntry.findFirst({ where: { id: entryId, userId } });
  if (!existing) {
    throw new EntryNotFoundError();
  }

  // Mesma regra: buscar antes de excluir conta como acesso de leitura.
  await logAccess(prisma, { userId, accessedBy, resource: `PrescriptionEntry:${entryId}` });

  await prisma.prescriptionEntry.delete({ where: { id: entryId } });
}

export async function listEntries(
  prisma: PrismaClient,
  keyProvider: KeyProvider,
  userId: string,
  accessedBy: string,
): Promise<DecryptedEntry[]> {
  const entries = await prisma.prescriptionEntry.findMany({
    where: { userId },
    orderBy: { startDate: "asc" },
  });

  // Log de auditoria obrigatório antes de decifrar/retornar (fail-closed): se
  // a escrita do log falhar, a exceção propaga e nenhum dado decifrado sai.
  await logAccess(prisma, { userId, accessedBy, resource: "PrescriptionEntry:list" });

  return Promise.all(
    entries.map(async (entry) => ({
      id: entry.id,
      name: await decryptField(entry.nameEncrypted, keyProvider),
      category: entry.category,
      startDate: entry.startDate,
      endDate: entry.endDate,
      notes: entry.notesEncrypted ? await decryptField(entry.notesEncrypted, keyProvider) : null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })),
  );
}

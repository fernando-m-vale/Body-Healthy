import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import type { KeyProvider } from "./key-provider";

// Envelope encryption em nível de campo (Spec 04, seção 5). O schema Prisma só
// tem uma coluna Bytes por campo sensível (sem colunas extras para IV/tag/DEK
// cifrada) — por isso todo o envelope é serializado como JSON e gravado como
// um único Buffer. Formato simples de depurar, sem layout binário customizado.
interface Envelope {
  encryptedDEK: string; // base64
  iv: string; // base64
  authTag: string; // base64
  ciphertext: string; // base64
}

const IV_LENGTH_BYTES = 12;

export async function encryptField(plaintext: string, keyProvider: KeyProvider): Promise<Uint8Array<ArrayBuffer>> {
  const { plaintextKey, encryptedKey } = await keyProvider.generateDataKey();

  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv("aes-256-gcm", plaintextKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  const envelope: Envelope = {
    encryptedDEK: encryptedKey.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };

  // new Uint8Array(...) em vez de retornar o Buffer diretamente: Buffer carrega o
  // tipo genérico ArrayBufferLike (inclui SharedArrayBuffer), mais amplo que o
  // Uint8Array<ArrayBuffer> que o campo Bytes do Prisma espera.
  return new Uint8Array(Buffer.from(JSON.stringify(envelope), "utf8"));
}

export async function decryptField(envelopeBytes: Uint8Array, keyProvider: KeyProvider): Promise<string> {
  // O Prisma pode retornar Bytes como Uint8Array puro (não necessariamente uma
  // instância de Buffer) — Buffer.from() normaliza antes de usar toString(encoding).
  const envelope = JSON.parse(Buffer.from(envelopeBytes).toString("utf8")) as Envelope;

  const plaintextKey = await keyProvider.decryptDataKey(Buffer.from(envelope.encryptedDEK, "base64"));

  const decipher = createDecipheriv("aes-256-gcm", plaintextKey, Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}

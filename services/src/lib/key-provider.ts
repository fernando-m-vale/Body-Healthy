import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

// Abstração da chave mestra (KEK) — espelha a API do AWS KMS (GenerateDataKey /
// Decrypt) de propósito, para trocar a implementação local por KMS real depois
// sem alterar o restante do código de criptografia em nível de campo (Spec 04,
// seção 5). Cada campo sensível recebe sua própria DEK (chave de dados),
// nunca compartilhada entre campos ou registros.
export interface KeyProvider {
  generateDataKey(): Promise<{ plaintextKey: Buffer; encryptedKey: Buffer }>;
  decryptDataKey(encryptedKey: Buffer): Promise<Buffer>;
}

const DEK_LENGTH_BYTES = 32; // AES-256
const IV_LENGTH_BYTES = 12; // padrão para GCM
const AUTH_TAG_LENGTH_BYTES = 16;

// Implementação de desenvolvimento local: a KEK é uma chave simétrica fixa via
// variável de ambiente (LOCAL_MASTER_KEY, base64). "Cifrar a DEK pela KEK" =
// AES-256-GCM usando a KEK como chave. Quando a conta AWS existir, uma
// KmsKeyProvider (GenerateDataKeyCommand/DecryptCommand) substitui esta classe
// sem tocar em field-encryption.ts nem nos módulos que a usam.
export class LocalKeyProvider implements KeyProvider {
  private readonly masterKey: Buffer;

  constructor(masterKeyBase64: string) {
    const key = Buffer.from(masterKeyBase64, "base64");
    if (key.length !== DEK_LENGTH_BYTES) {
      throw new Error(`LOCAL_MASTER_KEY deve ter ${DEK_LENGTH_BYTES} bytes (256 bits) em base64`);
    }
    this.masterKey = key;
  }

  async generateDataKey(): Promise<{ plaintextKey: Buffer; encryptedKey: Buffer }> {
    const plaintextKey = randomBytes(DEK_LENGTH_BYTES);
    const encryptedKey = this.wrapWithMasterKey(plaintextKey);
    return { plaintextKey, encryptedKey };
  }

  async decryptDataKey(encryptedKey: Buffer): Promise<Buffer> {
    return this.unwrapWithMasterKey(encryptedKey);
  }

  private wrapWithMasterKey(plaintextKey: Buffer): Buffer {
    const iv = randomBytes(IV_LENGTH_BYTES);
    const cipher = createCipheriv("aes-256-gcm", this.masterKey, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintextKey), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, ciphertext]);
  }

  private unwrapWithMasterKey(wrapped: Buffer): Buffer {
    const iv = wrapped.subarray(0, IV_LENGTH_BYTES);
    const authTag = wrapped.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
    const ciphertext = wrapped.subarray(IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES);
    const decipher = createDecipheriv("aes-256-gcm", this.masterKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }
}

let provider: KeyProvider | undefined;

export function getKeyProvider(): KeyProvider {
  if (provider) {
    return provider;
  }

  const kind = process.env.KEY_PROVIDER ?? "local";

  if (kind === "local") {
    const masterKey = process.env.LOCAL_MASTER_KEY;
    if (!masterKey) {
      throw new Error("LOCAL_MASTER_KEY não configurado no ambiente");
    }
    provider = new LocalKeyProvider(masterKey);
    return provider;
  }

  throw new Error(`KEY_PROVIDER "${kind}" não implementado (só "local" disponível nesta fase)`);
}

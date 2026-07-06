import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";
import { createHash, createHmac } from "crypto";

// Adaptador de almacenamiento de archivos. Por defecto: disco local (sin infra
// externa). Si el entorno trae credenciales S3 (S3_BUCKET/S3_REGION/
// S3_ACCESS_KEY_ID/S3_SECRET_ACCESS_KEY, y opcional S3_ENDPOINT para R2/MinIO),
// escribe y lee de ahí — sin añadir dependencias: la firma SigV4 se hace con el
// crypto de Node. La URL pública NO cambia: seguimos sirviendo por
// /api/files/... (con control de acceso por pareja), solo cambia de dónde
// salen los bytes. Así el resto de la app no se entera del backend.

export const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export interface StorageAdapter {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
}

class LocalStorage implements StorageAdapter {
  async put(key: string, body: Buffer): Promise<void> {
    const full = path.join(UPLOAD_ROOT, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
  }
  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(path.join(UPLOAD_ROOT, key));
    } catch {
      return null;
    }
  }
}

type S3Config = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string; // R2 / MinIO / S3-compatible
};

function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

// Cadena de derivación de la clave de firma AWS SigV4.
function signingKey(secret: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

class S3Storage implements StorageAdapter {
  constructor(private cfg: S3Config) {}

  private endpoint(key: string): { url: string; host: string; canonicalUri: string } {
    const encodedKey = key.split("/").map(encodeURIComponent).join("/");
    if (this.cfg.endpoint) {
      const u = new URL(this.cfg.endpoint);
      const base = u.pathname.replace(/\/$/, "");
      const canonicalUri = `${base}/${this.cfg.bucket}/${encodedKey}`;
      return { url: `${u.protocol}//${u.host}${canonicalUri}`, host: u.host, canonicalUri };
    }
    const host = `${this.cfg.bucket}.s3.${this.cfg.region}.amazonaws.com`;
    const canonicalUri = `/${encodedKey}`;
    return { url: `https://${host}${canonicalUri}`, host, canonicalUri };
  }

  private async request(method: "PUT" | "GET", key: string, body?: Buffer, contentType?: string) {
    const { url, host, canonicalUri } = this.endpoint(key);
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const payload = body ?? Buffer.alloc(0);
    const payloadHash = sha256Hex(payload);

    const headers: Record<string, string> = {
      host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate
    };
    if (contentType) headers["content-type"] = contentType;

    const signedHeaders = Object.keys(headers).sort().join(";");
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((k) => `${k}:${headers[k].trim()}\n`)
      .join("");
    const canonicalRequest = [method, canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");

    const scope = `${dateStamp}/${this.cfg.region}/s3/aws4_request`;
    const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256Hex(canonicalRequest)].join("\n");
    const signature = createHmac("sha256", signingKey(this.cfg.secretAccessKey, dateStamp, this.cfg.region, "s3"))
      .update(stringToSign)
      .digest("hex");
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return fetch(url, {
      method,
      headers: { ...headers, Authorization: authorization },
      body: method === "PUT" ? new Uint8Array(payload) : undefined,
      cache: "no-store"
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const res = await this.request("PUT", key, body, contentType);
    if (!res.ok) throw new Error(`S3 rechazó la subida (${res.status})`);
  }

  async get(key: string): Promise<Buffer | null> {
    const res = await this.request("GET", key);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }
}

function s3ConfigFromEnv(): S3Config | null {
  const { S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT } = process.env;
  if (!S3_BUCKET || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) return null;
  return {
    bucket: S3_BUCKET,
    region: S3_REGION,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    endpoint: S3_ENDPOINT || undefined
  };
}

let cached: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (cached) return cached;
  const s3 = s3ConfigFromEnv();
  cached = s3 ? new S3Storage(s3) : new LocalStorage();
  return cached;
}

export function storageMode(): "s3" | "local" {
  return s3ConfigFromEnv() ? "s3" : "local";
}

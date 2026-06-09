const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export type UploadFileDetails = {
  buffer: ArrayBuffer;
  blob: Blob;
  bytes: number;
  contentType: string;
  extension: string;
  detectedFormat: string;
};

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function detectByBytes(buffer: ArrayBuffer): Pick<UploadFileDetails, "contentType" | "extension" | "detectedFormat"> | null {
  const bytes = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 12));
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { contentType: "application/pdf", extension: "pdf", detectedFormat: "PDF" };
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { contentType: "image/jpeg", extension: "jpg", detectedFormat: "JPEG" };
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { contentType: "image/png", extension: "png", detectedFormat: "PNG" };
  }
  const ascii = new TextDecoder("ascii").decode(bytes);
  if (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP") {
    return { contentType: "image/webp", extension: "webp", detectedFormat: "WebP" };
  }
  return null;
}

export async function readUploadFile(file: File): Promise<UploadFileDetails> {
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new Error("Nao foi possivel ler o arquivo. Se ele estiver no Google Drive, baixe-o para o dispositivo primeiro.");
  }

  if (buffer.byteLength === 0) {
    throw new Error("O arquivo esta vazio. Se ele estiver no Google Drive, baixe-o para o dispositivo primeiro.");
  }
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error("Arquivo muito grande. O limite e 8 MB.");
  }

  const detected = detectByBytes(buffer);
  if (!detected) {
    throw new Error("Formato nao reconhecido. Selecione um arquivo PDF, JPG, PNG ou WebP valido.");
  }

  return {
    buffer,
    blob: new Blob([buffer], { type: detected.contentType }),
    bytes: buffer.byteLength,
    ...detected,
  };
}

export function getUploadDiagnostics(file: File, details: UploadFileDetails) {
  return {
    fileName: file.name || "(sem nome)",
    reportedType: file.type || "(vazio)",
    reportedBytes: file.size,
    readBytes: details.bytes,
    detectedFormat: details.detectedFormat,
    uploadContentType: details.contentType,
  };
}

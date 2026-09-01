import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

const STORAGE_DIR = process.env.ATTACHMENT_STORAGE_DIR ?? path.resolve(process.cwd(), "uploads");

export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ACTIVE_ATTACHMENTS_PER_TICKET = 5;

// BR-12 requires checking BOTH extension and MIME type — checking MIME alone lets a file
// named "virus.exe" through if it's uploaded with a spoofed Content-Type of "image/png".
export function isAllowedAttachmentFile(originalFilename: string, mimeType: string): boolean {
  const ext = path.extname(originalFilename).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(ext) && ALLOWED_MIME_TYPES.includes(mimeType);
}

export async function saveAttachmentFile(buffer: Buffer, originalFilename: string): Promise<string> {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  const ext = path.extname(originalFilename);
  const storedName = `${randomUUID()}${ext}`;
  await fs.writeFile(path.join(STORAGE_DIR, storedName), buffer);
  return storedName;
}

export function readAttachmentFile(storedName: string): Promise<Buffer> {
  return fs.readFile(path.join(STORAGE_DIR, storedName));
}

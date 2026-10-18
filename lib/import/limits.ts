export const MAX_FILES_PER_BATCH = 20;

export const MAX_BATCH_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = [".xml"] as const;

export const ATTACHMENT_EXTENSIONS = [".pdf"] as const;

export function isAttachmentFile(name: string): boolean {
  return ATTACHMENT_EXTENSIONS.some((e) => name.toLowerCase().endsWith(e));
}

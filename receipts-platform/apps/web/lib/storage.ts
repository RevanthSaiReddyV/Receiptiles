import { put } from "@vercel/blob";

export async function uploadFile(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const { url } = await put(key, file, {
    access: "public",
    contentType,
  });

  return url;
}

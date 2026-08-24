import { axiosInstance, getAccessToken } from "@/api/axios-instance";

/**
 * The photo bytes, which do not go through the generated client.
 *
 * Orval models JSON; these two calls move binary — a multipart upload and a raw download —
 * so they use the shared axios instance directly and keep the same auth handling.
 */

export interface UploadedPhoto {
  readonly storageKey: string;
  readonly contentType: string;
  readonly byteSize: number;
}

export async function uploadPhotoBytes(
  photoId: string,
  copyId: string,
  bytes: Blob,
): Promise<UploadedPhoto | null> {
  const form = new FormData();
  form.append("photoId", photoId);
  form.append("copyId", copyId);
  form.append("file", bytes, `${photoId}`);

  const { data } = await axiosInstance.post("/api/v1/photos", form, {
    headers: {
      ...(getAccessToken() === null ? {} : { Authorization: `Bearer ${getAccessToken()}` }),
    },
  });
  if (typeof data?.storageKey !== "string") return null;
  return {
    storageKey: data.storageKey,
    contentType: typeof data.contentType === "string" ? data.contentType : "image/jpeg",
    byteSize: typeof data.byteSize === "number" ? data.byteSize : bytes.size,
  };
}

export async function downloadPhotoBytes(photoId: string): Promise<Blob> {
  const { data } = await axiosInstance.get(`/api/v1/photos/${photoId}/content`, {
    responseType: "blob",
    headers: {
      ...(getAccessToken() === null ? {} : { Authorization: `Bearer ${getAccessToken()}` }),
    },
  });
  return data as Blob;
}

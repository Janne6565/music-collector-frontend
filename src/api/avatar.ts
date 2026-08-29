import { axiosInstance, getAccessToken } from "@/api/axios-instance";
import type { AvatarDto } from "@/api/generated/rekordoAPI.schemas";

/**
 * The profile picture, which does not go through the generated client for the same reason
 * the photo calls do not: orval models JSON, and this is a multipart upload.
 *
 * What goes up is the picture at full size plus the square the person framed. The server
 * renders from that, so the circle is identical on every device — and the upload is a real
 * upload, which is why 27d can promise a determinate bar rather than a spinner.
 */

export interface AvatarCrop {
  readonly x: number;
  readonly y: number;
  readonly size: number;
}

export async function uploadAvatar(
  picture: Blob,
  crop: AvatarCrop,
  onProgress?: (sent: number, total: number) => void,
  signal?: AbortSignal,
): Promise<AvatarDto> {
  const form = new FormData();
  form.append("file", picture, "avatar.jpg");
  form.append("x", String(Math.round(crop.x)));
  form.append("y", String(Math.round(crop.y)));
  form.append("size", String(Math.round(crop.size)));

  const { data } = await axiosInstance.post("/api/v1/avatar", form, {
    signal,
    headers: {
      ...(getAccessToken() === null ? {} : { Authorization: `Bearer ${getAccessToken()}` }),
    },
    onUploadProgress: (event) => {
      // `total` is absent on some transports. The row falls back to an indeterminate ring
      // rather than inventing a denominator and drawing a bar that lies.
      onProgress?.(event.loaded, event.total ?? 0);
    },
  });
  return data as AvatarDto;
}

export async function removeAvatar(): Promise<void> {
  await axiosInstance.delete("/api/v1/avatar", {
    headers: {
      ...(getAccessToken() === null ? {} : { Authorization: `Bearer ${getAccessToken()}` }),
    },
  });
}

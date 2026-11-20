import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Nén ảnh chọn từ file về định dạng JPEG độ nét cao (tối đa 1400x1400px, quality 0.82)
 * phục vụ tra cứu chi tiết linh kiện trên Firebase Storage (~120KB - 280KB/ảnh).
 */
export function compressImageToHighResBlob(
  file: File,
  maxWidth: number = 1400,
  maxHeight: number = 1400,
  quality: number = 0.82
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Upload 1 ảnh lên Firebase Storage trong thư mục `dk_bom_images/...` và trả về URL + storage path.
 */
export async function uploadBomImageToStorage(
  file: File,
  folder: string,
  filePrefix: string
): Promise<{ url: string; path: string }> {
  const safePrefix = filePrefix.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48) || 'img';
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const storagePath = `dk_bom_images/${folder}/${safePrefix}_${uniqueSuffix}.jpg`;

  const blob = await compressImageToHighResBlob(file, 1400, 1400, 0.82);
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, blob, {
    contentType: 'image/jpeg',
    cacheControl: 'public, max-age=31536000'
  });

  const url = await getDownloadURL(storageRef);
  return { url, path: storagePath };
}

/**
 * Xóa ảnh trên Firebase Storage một cách an toàn (bỏ qua nếu file không còn tồn tại).
 */
export async function deleteBomImageFromStorage(storagePath?: string): Promise<void> {
  if (!storagePath || !storagePath.startsWith('dk_bom_images/')) return;
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err: any) {
    if (err?.code !== 'storage/object-not-found') {
      console.warn('[BOM Storage Delete Warning]:', err?.message || err);
    }
  }
}

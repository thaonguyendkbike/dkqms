import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../firebase';
import { compressImageToHighResBlob } from './bomStorageService';
import { compressImageFile } from '../imageCompressor';

/**
 * Tải ảnh QMS lên Firebase Storage với chất lượng sắc nét chuẩn /lk (1400x1400 JPEG q=0.82, ~120-280KB).
 * Firestore & LocalStorage chỉ lưu URL siêu nhẹ (~150 bytes) — không bao giờ gây tràn 1MB/5MB.
 * Nếu máy đang offline hoặc chưa đăng nhập Firebase Auth, tự động lùi về nén an toàn Base64 <30KB.
 */
export async function uploadQmsImage(
  file: File,
  folder: string = 'general',
  filePrefix: string = 'qms'
): Promise<string> {
  if (auth.currentUser && typeof navigator !== 'undefined' && navigator.onLine !== false) {
    try {
      const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32) || 'general';
      const safePrefix = filePrefix.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'img';
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const storagePath = `dk_qms_images/${safeFolder}/${safePrefix}_${uniqueSuffix}.jpg`;

      const blob = await compressImageToHighResBlob(file, 1400, 1400, 0.82);
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
      });

      const downloadUrl = await getDownloadURL(storageRef);
      return downloadUrl;
    } catch (storageErr) {
      console.warn('[QMS Image Storage Fallback]: Không thể tải lên Firebase Storage, tự động chuyển về nén an toàn <30KB:', storageErr);
    }
  }

  // Fallback an toàn khi offline hoặc lỗi mạng: nén Base64 < 30KB theo chuẩn an toàn
  return compressImageFile(file, 500, 500, 0.4);
}

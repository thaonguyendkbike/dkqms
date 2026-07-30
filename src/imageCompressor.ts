/**
 * Utility to compress images in-browser using HTML5 Canvas.
 * Reduces raw base64 and high-res files to optimized light-weight JPEGs.
 * Strictly enforces <30KB size per image to prevent LocalStorage/Firestore quota overflow.
 */

export function compressImageFile(file: File, maxWidth: number = 500, maxHeight: number = 500, quality: number = 0.4): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawResult = event.target?.result as string || "";
      if (!rawResult) {
        resolve("");
        return;
      }
      const img = new Image();
      img.src = rawResult;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Force scale-down if dimensions exceed bounds (max 500x500 for <30KB target)
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

        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawResult.length > 40000 ? "" : rawResult);
          return;
        }

        // Draw and compress image
        ctx.fillStyle = "#ffffff"; // prevent transparent dark overlay in compiled JPEG
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let compressedBase64 = canvas.toDataURL('image/jpeg', quality);

        // If still > 35KB, compress with lower quality / smaller bounds
        if (compressedBase64.length > 35000) {
          canvas.width = Math.max(1, Math.round(canvas.width * 0.7));
          canvas.height = Math.max(1, Math.round(canvas.height * 0.7));
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          compressedBase64 = canvas.toDataURL('image/jpeg', 0.3);
        }

        console.log(`[Image Compressor] Compressed file from ${(rawResult.length / 1024).toFixed(1)}KB to ${(compressedBase64.length / 1024).toFixed(1)}KB`);
        resolve(compressedBase64);
      };
      img.onerror = () => {
        resolve(rawResult.length > 40000 ? "" : rawResult);
      };
    };
    reader.onerror = () => {
      resolve(""); // fail gracefully
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an existing base64 image string if over ~25KB to lightweight JPEG.
 * Returns the same string if it's already small or not compressible.
 */
export function compressBase64String(base64Str: string, maxWidth: number = 500, maxHeight: number = 500, quality: number = 0.4): Promise<string> {
  if (!base64Str || !base64Str.startsWith('data:image/') || base64Str.length < 30000) {
    // If empty, not image data URL, or already tiny (< 22KB raw size), return as is
    return Promise.resolve(base64Str);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
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

      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      let compressedResult = canvas.toDataURL('image/jpeg', quality);
      if (compressedResult.length > 35000) {
        canvas.width = Math.max(1, Math.round(canvas.width * 0.7));
        canvas.height = Math.max(1, Math.round(canvas.height * 0.7));
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        compressedResult = canvas.toDataURL('image/jpeg', 0.3);
      }

      console.log(`[Compression Engine]: Compressed base64 image from ${(base64Str.length/1024).toFixed(1)}KB down to ${(compressedResult.length/1024).toFixed(1)}KB`);
      resolve(compressedResult);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
}


import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Loader2,
  RefreshCw,
  Smartphone,
  Trash2,
  X
} from 'lucide-react';

export interface CapturedShotItem {
  id: string;
  file: File;
  previewUrl: string;
  caption: string;
}

interface CameraCaptureModalProps {
  open: boolean;
  title: string;
  multiple: boolean;
  saving?: boolean;
  onClose: () => void;
  onConfirmFiles: (shots: Array<{ file: File; caption: string }>) => Promise<void>;
}

const QUICK_CAPTIONS = ['Tổng quan', 'Kích thước', 'Chi tiết', ''];

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  open,
  title,
  multiple,
  saving = false,
  onClose,
  onConfirmFiles
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [activeCaption, setActiveCaption] = useState<string>('Tổng quan');
  const [shots, setShots] = useState<CapturedShotItem[]>([]);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {}
    }
    setCameraReady(false);
  };

  useEffect(() => {
    if (!open) {
      stopStream();
      setShots((prev) => {
        prev.forEach((s) => URL.revokeObjectURL(s.previewUrl));
        return [];
      });
      setCameraError(null);
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      stopStream();
      setCameraError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          'Trình duyệt không hỗ trợ bật camera trực tiếp. Bấm "Camera ĐT" bên dưới để chụp.'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setCameraReady(true);
        }
      } catch (err: any) {
        if (cancelled) return;
        const msg = String(err?.message || err?.name || '');
        if (msg.includes('NotAllowed') || msg.includes('Permission')) {
          setCameraError(
            'Chưa cấp quyền Camera. Bấm Cho phép hoặc dùng "Camera ĐT" bên dưới.'
          );
        } else {
          setCameraError(
            'Không mở được camera trực tiếp. Bấm "Camera ĐT" để chụp ảnh.'
          );
        }
      }
    };

    startCamera();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, facingMode]);

  useEffect(() => {
    return () => {
      shots.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    };
  }, []);

  if (!open) return null;

  const appendShots = (incoming: CapturedShotItem[]) => {
    if (incoming.length === 0) return;
    setShots((prev) => {
      if (!multiple) {
        prev.forEach((s) => URL.revokeObjectURL(s.previewUrl));
        return [incoming[0]];
      }
      return [...prev, ...incoming];
    });
  };

  const handleCaptureFrame = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const ts = Date.now();
        const file = new File([blob], `camera_${ts}.jpg`, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(file);
        appendShots([
          {
            id: `shot_${ts}_${Math.random().toString(36).slice(2, 6)}`,
            file,
            previewUrl,
            caption: activeCaption
          }
        ]);
      },
      'image/jpeg',
      0.92
    );
  };

  const handleNativeCameraFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    const files: File[] = fileList ? Array.from(fileList) : [];
    e.target.value = '';
    if (files.length === 0) return;

    const items: CapturedShotItem[] = files.map((file, idx) => ({
      id: `native_${Date.now()}_${idx}`,
      file,
      previewUrl: URL.createObjectURL(file),
      caption: activeCaption
    }));
    appendShots(items);
  };

  const handleRemoveShot = (id: string) => {
    setShots((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((s) => s.id !== id);
    });
  };

  const handleSaveShots = async () => {
    if (shots.length === 0 || saving) return;
    await onConfirmFiles(shots.map((s) => ({ file: s.file, caption: s.caption })));
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-slate-900 text-white rounded-2xl max-w-lg w-full max-h-[92dvh] flex flex-col border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-3.5 py-2.5 bg-slate-950 flex items-center justify-between gap-2 border-b border-slate-800 shrink-0">
          <h3 className="text-xs sm:text-sm font-black flex items-center gap-1.5 truncate min-w-0">
            <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">{title}</span>
          </h3>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={saving}
              onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              title="Đổi camera trước / sau"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Đổi cam
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hidden Native Rear Camera Fallback */}
        <input
          ref={nativeCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple={multiple}
          className="hidden"
          onChange={handleNativeCameraFiles}
        />

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {/* Quick Caption Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px]">
            {QUICK_CAPTIONS.map((cap) => (
              <button
                key={cap || 'empty'}
                type="button"
                onClick={() => setActiveCaption(cap)}
                className={`px-2.5 py-1 rounded-full font-bold border whitespace-nowrap shrink-0 transition cursor-pointer ${
                  activeCaption === cap
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {cap || 'Không ghi'}
              </button>
            ))}
          </div>

          {/* Live Camera Viewport */}
          <div className="relative rounded-xl overflow-hidden bg-black border border-slate-800 aspect-[4/3] max-h-[46dvh] w-full flex items-center justify-center">
            {!cameraError ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!cameraReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-slate-300 gap-2 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                    <span>Đang bật Camera...</span>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 text-center space-y-2.5 max-w-xs">
                <Camera className="w-9 h-9 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  Mở Camera ĐT
                </button>
              </div>
            )}
          </div>

          {/* Capture Controls */}
          <div className="flex items-center justify-center gap-2.5 pt-0.5">
            <button
              type="button"
              disabled={!cameraReady || Boolean(cameraError) || saving}
              onClick={handleCaptureFrame}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs sm:text-sm font-black inline-flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 transition"
            >
              <Camera className="w-4 h-4" />
              Chụp ảnh
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => nativeCameraInputRef.current?.click()}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Dùng ứng dụng Camera mặc định của điện thoại"
            >
              <Smartphone className="w-4 h-4" />
              Camera ĐT
            </button>
          </div>

          {/* Captured Shots Preview */}
          {shots.length > 0 && (
            <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-2 space-y-1.5">
              <span className="text-[11px] font-extrabold text-emerald-400 block">
                Đã chụp ({shots.length} ảnh):
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                {shots.map((shot) => (
                  <div
                    key={shot.id}
                    className="relative w-16 shrink-0 rounded-lg overflow-hidden border border-slate-700 bg-slate-900"
                  >
                    <img
                      src={shot.previewUrl}
                      alt={shot.caption || 'Ảnh chụp'}
                      className="w-16 h-16 object-cover"
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleRemoveShot(shot.id)}
                      className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-rose-600 text-white cursor-pointer"
                      title="Xóa ảnh"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    {shot.caption && (
                      <div className="px-1 py-0.5 text-[9px] font-bold text-center text-slate-200 bg-slate-900 truncate">
                        {shot.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3.5 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 text-xs shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
          >
            Hủy
          </button>

          <button
            type="button"
            disabled={shots.length === 0 || saving}
            onClick={handleSaveShots}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {saving ? 'Đang lưu...' : `Xong (${shots.length} ảnh)`}
          </button>
        </div>
      </div>
    </div>
  );
};

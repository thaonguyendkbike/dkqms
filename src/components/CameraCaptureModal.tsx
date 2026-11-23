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

const QUICK_CAPTIONS = ['Tổng quan', 'Kích thước', 'Giắc / Chi tiết', ''];

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
          'Trình duyệt không hỗ trợ bật camera trực tiếp trong trang. Anh hãy bấm nút "Camera mặc định ĐT" bên dưới để chụp nhé.'
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
            'Chưa cấp quyền Camera cho trình duyệt. Anh hãy bấm Cho phép quyền Camera hoặc dùng nút "Camera mặc định ĐT".'
          );
        } else {
          setCameraError(
            'Không mở được camera trực tiếp trên thiết bị này. Anh hãy bấm nút "Camera mặc định ĐT" để chụp ảnh.'
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
    <div className="fixed inset-0 z-[70] bg-slate-950/90 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 text-white rounded-t-2xl sm:rounded-2xl max-w-2xl w-full max-h-[96vh] flex flex-col border border-slate-700 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-950 flex items-center justify-between gap-2 border-b border-slate-800">
          <div className="min-w-0">
            <h3 className="text-sm font-black flex items-center gap-2 truncate">
              <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">{title}</span>
            </h3>
            <p className="text-[11px] text-slate-400 truncate">
              {multiple
                ? 'Chụp 1 hoặc nhiều góc liên tiếp rồi bấm Lưu ảnh'
                : 'Chế độ 1 ảnh — chụp xong bấm Lưu ảnh'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={saving}
              onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              title="Đổi camera trước / sau"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Đổi cam</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 cursor-pointer"
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
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3">
          {/* Quick Caption Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 font-bold mr-1">Chú thích:</span>
            {QUICK_CAPTIONS.map((cap) => (
              <button
                key={cap || 'empty'}
                type="button"
                onClick={() => setActiveCaption(cap)}
                className={`px-2.5 py-1 rounded-full font-bold border transition cursor-pointer ${
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
          <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 aspect-[4/3] flex items-center justify-center">
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
                    <span>Đang khởi động Camera...</span>
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 text-center space-y-3 max-w-sm">
                <Camera className="w-10 h-10 text-slate-500 mx-auto" />
                <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold inline-flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Smartphone className="w-4 h-4" />
                  Mở Camera mặc định ĐT
                </button>
              </div>
            )}
          </div>

          {/* Shutter + Native Camera Action */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={!cameraReady || Boolean(cameraError) || saving}
              onClick={handleCaptureFrame}
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-black inline-flex items-center gap-2 shadow-lg cursor-pointer active:scale-95 transition"
            >
              <Camera className="w-5 h-5" />
              Chụp ảnh
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => nativeCameraInputRef.current?.click()}
              className="px-3.5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              title="Mở ứng dụng Camera gốc của điện thoại (nét & có đèn Flash)"
            >
              <Smartphone className="w-4 h-4" />
              Camera ĐT
            </button>
          </div>

          {/* Captured Shots Preview */}
          {shots.length > 0 && (
            <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-2.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-emerald-400">
                  Đã chụp {shots.length} ảnh (chờ lưu):
                </span>
              </div>
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {shots.map((shot) => (
                  <div
                    key={shot.id}
                    className="relative w-20 shrink-0 rounded-xl overflow-hidden border border-slate-700 bg-slate-900"
                  >
                    <img
                      src={shot.previewUrl}
                      alt={shot.caption || 'Ảnh chụp'}
                      className="w-20 h-20 object-cover"
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleRemoveShot(shot.id)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white cursor-pointer"
                      title="Xóa ảnh vừa chụp"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    {shot.caption && (
                      <div className="px-1 py-0.5 text-[10px] font-bold text-center text-slate-200 bg-slate-900 truncate">
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
        <div className="px-4 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
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
            {saving ? 'Đang lưu ảnh...' : `Lưu ${shots.length} ảnh ngay`}
          </button>
        </div>
      </div>
    </div>
  );
};

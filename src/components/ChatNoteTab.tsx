import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Pin, PinOff, Trash2, Paperclip, Image, Send, Search, X, 
  File, Download, User, Building2, Users, Car, AlertCircle, CheckCircle2,
  Paperclip as FileIcon, Landmark, Smile, RefreshCw, ZoomIn, ZoomOut, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc, deleteDoc, collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { compressImageFile } from '../imageCompressor';
import { safeStorage as localStorage } from '../safeStorage';
import { QualityStaff, Supplier, Dealer, DKBikeModel, ChatNoteMessage } from '../types';

interface ChatNoteTabProps {
  staff: QualityStaff[];
  suppliers: Supplier[];
  dealers: Dealer[];
  models: DKBikeModel[];
  currentUser: { name: string; email: string; photoURL?: string };
}

export default function ChatNoteTab({
  staff,
  suppliers,
  dealers,
  models,
  currentUser
}: ChatNoteTabProps) {
  const [messages, setMessages] = useState<ChatNoteMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    size: string;
    type: 'image' | 'file';
    dataUrl: string;
  } | null>(null);

  // Connection & Offline State
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  // Mentions Autocomplete Popup State
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionTab, setMentionTab] = useState<'staff' | 'supplier' | 'dealer' | 'model'>('staff');
  const [cursorPosition, setCursorPosition] = useState(0);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Zoom & Pan states for image preview modal
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isDraggingZoom, setIsDraggingZoom] = useState(false);
  const zoomDragStart = useRef({ x: 0, y: 0 });
  const lastTouchDistance = useRef<number | null>(null);

  // Reset zoom & pan when image changes or closes
  useEffect(() => {
    setZoomScale(1);
    setZoomPosition({ x: 0, y: 0 });
    setIsDraggingZoom(false);
    lastTouchDistance.current = null;
  }, [previewImage]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Track online/offline
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch real-time chat messages from Firestore with offline fallback
  useEffect(() => {
    const chatCollection = collection(db, 'qms_chat_notes');
    const q = query(chatCollection, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: ChatNoteMessage[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as ChatNoteMessage);
      });
      setMessages(msgs);
      setFirebaseError(null);
      // Cache messages locally
      try {
        localStorage.setItem('dk_chat_notes_cache', JSON.stringify(msgs));
      } catch (e) {
        console.warn('Failed to cache chat messages to localStorage:', e);
      }
    }, (error) => {
      console.error('Firestore real-time subscription error:', error);
      setFirebaseError('Không thể đồng bộ thời gian thực từ Cloud. Đang chạy ở chế độ offline.');
      // Load from cache
      try {
        const cached = localStorage.getItem('dk_chat_notes_cache');
        if (cached) {
          setMessages(JSON.parse(cached));
        }
      } catch (e) {
        console.error('Failed to parse cached chat notes:', e);
      }
    });

    return () => unsubscribe();
  }, []);

  // Format File Size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Compress Image & File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processUploadedFile(file);
  };

  const processUploadedFile = async (file: File) => {
    setIsUploading(true);
    try {
      const isImage = file.type.startsWith('image/');
      
      if (isImage) {
        // High quality compression to ensure images are sharp and clear when clicked/zoomed: compressImageFile(file, 1200, 1200, 0.75)
        const compressedBase64 = await compressImageFile(file, 1200, 1200, 0.75);
        setAttachedFile({
          name: file.name,
          size: formatBytes(Math.round((compressedBase64.length * 3) / 4)), // approximate size from base64 length
          type: 'image',
          dataUrl: compressedBase64
        });
      } else {
        // Generic file rule: Read as Base64 but limit size to 300KB to stay within Firestore Limits
        if (file.size > 300 * 1024) {
          alert('Để đảm bảo hiệu năng cơ sở dữ liệu và giới hạn Firestore, dung lượng tệp đính kèm không vượt quá 300KB.');
          setIsUploading(false);
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          setAttachedFile({
            name: file.name,
            size: formatBytes(file.size),
            type: 'file',
            dataUrl: reader.result as string
          });
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Failed to process file:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Drag and Drop files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processUploadedFile(file);
    }
  };

  // Mentions parser for live text representation inside textbox
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);

    // Check for @ mention trigger
    const cursorPos = e.target.selectionStart;
    setCursorPosition(cursorPos);

    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos !== -1 && lastAtPos >= textBeforeCursor.length - 30) {
      // Show mentions if there are no spaces between the '@' and current cursor
      const partAfterAt = textBeforeCursor.substring(lastAtPos + 1);
      if (!partAfterAt.includes(' ')) {
        setShowMentions(true);
        setMentionSearch(partAfterAt.toLowerCase());
        return;
      }
    }
    setShowMentions(false);
  };

  // Insert selected mention into input box
  const selectMention = (name: string, category: 'staff' | 'supplier' | 'dealer' | 'model') => {
    if (!inputRef.current) return;

    const text = inputText;
    const pos = cursorPosition;
    const textBeforeCursor = text.substring(0, pos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos !== -1) {
      const beforeAt = text.substring(0, lastAtPos);
      const afterCursor = text.substring(pos);
      
      // Format: @[Tên thực thể]
      const newText = `${beforeAt}@${name} ${afterCursor}`;
      setInputText(newText);
      setShowMentions(false);

      // Reset focus back to textarea
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newCursorPos = lastAtPos + name.length + 2; // after the space
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 50);
    }
  };

  // Sending Chat message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newMessage: ChatNoteMessage = {
      id: messageId,
      text: inputText.trim(),
      senderName: currentUser.name,
      senderEmail: currentUser.email,
      senderPhoto: currentUser.photoURL || '',
      timestamp: Date.now(),
      isPinned: false,
      fileUrl: attachedFile?.dataUrl || undefined,
      fileName: attachedFile?.name || undefined,
      fileSize: attachedFile?.size || undefined,
      fileType: attachedFile?.type || undefined
    };

    // Optimistic UI state update
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setAttachedFile(null);

    // Save to Firestore with LocalStorage cache fallback
    try {
      const docRef = doc(db, 'qms_chat_notes', messageId);
      await setDoc(docRef, newMessage);
    } catch (err) {
      console.error('Failed to save message to cloud:', err);
      // Fallback: save to LocalStorage cache and mark as unsynced
      try {
        const cached = localStorage.getItem('dk_chat_notes_cache') || '[]';
        const msgs = JSON.parse(cached);
        msgs.push(newMessage);
        localStorage.setItem('dk_chat_notes_cache', JSON.stringify(msgs));
      } catch (e) {
        console.error('Failed to save to local cache:', e);
      }
    }
  };

  // Pin / Unpin message
  const handleTogglePin = async (msg: ChatNoteMessage) => {
    const updatedMsg = {
      ...msg,
      isPinned: !msg.isPinned,
      pinnedBy: !msg.isPinned ? currentUser.name : undefined
    };

    // Update locally first
    setMessages(prev => prev.map(m => m.id === msg.id ? updatedMsg : m));

    try {
      const docRef = doc(db, 'qms_chat_notes', msg.id);
      await setDoc(docRef, updatedMsg);
    } catch (err) {
      console.error('Failed to pin message on cloud:', err);
      try {
        const cached = localStorage.getItem('dk_chat_notes_cache') || '[]';
        const msgs = JSON.parse(cached).map((m: any) => m.id === msg.id ? updatedMsg : m);
        localStorage.setItem('dk_chat_notes_cache', JSON.stringify(msgs));
      } catch (e) {}
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm('Anh có chắc muốn xoá tin nhắn/ghi chú này không?')) return;

    // Remove locally
    setMessages(prev => prev.filter(m => m.id !== msgId));

    try {
      const docRef = doc(db, 'qms_chat_notes', msgId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Failed to delete message on cloud:', err);
      try {
        const cached = localStorage.getItem('dk_chat_notes_cache') || '[]';
        const msgs = JSON.parse(cached).filter((m: any) => m.id !== msgId);
        localStorage.setItem('dk_chat_notes_cache', JSON.stringify(msgs));
      } catch (e) {}
    }
  };

  // Get filtered lists of suggestions
  const getFilteredStaff = () => staff.filter(s => s.name.toLowerCase().includes(mentionSearch) || s.email.toLowerCase().includes(mentionSearch));
  const getFilteredSuppliers = () => suppliers.filter(s => s.name.toLowerCase().includes(mentionSearch));
  const getFilteredDealers = () => dealers.filter(d => d.name.toLowerCase().includes(mentionSearch) || d.address?.toLowerCase().includes(mentionSearch));
  const getFilteredModels = () => models.filter(m => m.name.toLowerCase().includes(mentionSearch));

  // Highlighting parser helper for rendering parsed message text safely in UI
  const parseAndHighlightMessage = (text: string) => {
    if (!text) return '';

    // Step 1: Collect all names from master lists, sort by length descending to match longest substrings first
    const staffNames = staff.map(s => s.name);
    const supplierNames = suppliers.map(s => s.name);
    const dealerNames = dealers.map(d => d.name);
    const modelNames = models.map(m => m.name);

    // Create a dictionary of term to type
    const termsMap: Record<string, 'staff' | 'supplier' | 'dealer' | 'model'> = {};
    staffNames.forEach(n => { termsMap[n] = 'staff'; });
    supplierNames.forEach(n => { termsMap[n] = 'supplier'; });
    dealerNames.forEach(n => { termsMap[n] = 'dealer'; });
    modelNames.forEach(n => { termsMap[n] = 'model'; });

    // Sort terms by length descending
    const sortedTerms = Object.keys(termsMap).sort((a, b) => b.length - a.length);

    if (sortedTerms.length === 0) return <span>{text}</span>;

    // Use a regex or simple split logic to find and highlight matches
    // Create a regex matching any of the sorted terms, including with prepended @ or directly
    const escapeRegex = (string: string) => string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regexParts = sortedTerms.map(term => `(?:@?${escapeRegex(term)})`);
    const regexPattern = new RegExp(`(${regexParts.join('|')})`, 'g');

    const parts = text.split(regexPattern);

    return (
      <>
        {parts.map((part, index) => {
          const strippedPart = part.startsWith('@') ? part.substring(1) : part;
          const matchedType = termsMap[strippedPart];

          if (matchedType) {
            let bgClass = '';
            let textClass = '';
            let icon: React.ReactNode = null;

            switch (matchedType) {
              case 'staff':
                bgClass = 'bg-blue-50 border border-blue-200 text-blue-700';
                textClass = 'font-bold';
                icon = <User className="w-3 h-3 inline mr-1" />;
                break;
              case 'supplier':
                bgClass = 'bg-emerald-50 border border-emerald-200 text-emerald-700';
                textClass = 'font-bold';
                icon = <Building2 className="w-3 h-3 inline mr-1" />;
                break;
              case 'dealer':
                bgClass = 'bg-amber-50 border border-amber-200 text-amber-700';
                textClass = 'font-bold';
                icon = <Users className="w-3 h-3 inline mr-1" />;
                break;
              case 'model':
                bgClass = 'bg-indigo-50 border border-indigo-200 text-indigo-700';
                textClass = 'font-bold';
                icon = <Car className="w-3 h-3 inline mr-1" />;
                break;
            }

            return (
              <span 
                key={index} 
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs mx-0.5 shadow-xs select-none ${bgClass} ${textClass}`}
              >
                {icon}
                {strippedPart}
              </span>
            );
          }

          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  // Bulletproof Base64 to Blob download trigger for iframe sandboxes
  const handleDownloadFile = (fileUrl: string, fileName: string) => {
    try {
      if (fileUrl.startsWith('data:')) {
        const parts = fileUrl.split(';base64,');
        if (parts.length === 2) {
          const contentType = parts[0].split(':')[1];
          const raw = window.atob(parts[1]);
          const rawLength = raw.length;
          const uInt8Array = new Uint8Array(rawLength);
          for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
          }
          const blob = new Blob([uInt8Array], { type: contentType });
          const blobUrl = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
          }, 150);
          return;
        }
      }
      
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
      }, 150);
    } catch (error) {
      console.error('Error during file download:', error);
      // Fallback
      window.open(fileUrl, '_blank');
    }
  };

  // Zoom & Pan handlers for full-screen preview
  const handleZoomIn = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoomScale(prev => Math.min(prev + 0.4, 6));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoomScale(prev => {
      const next = Math.max(prev - 0.4, 1);
      if (next === 1) {
        setZoomPosition({ x: 0, y: 0 }); // Reset position when at normal size
      }
      return next;
    });
  };

  const handleZoomReset = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoomScale(1);
    setZoomPosition({ x: 0, y: 0 });
  };

  const handleZoomMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (zoomScale <= 1) return;
    setIsDraggingZoom(true);
    zoomDragStart.current = {
      x: e.clientX - zoomPosition.x,
      y: e.clientY - zoomPosition.y
    };
  };

  const handleZoomMouseMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDraggingZoom || zoomScale <= 1) return;
    setZoomPosition({
      x: e.clientX - zoomDragStart.current.x,
      y: e.clientY - zoomDragStart.current.y
    });
  };

  const handleZoomMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingZoom(false);
  };

  // Mobile Touch Gestures
  const handleZoomTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 1) {
      if (zoomScale > 1) {
        setIsDraggingZoom(true);
        zoomDragStart.current = {
          x: e.touches[0].clientX - zoomPosition.x,
          y: e.touches[0].clientY - zoomPosition.y
        };
      }
    } else if (e.touches.length === 2) {
      setIsDraggingZoom(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = dist;
    }
  };

  const handleZoomTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 1 && isDraggingZoom && zoomScale > 1) {
      setZoomPosition({
        x: e.touches[0].clientX - zoomDragStart.current.x,
        y: e.touches[0].clientY - zoomDragStart.current.y
      });
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastTouchDistance.current !== null) {
        const delta = dist - lastTouchDistance.current;
        setZoomScale(prev => {
          const factor = delta > 0 ? 0.08 : -0.08;
          const next = Math.max(1, Math.min(prev + factor, 6));
          if (next === 1) {
            setZoomPosition({ x: 0, y: 0 });
          }
          return next;
        });
      }
      lastTouchDistance.current = dist;
    }
  };

  const handleZoomTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingZoom(false);
    lastTouchDistance.current = null;
  };

  const handleZoomDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (zoomScale > 1) {
      setZoomScale(1);
      setZoomPosition({ x: 0, y: 0 });
    } else {
      setZoomScale(2.5);
      setZoomPosition({ x: 0, y: 0 });
    }
  };

  // Message Search & Pin Filter
  const filteredMessages = messages.filter(msg => {
    const textMatch = msg.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      msg.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      msg.fileName?.toLowerCase().includes(searchQuery.toLowerCase());
    if (showPinnedOnly) {
      return textMatch && msg.isPinned;
    }
    return textMatch;
  });

  const pinnedMessages = messages.filter(m => m.isPinned);

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] bg-slate-50 rounded-xl border border-slate-200 shadow-sm overflow-hidden" id="chat_notes_module">
      
      {/* Header Panel */}
      <div className="bg-white border-b border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              Sổ tay Chat & Trao đổi nghiệp vụ QMS
              {isOffline && (
                <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                  Chế độ ngoại tuyến (Offline)
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              Ghi nhận các lưu ý chung, bài đăng nghiệp vụ và thảo luận bộ phận QLCL DKBike
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm nội dung, file..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-700"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              showPinnedOnly 
                ? 'bg-amber-50 border-amber-300 text-amber-700 shadow-xs' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Pin className={`w-3.5 h-3.5 ${showPinnedOnly ? 'fill-amber-600 text-amber-700' : ''}`} />
            <span>Ghim ({pinnedMessages.length})</span>
          </button>
        </div>
      </div>

      {/* Cloud Error warning banner */}
      {firebaseError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs font-semibold text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{firebaseError}</span>
        </div>
      )}

      {/* Main Board Space */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: Chat Feed */}
        <div 
          className={`flex-1 flex flex-col justify-between overflow-hidden relative ${isDragOver ? 'bg-indigo-50/50' : 'bg-slate-50'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragOver && (
            <div className="absolute inset-0 bg-indigo-950/20 backdrop-blur-xs flex items-center justify-center z-30 pointer-events-none">
              <div className="bg-white p-6 rounded-2xl shadow-xl border border-indigo-200 text-center flex flex-col items-center gap-3 animate-bounce">
                <Paperclip className="w-8 h-8 text-indigo-600" />
                <span className="text-sm font-extrabold text-indigo-900">Kéo thả để đính kèm File / Ảnh tại đây</span>
                <span className="text-xs text-slate-400">(Ảnh nén tự động dưới 30KB - File khác tối đa 300KB)</span>
              </div>
            </div>
          )}

          {/* Messages Feed View */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {filteredMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 p-10">
                <MessageSquare className="w-12 h-12 text-slate-300 stroke-[1.5]" />
                <p className="text-sm font-semibold">Chưa có tin nhắn hoặc ghi chú nào phù hợp.</p>
                <p className="text-xs text-slate-400">Anh có thể nhập và gửi thảo luận đầu tiên bên dưới.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Alert/Top tip inside chat */}
                <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100 flex items-start gap-3">
                  <span className="text-indigo-600 mt-0.5 text-base">💡</span>
                  <div className="text-xs text-indigo-950 leading-relaxed">
                    <strong className="font-extrabold text-indigo-900">Mẹo sử dụng:</strong> Gõ <strong className="font-mono text-indigo-700 bg-indigo-100/70 px-1 rounded">@</strong> để mở bảng lựa chọn thông minh. Hệ thống hỗ trợ nhắc tên (mention) <strong>Nhân sự</strong>, <strong>Nhà cung cấp</strong>, <strong>Đại lý / Khách hàng</strong>, và <strong>Dòng xe máy DKBike</strong> kèm theo huy hiệu màu tự động.
                  </div>
                </div>

                {filteredMessages.map((msg) => {
                  const isOwn = msg.senderEmail === currentUser.email;
                  const formattedTime = new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  const formattedDate = new Date(msg.timestamp).toLocaleDateString('vi-VN', {
                    day: 'numeric',
                    month: 'numeric'
                  });

                  return (
                    <motion.div 
                      key={msg.id}
                      id={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 max-w-[85%] ${isOwn ? 'ml-auto flex-row-reverse' : ''} transition-all duration-300 rounded-xl p-1`}
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 shrink-0 overflow-hidden flex items-center justify-center shadow-xs">
                        {msg.senderPhoto ? (
                          <img src={msg.senderPhoto} alt={msg.senderName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[11px] font-bold text-slate-600 uppercase">
                            {msg.senderName.substring(0, 2)}
                          </span>
                        )}
                      </div>

                      {/* Bubble */}
                      <div className="space-y-1">
                        {/* Meta */}
                        <div className={`flex items-center gap-2 text-[11px] text-slate-400 ${isOwn ? 'justify-end' : ''}`}>
                          <strong className="text-slate-700 font-bold">{msg.senderName}</strong>
                          <span>•</span>
                          <span>{formattedTime} ({formattedDate})</span>
                          {msg.isPinned && (
                            <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md border border-amber-200 font-bold text-[9px] flex items-center gap-0.5">
                              <Pin className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                              được ghim
                            </span>
                          )}
                        </div>

                        {/* Content Card */}
                        <div className={`p-3.5 rounded-2xl shadow-xs border transition-all text-sm leading-relaxed relative group ${
                          isOwn 
                            ? 'bg-indigo-600 border-indigo-700 text-white rounded-tr-none' 
                            : 'bg-white border-slate-200 text-slate-800 rounded-tl-none'
                        }`}>
                          {/* Pin & Delete Floating Actions for hovering */}
                          <div className={`absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 border border-slate-150 p-1 rounded-lg shadow-sm z-10 ${isOwn ? '-left-12 right-auto' : ''}`}>
                            <button 
                              onClick={() => handleTogglePin(msg)}
                              className={`p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer ${msg.isPinned ? 'text-amber-500' : 'text-slate-400'}`}
                              title={msg.isPinned ? "Bỏ ghim" : "Ghim tin nhắn này"}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                            {(isOwn || currentUser.email === 'thaonguyendkbike@gmail.com') && (
                              <button 
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1 rounded-md hover:bg-rose-50 text-rose-500 transition-colors cursor-pointer"
                                title="Xoá tin nhắn"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Message text with highlighting */}
                          <div className={isOwn ? 'text-white' : 'text-slate-800'}>
                            {isOwn ? <span>{msg.text}</span> : parseAndHighlightMessage(msg.text)}
                          </div>

                          {/* File / Image Attachment */}
                          {msg.fileUrl && (
                            <div className="mt-2.5 pt-2 border-t border-slate-100/10">
                              {msg.fileType === 'image' ? (
                                <div 
                                  className="relative group cursor-zoom-in rounded-lg overflow-hidden border border-slate-200/50 bg-slate-900/10"
                                  onClick={() => setPreviewImage(msg.fileUrl || null)}
                                >
                                  <img 
                                    src={msg.fileUrl} 
                                    alt={msg.fileName || 'Attached Photo'} 
                                    className="max-h-56 max-w-full object-contain rounded-lg"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                                    Click để phóng to
                                  </div>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => handleDownloadFile(msg.fileUrl!, msg.fileName!)}
                                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                    isOwn 
                                      ? 'bg-indigo-700/50 border-indigo-500 hover:border-indigo-400 text-indigo-50 hover:bg-indigo-700/80 active:bg-indigo-700' 
                                      : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-100 active:bg-slate-150'
                                  }`}
                                  title="Tải file xuống máy tính"
                                >
                                  <FileIcon className="w-4 h-4 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="truncate text-left">{msg.fileName}</p>
                                    <p className="text-[10px] text-slate-400 text-left">{msg.fileSize || 'N/A'}</p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0 bg-black/15 hover:bg-black/25 px-2 py-1 rounded-lg text-[10px] font-extrabold text-white">
                                    <span>Tải về</span>
                                    <Download className="w-3.5 h-3.5" />
                                  </div>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Autocomplete Mentions Box popup */}
          <AnimatePresence>
            {showMentions && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="absolute bottom-20 left-4 right-4 bg-white border border-slate-200 rounded-2xl shadow-2xl z-40 overflow-hidden flex flex-col max-h-64"
                id="mentions_autocomplete_box"
              >
                {/* Suggestions header tab select */}
                <div className="flex border-b border-slate-150 bg-slate-50 text-[11px] font-bold select-none overflow-x-auto shrink-0">
                  <button 
                    onClick={() => setMentionTab('staff')}
                    className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all cursor-pointer ${mentionTab === 'staff' ? 'border-blue-600 bg-white text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    Nhân Sự ({getFilteredStaff().length})
                  </button>
                  <button 
                    onClick={() => setMentionTab('supplier')}
                    className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all cursor-pointer ${mentionTab === 'supplier' ? 'border-emerald-600 bg-white text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                    <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                    Nhà Cung Cấp ({getFilteredSuppliers().length})
                  </button>
                  <button 
                    onClick={() => setMentionTab('dealer')}
                    className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all cursor-pointer ${mentionTab === 'dealer' ? 'border-amber-600 bg-white text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                    <Landmark className="w-3.5 h-3.5 text-amber-500" />
                    Khách Hàng/Đại Lý ({getFilteredDealers().length})
                  </button>
                  <button 
                    onClick={() => setMentionTab('model')}
                    className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 transition-all cursor-pointer ${mentionTab === 'model' ? 'border-indigo-600 bg-white text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                  >
                    <Car className="w-3.5 h-3.5 text-indigo-500" />
                    Dòng Xe Model ({getFilteredModels().length})
                  </button>
                </div>

                {/* Suggestions lists content */}
                <div className="flex-1 overflow-y-auto p-2">
                  
                  {mentionTab === 'staff' && (
                    <div className="space-y-1">
                      {getFilteredStaff().length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">Không tìm thấy nhân viên nào.</p>
                      ) : (
                        getFilteredStaff().map(s => (
                          <button 
                            key={s.id} 
                            onClick={() => selectMention(s.name, 'staff')}
                            className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl text-left text-xs transition-colors cursor-pointer"
                          >
                            <span className="font-bold text-slate-800 flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400" />
                              {s.name}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">{s.role}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {mentionTab === 'supplier' && (
                    <div className="space-y-1">
                      {getFilteredSuppliers().length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">Không tìm thấy nhà cung cấp nào.</p>
                      ) : (
                        getFilteredSuppliers().map(sup => (
                          <button 
                            key={sup.id} 
                            onClick={() => selectMention(sup.name, 'supplier')}
                            className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl text-left text-xs transition-colors cursor-pointer"
                          >
                            <span className="font-bold text-slate-800 flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-slate-400" />
                              {sup.name}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">{sup.id}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {mentionTab === 'dealer' && (
                    <div className="space-y-1">
                      {getFilteredDealers().length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">Không tìm thấy đại lý/khách hàng nào.</p>
                      ) : (
                        getFilteredDealers().map(dl => (
                          <button 
                            key={dl.id} 
                            onClick={() => selectMention(dl.name, 'dealer')}
                            className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl text-left text-xs transition-colors cursor-pointer"
                          >
                            <span className="font-bold text-slate-800 flex items-center gap-2">
                              <Landmark className="w-4 h-4 text-slate-400" />
                              {dl.name}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">{dl.address || 'DKBike Agent'}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {mentionTab === 'model' && (
                    <div className="space-y-1">
                      {getFilteredModels().length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">Không tìm thấy dòng xe nào.</p>
                      ) : (
                        getFilteredModels().map(m => (
                          <button 
                            key={m.id} 
                            onClick={() => selectMention(m.name, 'model')}
                            className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl text-left text-xs transition-colors cursor-pointer"
                          >
                            <span className="font-bold text-slate-800 flex items-center gap-2">
                              <Car className="w-4 h-4 text-slate-400" />
                              {m.name}
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">{m.id}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Panel Box */}
          <div className="bg-white border-t border-slate-200 p-4 shrink-0 flex flex-col gap-3">
            {/* Selected File Preview bubble */}
            {attachedFile && (
              <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-200 p-2.5 rounded-xl text-xs">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {attachedFile.type === 'image' ? <Image className="w-4 h-4 text-indigo-600 shrink-0" /> : <File className="w-4 h-4 text-indigo-600 shrink-0" />}
                  <span className="font-semibold text-slate-700 truncate">{attachedFile.name}</span>
                  <span className="text-slate-400 font-mono text-[10px]">({attachedFile.size})</span>
                </div>
                <button 
                  onClick={() => setAttachedFile(null)}
                  className="p-1 rounded-full hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer"
                  title="Huỷ đính kèm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Main Input Text Box Form */}
            <form onSubmit={handleSendMessage} className="flex gap-2 items-end">
              <div className="flex-1 relative bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-1 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all">
                <textarea
                  ref={inputRef}
                  placeholder="Gõ ý kiến thảo luận hoặc chú ý chung... Thêm file bằng cách kéo thả hoặc click icon đính kèm"
                  value={inputText}
                  onChange={handleInputChange}
                  className="w-full pl-4 pr-12 pt-3 pb-3 bg-transparent border-0 focus:outline-none focus:ring-0 text-xs text-slate-800 resize-none max-h-24 h-12"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />

                {/* Floating Attach trigger icon inside input */}
                <div className="absolute right-3 bottom-2 flex items-center gap-1 bg-transparent">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                    title="Đính kèm Ảnh / Tài liệu"
                  >
                    {isUploading ? <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" /> : <Paperclip className="w-4 h-4" />}
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden" 
                    accept="image/*, .pdf, .xls, .xlsx, .doc, .docx, .txt"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={!inputText.trim() && !attachedFile}
                className="p-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl transition-all cursor-pointer shadow-xs disabled:shadow-none"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Ghim Chú Ý Sidebar */}
        <div className="hidden lg:flex w-80 border-l border-slate-200 bg-white flex-col shrink-0 overflow-hidden">
          <div className="p-4 border-b border-slate-150 flex items-center justify-between bg-slate-50 shrink-0">
            <h3 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              Chú ý chung & Ghim ({pinnedMessages.length})
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {pinnedMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 gap-2 py-10">
                <Pin className="w-8 h-8 text-slate-300" />
                <p className="text-xs font-semibold">Chưa có tin ghim nào.</p>
                <p className="text-[10px] text-slate-400 max-w-[180px] leading-relaxed">
                  Hover vào tin nhắn trong cuộc hội thoại và click biểu tượng ghim để ghim các chú ý chung.
                </p>
              </div>
            ) : (
              pinnedMessages.map(msg => (
                <div 
                  key={msg.id} 
                  className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/55 hover:bg-amber-50 transition-colors shadow-xs relative group cursor-pointer"
                  onClick={() => {
                    // Try to scroll to message
                    const element = document.getElementById(msg.id);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      // Add a prominent flash highlight ring to the target message
                      element.classList.add('ring-4', 'ring-amber-400', 'ring-offset-2', 'scale-[1.02]');
                      setTimeout(() => {
                        element.classList.remove('ring-4', 'ring-amber-400', 'ring-offset-2', 'scale-[1.02]');
                      }, 2000);
                    }
                  }}
                >
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePin(msg);
                    }}
                    className="absolute top-2.5 right-2.5 p-1 rounded hover:bg-amber-100 text-amber-600 cursor-pointer"
                    title="Bỏ ghim"
                  >
                    <PinOff className="w-3 h-3" />
                  </button>

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                    <strong className="text-slate-700 font-bold">{msg.senderName}</strong>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleDateString('vi-VN')}</span>
                  </div>

                  <p className="text-xs text-slate-800 line-clamp-3 leading-relaxed mb-1.5">
                    {msg.text}
                  </p>

                  {/* Attachment indicator inside pin item */}
                  {msg.fileName && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700">
                      {msg.fileType === 'image' ? <Image className="w-3 h-3 shrink-0" /> : <File className="w-3 h-3 shrink-0" />}
                      <span className="truncate">{msg.fileName}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Full-Screen Image Zoom / Interactive Modal Preview */}
      <AnimatePresence>
        {previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md flex flex-col justify-between z-50 overflow-hidden touch-none select-none"
            onClick={() => setPreviewImage(null)}
          >
            {/* Top Toolbar overlay (stops event bubbling so users don't close when tapping buttons) */}
            <div 
              className="w-full bg-gradient-to-b from-black/75 to-transparent px-4 pt-6 pb-12 flex items-center justify-between z-55 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-white text-xs font-semibold max-w-[50%] truncate flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Xem ảnh chất lượng cao</span>
              </div>

              {/* Central control buttons */}
              <div className="flex items-center gap-1.5 sm:gap-3">
                <button
                  onClick={handleZoomIn}
                  className="p-2 sm:p-2.5 bg-white/10 hover:bg-white/15 active:bg-white/20 text-white rounded-xl shadow-xs flex items-center gap-1 font-bold text-xs cursor-pointer transition-colors"
                  title="Phóng to"
                >
                  <ZoomIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Phóng to ({Math.round(zoomScale * 100)}%)</span>
                </button>
                <button
                  onClick={handleZoomOut}
                  disabled={zoomScale <= 1}
                  className="p-2 sm:p-2.5 bg-white/10 hover:bg-white/15 active:bg-white/20 disabled:opacity-40 text-white rounded-xl shadow-xs flex items-center gap-1 font-bold text-xs cursor-pointer transition-colors"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Thu nhỏ</span>
                </button>
                <button
                  onClick={handleZoomReset}
                  className="p-2 sm:p-2.5 bg-white/10 hover:bg-white/15 active:bg-white/20 text-white rounded-xl shadow-xs flex items-center gap-1 font-bold text-xs cursor-pointer transition-colors"
                  title="Đặt lại"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="hidden sm:inline">Đặt lại (100%)</span>
                </button>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setPreviewImage(null)}
                className="bg-rose-600 hover:bg-rose-700 p-2 rounded-xl text-white cursor-pointer shadow-md transition-colors"
                title="Đóng (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Middle Main interactive canvas area */}
            <div className="flex-1 w-full flex items-center justify-center overflow-hidden relative touch-none">
              <motion.img 
                src={previewImage} 
                alt="Interactive Zoomed Preview" 
                style={{
                  transform: `translate(${zoomPosition.x}px, ${zoomPosition.y}px) scale(${zoomScale})`,
                  cursor: zoomScale > 1 ? (isDraggingZoom ? 'grabbing' : 'grab') : 'zoom-in',
                  transition: isDraggingZoom ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
                className="max-h-[85vh] max-w-[95vw] object-contain rounded-lg shadow-2xl select-none pointer-events-auto" 
                onMouseDown={handleZoomMouseDown}
                onMouseMove={handleZoomMouseMove}
                onMouseUp={handleZoomMouseUp}
                onMouseLeave={handleZoomMouseUp}
                onTouchStart={handleZoomTouchStart}
                onTouchMove={handleZoomTouchMove}
                onTouchEnd={handleZoomTouchEnd}
                onDoubleClick={handleZoomDoubleTap}
                onClick={(e) => e.stopPropagation()} // stop close modal trigger from image clicks
              />
            </div>

            {/* Bottom floating hint labels */}
            <div className="w-full flex justify-center pb-6 z-55 pointer-events-none relative">
              <span className="px-4 py-2 rounded-full bg-black/60 text-slate-300 text-xs font-bold tracking-wide select-none shadow-md backdrop-blur-xs">
                {zoomScale > 1 
                  ? "Kéo 1 ngón để Di chuyển • Vuốt 2 ngón để Phóng to / Thu nhỏ • Nhấp đúp để Đặt lại"
                  : "Vuốt 2 ngón hoặc Nhấp đúp để Phóng to"
                }
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

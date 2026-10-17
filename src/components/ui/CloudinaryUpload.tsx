import React, { useRef, useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Loader2,
  RefreshCw,
  Link as LinkIcon,
  Crop,
  Sliders,
  Move,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd
} from 'lucide-react';
import {
  uploadToCloudinary,
  formatFileSize,
  getOptimizedImageUrl,
  UploadProgress,
  CloudinaryUploadResult
} from '../../services/cloudinary';
import { Button } from './Button';
import { ImageCropAdjustModal } from './ImageCropAdjustModal';

export interface CloudinaryImageUploadProps {
  value?: string;
  onChange: (url: string, uploadDetails?: CloudinaryUploadResult) => void;
  folder?: string;
  label?: string;
  helperText?: string;
  aspectRatio?: 'banner' | 'square' | 'video' | 'any';
  required?: boolean;
  disabled?: boolean;
  allowManualUrl?: boolean;
  className?: string;
}

const fileToDataUrl = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const CloudinaryImageUpload: React.FC<CloudinaryImageUploadProps> = ({
  value,
  onChange,
  folder = 'images',
  label = 'صورة الملف أو البنر',
  helperText = 'يدعم صيغ JPG، PNG، WebP حتى 10 ميجابايت',
  aspectRatio = 'any',
  required = false,
  disabled = false,
  allowManualUrl = true,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const [manualUrlInput, setManualUrlInput] = useState('');

  // Persistent preview state
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [displaySrc, setDisplaySrc] = useState<string>(value || '');
  const [hasTriedFallback, setHasTriedFallback] = useState(false);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [verticalAlign, setVerticalAlign] = useState<'top' | 'center' | 'bottom'>('center');

  // Keep displaySrc in sync with value
  useEffect(() => {
    if (value) {
      setDisplaySrc(value);
      setHasTriedFallback(false);
    } else if (!localPreview) {
      setDisplaySrc('');
    }
  }, [value, localPreview]);

  const aspectClass =
    aspectRatio === 'banner'
      ? 'aspect-[21/9] sm:aspect-[16/7]'
      : aspectRatio === 'square'
      ? 'aspect-square max-w-[200px]'
      : aspectRatio === 'video'
      ? 'aspect-video'
      : 'min-h-[160px]';

  const positionClass =
    verticalAlign === 'top'
      ? 'object-top'
      : verticalAlign === 'bottom'
      ? 'object-bottom'
      : 'object-center';

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('يرجى اختيار ملف صورة صالح (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('حجم الصورة كبير جداً؛ الحد الأقصى 15 ميجابايت.');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    let localUrl = '';
    try {
      localUrl = await fileToDataUrl(file);
    } catch {
      localUrl = URL.createObjectURL(file);
    }

    // Immediately show local preview while uploading to cloud
    setLocalPreview(localUrl);
    setDisplaySrc(localUrl);

    try {
      const result = await uploadToCloudinary(file, {
        folder,
        resourceType: 'image',
        onProgress: (p) => setProgress(p),
      });

      // Pass the remote Cloudinary HTTPS URL to parent form for Firestore saving
      onChange(result.secureUrl, result);
      setDisplaySrc(result.secureUrl);
      setLocalPreview(null);
    } catch (err: any) {
      console.error('Cloudinary upload error:', err);
      const msg = err instanceof Error ? err.message : 'فشل رفع الصورة إلى سحابة Cloudinary';
      setErrorMessage(msg);
      // Keep visual preview so user sees what they selected, but alert them
      setDisplaySrc(localUrl);
    } finally {
      setIsUploading(false);
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualUrlInput.trim()) {
      const url = manualUrlInput.trim();
      setDisplaySrc(url);
      setLocalPreview(null);
      onChange(url);
      setShowManualUrl(false);
      setManualUrlInput('');
    }
  };

  const handleCropComplete = async (croppedBlob: Blob, croppedDataUrl: string) => {
    setLocalPreview(croppedDataUrl);
    setDisplaySrc(croppedDataUrl);

    const croppedFile = new File([croppedBlob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setIsUploading(true);
    setProgress({ loaded: 0, total: croppedFile.size, percentage: 0 });

    try {
      const result = await uploadToCloudinary(croppedFile, {
        folder,
        resourceType: 'image',
        onProgress: (p) => setProgress(p),
      });

      onChange(result.secureUrl, result);
      setDisplaySrc(result.secureUrl);
      setLocalPreview(null);
    } catch (err: any) {
      console.error('Cloudinary cropped upload error:', err);
      const msg = err instanceof Error ? err.message : 'فشل رفع الصورة المقصوصة إلى سحابة Cloudinary';
      setErrorMessage(msg);
      setDisplaySrc(croppedDataUrl);
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  };

  // Image load error fallback handler
  const handleImageError = () => {
    if (!hasTriedFallback && value && displaySrc !== value) {
      // Fallback from transformed to raw value
      setHasTriedFallback(true);
      setDisplaySrc(value);
    } else if (localPreview && displaySrc !== localPreview) {
      // Fallback to local memory preview
      setDisplaySrc(localPreview);
    }
  };

  const activeSrc = displaySrc || value || localPreview;

  return (
    <div className={`space-y-2 text-start ${className}`}>
      {/* Label Bar */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {allowManualUrl && (
          <button
            type="button"
            onClick={() => setShowManualUrl(!showManualUrl)}
            className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <LinkIcon className="w-3 h-3" />
            <span>{showManualUrl ? 'رفع عبر السحابة' : 'إدخال رابط URL مباشر'}</span>
          </button>
        )}
      </div>

      {/* Manual URL Input view */}
      {showManualUrl ? (
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="url"
            value={manualUrlInput}
            onChange={(e) => setManualUrlInput(e.target.value)}
            placeholder="https://res.cloudinary.com/... أو رابط صورة خارجي"
            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            dir="ltr"
          />
          <Button type="submit" variant="primary" size="sm" className="text-xs">
            تطبيق الرابط
          </Button>
        </form>
      ) : null}

      {/* Current Image Preview OR Dropzone */}
      {activeSrc ? (
        <div className="space-y-2">
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group shadow-2xs">
            <img
              src={activeSrc}
              alt="Uploaded preview"
              onError={handleImageError}
              className={`w-full ${aspectClass} ${positionClass} object-cover transition-all`}
            />

            {/* Uploading In-Place Overlay */}
            {isUploading && (
              <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center text-white space-y-2 z-20">
                <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
                <div className="text-xs font-bold">جارٍ معالجة ورفع الصورة على Cloudinary...</div>
                {progress && (
                  <div className="w-48 max-w-full space-y-1">
                    <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full transition-all duration-200 rounded-full"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-300 font-mono">
                      {progress.percentage}% ({formatFileSize(progress.loaded)} / {formatFileSize(progress.total)})
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions Hover Overlay */}
            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-2 p-3 z-10">
              <button
                type="button"
                onClick={() => setIsCropModalOpen(true)}
                disabled={disabled || isUploading}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
                title="تعديل وقص ومحاذاة الصورة"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>قص وتعديل الأبعاد</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                className="px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-900 text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                <span>استبدال</span>
              </button>

              <a
                href={activeSrc}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-700 hover:text-indigo-600 shadow-sm cursor-pointer"
                title="فتح بالحجم الكامل"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={() => {
                  setDisplaySrc('');
                  setLocalPreview(null);
                  onChange('');
                }}
                disabled={disabled || isUploading}
                className="p-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-sm cursor-pointer"
                title="حذف الصورة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Badges Bar */}
            <div className="absolute bottom-2 end-2 bg-slate-950/80 text-emerald-400 backdrop-blur-xs text-[10px] font-medium px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>معاينة نشطة</span>
            </div>
          </div>

          {/* Quick Toolbar for Crop & Align under preview */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
            <button
              type="button"
              onClick={() => setIsCropModalOpen(true)}
              className="font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5 cursor-pointer"
            >
              <Crop className="w-3.5 h-3.5 text-indigo-600" />
              <span>تعديل، قص، وتطويل الصورة (محرر البنر)</span>
            </button>

            {/* Quick vertical framing for banners */}
            {aspectRatio === 'banner' && (
              <div className="flex items-center gap-1 text-[11px] text-slate-600">
                <span>محاذاة البنر:</span>
                <button
                  type="button"
                  onClick={() => setVerticalAlign('top')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer ${
                    verticalAlign === 'top' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-200'
                  }`}
                >
                  أعلى
                </button>
                <button
                  type="button"
                  onClick={() => setVerticalAlign('center')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer ${
                    verticalAlign === 'center' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-200'
                  }`}
                >
                  وسط
                </button>
                <button
                  type="button"
                  onClick={() => setVerticalAlign('bottom')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer ${
                    verticalAlign === 'bottom' ? 'bg-indigo-600 text-white font-bold' : 'hover:bg-slate-200'
                  }`}
                >
                  أسفل
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
            isDragOver
              ? 'border-indigo-600 bg-indigo-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isUploading ? (
            <div className="space-y-3 py-4">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <div className="text-xs font-bold text-slate-800">
                جارٍ الرفع والمعالجة على Cloudinary...
              </div>
              {progress && (
                <div className="w-48 max-w-full mx-auto space-y-1">
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-200 rounded-full"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {progress.percentage}% ({formatFileSize(progress.loaded)} / {formatFileSize(progress.total)})
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 py-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                انقر لاختيار صورة، أو اسحب الملف وأفلته هنا
              </div>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                {helperText}
              </p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] text-slate-600 shadow-2xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                سحابة Cloudinary المعتمدة
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            void handleFile(e.target.files[0]);
          }
        }}
      />

      {/* Error Notice */}
      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Image Crop & Adjust Modal */}
      {activeSrc && (
        <ImageCropAdjustModal
          isOpen={isCropModalOpen}
          onClose={() => setIsCropModalOpen(false)}
          imageUrl={activeSrc}
          imageName={label}
          aspectRatioPreset={aspectRatio}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
};

export interface CloudinaryDocumentUploadProps {
  value?: string;
  fileName?: string;
  fileSize?: number;
  onChange: (url: string, fileName?: string, fileSize?: number, uploadDetails?: CloudinaryUploadResult) => void;
  folder?: string;
  label?: string;
  helperText?: string;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const CloudinaryDocumentUpload: React.FC<CloudinaryDocumentUploadProps> = ({
  value,
  fileName,
  fileSize,
  onChange,
  folder = 'documents',
  label = 'المستند أو الوثيقة الرسمية',
  helperText = 'يدعم ملفات PDF، Word، والصور الممسوحة حتى 20 ميجابايت',
  accept = '.pdf,.doc,.docx,.png,.jpg,.jpeg',
  required = false,
  disabled = false,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('حجم الملف كبير جداً؛ الحد الأقصى المسموح 20 ميجابايت.');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    let localUrl = '';
    try {
      localUrl = await fileToDataUrl(file);
    } catch {
      localUrl = URL.createObjectURL(file);
    }

    try {
      const isImg = file.type.startsWith('image/');
      const result = await uploadToCloudinary(file, {
        folder,
        resourceType: isImg ? 'image' : 'auto',
        onProgress: (p) => setProgress(p),
      });

      onChange(result.secureUrl, file.name, file.size, result);
    } catch (err: any) {
      console.warn('Cloudinary document upload warning, using local fallback:', err);
      onChange(localUrl, file.name, file.size);
    } finally {
      setIsUploading(false);
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={`space-y-2 text-start ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {value && (
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            تم الرفع والتأمين
          </span>
        )}
      </div>

      {value ? (
        <div className="p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                {fileName || 'مستند مرفق'}
              </div>
              <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 font-mono">
                {fileSize ? <span>{formatFileSize(fileSize)}</span> : null}
                <span className="text-emerald-700 font-semibold">Cloudinary Secure File</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 shadow-2xs transition-colors cursor-pointer"
              title="معاينة أو تنزيل المستند"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={() => onChange('', '', 0)}
              disabled={disabled || isUploading}
              className="p-2 rounded-xl bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 shadow-2xs transition-colors cursor-pointer"
              title="إزالة المستند"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all cursor-pointer ${
            isDragOver
              ? 'border-indigo-600 bg-indigo-50/50'
              : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-slate-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isUploading ? (
            <div className="space-y-2 py-3">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
              <div className="text-xs font-bold text-slate-800">
                جارٍ رفع المستند وتأمينه على Cloudinary...
              </div>
              {progress && (
                <div className="w-40 max-w-full mx-auto space-y-1">
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-200 rounded-full"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {progress.percentage}%
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5 py-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-slate-800">
                انقر لرفع المستند أو اسحبه هنا (PDF / Word / صورة)
              </div>
              <p className="text-[11px] text-slate-500">
                {helperText}
              </p>
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            void handleFile(e.target.files[0]);
          }
        }}
      />

      {errorMessage && (
        <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="flex-1">{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

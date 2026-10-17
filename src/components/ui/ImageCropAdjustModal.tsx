import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  X,
  RefreshCw,
  Move,
  Layers,
  Sparkles,
  Eye,
  Sliders,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyEnd
} from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ImageCropAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  imageName?: string;
  aspectRatioPreset?: 'banner' | 'square' | 'video' | 'any';
  onCropComplete: (croppedBlob: Blob, croppedDataUrl: string) => void;
}

type AspectRatioOption = {
  id: string;
  label: string;
  ratio: number | null; // width / height, or null for free
  description: string;
};

const ASPECT_RATIOS: AspectRatioOption[] = [
  { id: 'banner-wide', label: 'بنر فائق العرض (21:9)', ratio: 21 / 9, description: 'المثالي لغلاف المعهد والبنرات الرئيسية العريضة' },
  { id: 'banner-standard', label: 'بنر قياسي (16:9)', ratio: 16 / 9, description: 'متوافق مع معظم الشاشات وبطاقات العرض' },
  { id: 'square', label: 'شعار مربع (1:1)', ratio: 1, description: 'مخصص لشعار المؤسسة، الأيقونات، وصور الملف الشخصي' },
  { id: 'card', label: 'بطاقة تعليمية (4:3)', ratio: 4 / 3, description: 'مناسب لصور البرامج والدورات التدريبية' },
  { id: 'free', label: 'حر / بدون قيود', ratio: null, description: 'تحديد حر بدون نسبة أبعاد ثابتة' },
];

export const ImageCropAdjustModal: React.FC<ImageCropAdjustModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  imageName = 'image',
  aspectRatioPreset = 'banner',
  onCropComplete,
}) => {
  // Determine initial ratio based on preset
  const defaultRatioOption =
    aspectRatioPreset === 'banner'
      ? ASPECT_RATIOS[0]
      : aspectRatioPreset === 'square'
      ? ASPECT_RATIOS[2]
      : aspectRatioPreset === 'video'
      ? ASPECT_RATIOS[1]
      : ASPECT_RATIOS[0];

  const [selectedRatio, setSelectedRatio] = useState<AspectRatioOption>(defaultRatioOption);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0); // in percentage [-100, 100]
  const [panY, setPanY] = useState(0); // in percentage [-100, 100]
  const [rotation, setRotation] = useState(0); // in degrees: 0, 90, 180, 270
  const [flipH, setFlipH] = useState(false);
  const [previewTab, setPreviewTab] = useState<'editor' | 'live-context'>('editor');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; initialPanX: number; initialPanY: number }>({
    x: 0,
    y: 0,
    initialPanX: 0,
    initialPanY: 0,
  });

  // Reset transforms whenever modal opens with new image or preset
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPanX(0);
      setPanY(0);
      setRotation(0);
      setFlipH(false);
      setImageLoaded(false);
      setSelectedRatio(defaultRatioOption);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageObjRef.current = img;
        setImageLoaded(true);
      };
      img.onerror = () => {
        // Fallback without crossOrigin if CORS issues occur
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          imageObjRef.current = fallbackImg;
          setImageLoaded(true);
        };
        fallbackImg.src = imageUrl;
      };
      img.src = imageUrl;
    }
  }, [isOpen, imageUrl, defaultRatioOption]);

  // Draw on Canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const containerWidth = 640;
    const ratio = selectedRatio.ratio || 16 / 9;
    const containerHeight = Math.round(containerWidth / ratio);

    canvas.width = containerWidth;
    canvas.height = containerHeight;

    // Clear background
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    // Center point
    ctx.translate(canvas.width / 2, canvas.height / 2);

    // Apply Rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Apply Flip
    if (flipH) {
      ctx.scale(-1, 1);
    }

    // Determine scale to cover the target canvas
    // Accounting for rotation: if rotated 90 or 270, swap dimensions
    const isRotated90or270 = rotation % 180 !== 0;
    const imgEffectiveWidth = isRotated90or270 ? img.height : img.width;
    const imgEffectiveHeight = isRotated90or270 ? img.width : img.height;

    const scaleX = canvas.width / imgEffectiveWidth;
    const scaleY = canvas.height / imgEffectiveHeight;
    const baseScale = Math.max(scaleX, scaleY);
    const finalScale = baseScale * zoom;

    // Calculate Pan offsets in canvas pixels
    const maxPanX = (imgEffectiveWidth * finalScale - canvas.width) / 2;
    const maxPanY = (imgEffectiveHeight * finalScale - canvas.height) / 2;
    const currentPanXPx = (panX / 100) * (maxPanX > 0 ? maxPanX : canvas.width * 0.4);
    const currentPanYPx = (panY / 100) * (maxPanY > 0 ? maxPanY : canvas.height * 0.4);

    // Draw the image centered with pan offset
    const drawWidth = img.width * finalScale;
    const drawHeight = img.height * finalScale;

    ctx.drawImage(
      img,
      -drawWidth / 2 + currentPanXPx,
      -drawHeight / 2 + currentPanYPx,
      drawWidth,
      drawHeight
    );

    ctx.restore();

    // Subtle framing grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    // Thirds vertical
    ctx.beginPath();
    ctx.moveTo(canvas.width / 3, 0);
    ctx.lineTo(canvas.width / 3, canvas.height);
    ctx.moveTo((canvas.width * 2) / 3, 0);
    ctx.lineTo((canvas.width * 2) / 3, canvas.height);
    // Thirds horizontal
    ctx.moveTo(0, canvas.height / 3);
    ctx.lineTo(canvas.width, canvas.height / 3);
    ctx.moveTo(0, (canvas.height * 2) / 3);
    ctx.lineTo(canvas.width, (canvas.height * 2) / 3);
    ctx.stroke();
  }, [imageLoaded, selectedRatio, zoom, panX, panY, rotation, flipH]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Dragging handling on canvas
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: panX,
      initialPanY: panY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    // Invert X because of RTL or canvas translation
    const sensitivity = 0.5;
    const newPanX = Math.max(-100, Math.min(100, dragStartRef.current.initialPanX + deltaX * sensitivity));
    const newPanY = Math.max(-100, Math.min(100, dragStartRef.current.initialPanY + deltaY * sensitivity));

    setPanX(Math.round(newPanX));
    setPanY(Math.round(newPanY));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Quick alignment helpers for banners/logos
  const setQuickVerticalAlign = (pos: 'top' | 'center' | 'bottom') => {
    if (pos === 'top') setPanY(60);
    else if (pos === 'center') setPanY(0);
    else if (pos === 'bottom') setPanY(-60);
  };

  // Export cropped image
  const handleApplyCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Export with high quality
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        onCropComplete(blob, dataUrl);
        onClose();
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تعديل وقص ومحاذاة الصورة"
      description="اضبط موضع البنر أو الشعار، وقص الأبعاد بدقة لضمان ظهور الصورة بأفضل شكل على المنصة."
      maxWidth="3xl"
    >
      <div className="space-y-5 text-start">
        {/* Aspect Ratio Selector Pills */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            نسبة الأبعاد ومقاس العرض (Aspect Ratio):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {ASPECT_RATIOS.map((item) => {
              const isSelected = selectedRatio.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedRatio(item)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-start transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className="font-bold">{item.label}</span>
                  <span className="text-[10px] text-slate-500 line-clamp-1 mt-1 font-normal">
                    {item.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* View Tabs: Editor vs Live Context */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setPreviewTab('editor')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                previewTab === 'editor'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Crop className="w-3.5 h-3.5" />
              <span>مساحة القص والتحريك</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('live-context')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                previewTab === 'live-context'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              <span>معاينة حية في واجهة المعهد</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Move className="w-3.5 h-3.5 text-slate-400" />
            <span>يمكنك سحب الصورة مباشرة بالفأرة لتحريك موضعها</span>
          </div>
        </div>

        {/* Main Canvas Workspace */}
        {previewTab === 'editor' ? (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center p-2 min-h-[260px]">
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className={`max-w-full max-h-[380px] rounded-xl shadow-2xl cursor-grab transition-opacity ${
                  isDragging ? 'cursor-grabbing' : ''
                } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                style={{ touchAction: 'none' }}
              />

              {!imageLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-xs">جارٍ تهيئة الصورة في مساحة العمل...</span>
                </div>
              )}

              {/* Floating Quick Badges */}
              <div className="absolute bottom-4 end-4 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-2">
                <span>التكبير: {Math.round(zoom * 100)}%</span>
                <span>•</span>
                <span>الموضع: X={panX}% Y={panY}%</span>
              </div>
            </div>

            {/* Adjustment Controls Bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Zoom Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <ZoomIn className="w-3.5 h-3.5 text-indigo-600" />
                      <span>التكبير (Zoom)</span>
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">{Math.round(zoom * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                      className="p-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                      title="تصغير"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="flex-1 accent-indigo-600 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                      className="p-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                      title="تكبير"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Vertical Pan (Height/Length Offset) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Move className="w-3.5 h-3.5 text-indigo-600" />
                      <span>الموضع الرأسي (تطويل/إزاحة للأعلى والأسفل)</span>
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">{panY}%</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="2"
                    value={panY}
                    onChange={(e) => setPanY(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>تركيز للأسفل</span>
                    <span>في المنتصف</span>
                    <span>تركيز للأعلى</span>
                  </div>
                </div>

                {/* Horizontal Pan */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                      <span>الموضع الأفقي (يمين / يسار)</span>
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">{panX}%</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="2"
                    value={panX}
                    onChange={(e) => setPanX(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>إزاحة لليمين</span>
                    <span>في المنتصف</span>
                    <span>إزاحة لليسار</span>
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">محاذاة سريعة للبنر:</span>
                  <button
                    type="button"
                    onClick={() => setQuickVerticalAlign('top')}
                    className="px-2.5 py-1 bg-white border border-slate-200 hover:border-indigo-400 rounded-lg text-xs text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <AlignVerticalJustifyStart className="w-3 h-3 text-indigo-600" />
                    <span>أعلى</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickVerticalAlign('center')}
                    className="px-2.5 py-1 bg-white border border-slate-200 hover:border-indigo-400 rounded-lg text-xs text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <AlignVerticalJustifyCenter className="w-3 h-3 text-indigo-600" />
                    <span>وسط</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickVerticalAlign('bottom')}
                    className="px-2.5 py-1 bg-white border border-slate-200 hover:border-indigo-400 rounded-lg text-xs text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <AlignVerticalJustifyEnd className="w-3 h-3 text-indigo-600" />
                    <span>أسفل</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs flex items-center gap-1 cursor-pointer"
                    title="تدوير 90 درجة مع عقارب الساعة"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>تدوير 90°</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlipH(!flipH)}
                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer ${
                      flipH ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title="عكس أفقي"
                  >
                    <span>عكس أفقي</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(1);
                      setPanX(0);
                      setPanY(0);
                      setRotation(0);
                      setFlipH(false);
                    }}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 text-xs flex items-center gap-1 cursor-pointer"
                    title="إعادة تعيين كافة التعديلات"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>إعادة ضبط</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Live Mockup Simulation View */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>محاكاة شكل البنر والغلاف في صفحة تعريف المعهد:</span>
              </div>

              {/* Simulated Institute Header */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
                <div
                  className="h-36 sm:h-44 bg-slate-900 relative p-4 flex items-end justify-between overflow-hidden"
                  style={{
                    backgroundImage: canvasRef.current ? `url(${canvasRef.current.toDataURL()})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="relative z-10 text-white space-y-1">
                    <span className="text-[10px] bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-md font-medium">
                      المؤسسة التعليمية المعتمدة
                    </span>
                    <h4 className="text-sm sm:text-base font-bold drop-shadow-sm">
                      {imageName || 'أكاديمية المستقبل الدولية'}
                    </h4>
                  </div>
                </div>

                <div className="p-4 pt-0 relative flex items-end justify-between -mt-8">
                  <div className="flex items-end gap-3">
                    <div className="w-16 h-16 rounded-xl bg-white p-1 shadow-md border border-slate-200 overflow-hidden">
                      {selectedRatio.id === 'square' && canvasRef.current ? (
                        <img
                          src={canvasRef.current.toDataURL()}
                          alt="Logo Preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full rounded-lg bg-indigo-900 text-white flex items-center justify-center font-bold text-lg">
                          شعار
                        </div>
                      )}
                    </div>
                    <div className="pb-1">
                      <div className="text-xs font-bold text-slate-900">هيئة التدريس والبرامج الأكاديمية</div>
                      <div className="text-[11px] text-slate-500">الرياض • معتمد رسمياً</div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                هذه المعاينة توضح بدقة كيف ستظهر الصورة المقصوصة بعد حفظها ومزامنتها على السحابة للمستخدمين والطلاب.
              </p>
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <Button type="button" variant="ghost" onClick={onClose} size="sm">
            إلغاء الأمر
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setZoom(1);
                setPanX(0);
                setPanY(0);
                setRotation(0);
              }}
            >
              استعادة الأصل
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleApplyCrop}
              leftIcon={<Check className="w-4 h-4" />}
              className="gap-2 font-bold px-4"
            >
              اعتماد وقص الصورة وتطبيقها
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

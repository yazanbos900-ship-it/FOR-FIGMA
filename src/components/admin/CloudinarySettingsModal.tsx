import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  Save,
  Key,
  Folder,
  RefreshCw,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import {
  getCloudinaryConfig,
  saveCloudinaryConfig,
  testCloudinaryConnection,
  CloudinaryConfig
} from '../../services/cloudinary';
import { Button } from '../ui/Button';

interface CloudinarySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (msg: string) => void;
}

export const CloudinarySettingsModal: React.FC<CloudinarySettingsModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [config, setConfig] = useState<CloudinaryConfig>(getCloudinaryConfig());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setConfig(getCloudinaryConfig());
      setTestResult(null);
      setIsSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveCloudinaryConfig(config);
    setIsSaved(true);
    if (onShowToast) onShowToast('تم حفظ إعدادات Cloudinary بنجاح.');
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testCloudinaryConnection(config);
      setTestResult(result);
      if (result.success && onShowToast) {
        onShowToast('تم التحقق من ربط Cloudinary بنجاح!');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'فشل الاتصال بـ Cloudinary.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 text-start">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>إعدادات وتكامل Cloudinary</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  سحابة الوسائط الرسمية
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                إدارة رفع البنرات، الصور، الوثائق، وتراخيص المؤسسات التعليمية
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5 text-xs text-slate-700">
          {/* Quick Notice */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-indigo-950 block">ربط سحابي مشفر ومباشر</span>
              <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                يتم رفع جميع الملفات (البنرات الإعلانية، وثائق الاعتماد، شهادات المنشآت، إيصالات السداد، خطط البرامج) وتخزينها بصيغ فائقة السرعة مع تحسين تلقائي للحجم والجودة.
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                اسم السحابة (Cloud Name) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={config.cloudName}
                onChange={(e) => setConfig({ ...config, cloudName: e.target.value })}
                placeholder="مثال: aali-platform أو اسم حسابك"
                required
                dir="ltr"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                موجود في الصفحة الرئيسية للوحة تحكم Cloudinary (Dashboard).
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                إعداد الرفع غير الموقع (Upload Preset) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={config.uploadPreset}
                onChange={(e) => setConfig({ ...config, uploadPreset: e.target.value })}
                placeholder="مثال: aali_uploads أو ml_default"
                required
                dir="ltr"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                يجب أن تكون حالة الـ Preset مضبوطة كـ <strong className="text-slate-600 font-semibold">Unsigned</strong> للسماح بالرفع المباشر الآمن من المتصفح.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-indigo-600" />
                  <span>المجلد الرئيسي (Folder Prefix)</span>
                </label>
                <input
                  type="text"
                  value={config.folderPrefix}
                  onChange={(e) => setConfig({ ...config, folderPrefix: e.target.value })}
                  placeholder="aali_education"
                  dir="ltr"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-600" />
                  <span>مفتاح الـ API (اختياري)</span>
                </label>
                <input
                  type="text"
                  value={config.apiKey || ''}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="1234567890..."
                  dir="ltr"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Test Connection Button & Result */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">فحص الاتصال المباشر</span>
                <span className="text-[11px] text-slate-500">يقوم بإرسال طلب اختبار خفيف للتحقق من جهوزية السحابة للرفع</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="gap-1.5 bg-white text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-600' : ''}`} />
                <span>{isTesting ? 'جارٍ الفحص…' : 'اختبار الاتصال'}</span>
              </Button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <span className="font-semibold block">{testResult.message}</span>
                </div>
              </div>
            )}
          </div>

          {/* How to configure guide */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-amber-950 space-y-2 text-[11px]">
            <div className="flex items-center gap-1.5 font-bold">
              <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
              <span>طريقة ضبط Cloudinary في دقيقة واحدة:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 leading-relaxed text-amber-900/90 ps-1">
              <li>سجّل الدخول إلى لوحة تحكم Cloudinary الخاصة بك.</li>
              <li>انتقل إلى <strong>Settings</strong> ➔ <strong>Upload</strong> ➔ ثم مرر إلى <strong>Upload presets</strong>.</li>
              <li>اضغط <strong>Add upload preset</strong> وغيّر خيار <strong>Signing Mode</strong> إلى <strong className="text-amber-950 underline">Unsigned</strong>.</li>
              <li>انسخ اسم الـ Preset واسم الـ Cloud Name وضعهما في الحقول أعلاه واضغط حفظ.</li>
            </ol>
            <a
              href="https://cloudinary.com/console"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-700 hover:underline font-bold mt-1"
            >
              <span>فتح لوحة تحكم Cloudinary Console</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-between border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              {isSaved ? '✓ تم حفظ التعديلات بنجاح' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                إغلاق
              </button>
              <Button type="submit" variant="primary" size="md" rightIcon={<Save className="w-4 h-4" />}>
                حفظ الإعدادات
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

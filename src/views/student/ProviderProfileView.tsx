import React, { useState } from 'react';
import { ActiveView, EducationalProvider, EducationalService } from '../../types';
import { usePlatformData } from '../../firebase/PlatformDataContext';
import { useAuth } from '../../firebase/AuthContext';
import { Button } from '../../components/ui/Button';
import { getCacheBustedUrl } from '../../services/cloudinary';

import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';
import { EditProviderProfileModal } from './components/EditProviderProfileModal';
import { 
  Building2, 
  MapPin, 
  Star, 
  Mail, 
  Phone, 
  Globe, 
  ShieldCheck, 
  CheckCircle2, 
  Calendar, 
  Award, 
  ArrowLeft,
  BookOpen,
  Share2,
  Clock,
  Sparkles,
  Edit3,
  Palette,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface ProviderProfileViewProps {
  providerId: string;
  onNavigate: (view: ActiveView, extraId?: string) => void;
  onSelectCourse: (courseId: string) => void;
}

export const ProviderProfileView: React.FC<ProviderProfileViewProps> = ({
  providerId,
  onNavigate,
  onSelectCourse,
}) => {
  const { providers, services, updateProvider } = usePlatformData();
  const { user, userProfile } = useAuth();

  const isAdmin = userProfile?.role === 'admin';
  const isOwner = userProfile?.role === 'provider' && (user?.uid === providerId);
  const canEdit = isAdmin || isOwner;

  const provider = providers.find(
    (p) => p.id === providerId && (canEdit || p.accredited || p.verificationStatus === 'approved')
  );

  const providerServices = services.filter((s) => s.providerId === providerId && s.status === 'active');
  const [activeTab, setActiveTab] = useState<'courses' | 'about' | 'contact'>('courses');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [initialEditTab, setInitialEditTab] = useState<
    'general' | 'location' | 'branding' | 'contact' | 'accreditation' | 'admin'
  >('general');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleShare = () => {
    showToast('تم نسخ رابط الملف التعريفي للمؤسسة بنجاح!');
  };

  const openEditModal = (
    tab: 'general' | 'location' | 'branding' | 'contact' | 'accreditation' | 'admin' = 'general'
  ) => {
    setInitialEditTab(tab);
    setIsEditModalOpen(true);
  };

  const handleSaveProvider = async (changes: Partial<EducationalProvider>) => {
    if (!provider) return;
    await updateProvider(provider.id, changes);
    showToast('تم حفظ وتحديث بيانات المؤسسة بنجاح!');
  };

  if (!provider) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
          <Building2 className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">المؤسسة غير موجودة أو قيد المراجعة</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          لم نتمكن من العثور على بيانات هذه المؤسسة في الدليل المعتمد حالياً، أو أنها بانتظار استكمال الترخيص.
        </p>
        <Button variant="outline" size="sm" onClick={() => onNavigate('discovery')}>
          العودة لدليل المؤسسات
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Feedback */}
      {toastMessage && (
        <div 
          role="status" 
          aria-live="polite"
          className="fixed bottom-6 start-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <nav aria-label="مسار التنقل" className="flex items-center gap-2 text-xs text-slate-500">
          <button
            onClick={() => onNavigate('landing')}
            className="hover:text-indigo-600 transition-colors cursor-pointer"
          >
            الرئيسية
          </button>
          <span aria-hidden="true">/</span>
          <button
            onClick={() => onNavigate('discovery')}
            className="hover:text-indigo-600 transition-colors cursor-pointer"
          >
            دليل المؤسسات
          </button>
          <span aria-hidden="true">/</span>
          <span className="text-slate-900 font-medium truncate max-w-xs">{provider.name}</span>
        </nav>

        {/* Back button for Admin navigation */}
        {isAdmin && (
          <button
            onClick={() => onNavigate('admin')}
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            <span>العودة إلى لوحة المشرف العام</span>
          </button>
        )}
      </div>

      {/* Edit Mode Authorization Banner (For Provider Owner or Super Admin) */}
      {canEdit && (
        <div 
          className={`p-4 sm:p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-2xs ${
            isAdmin 
              ? 'bg-amber-50/90 border-amber-200 text-amber-950' 
              : 'bg-indigo-50/90 border-indigo-200 text-indigo-950'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${isAdmin ? 'bg-amber-200 text-amber-900' : 'bg-indigo-200 text-indigo-900'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm">
                  {isAdmin ? 'وضع المشرف العام (Super Admin)' : 'أهلاً بك! أنت في صفحة مؤسستك الرسمية'}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  isAdmin ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                }`}>
                  {isAdmin ? 'تحكم كامل بكافة الحقول والاعتمادات' : 'صلاحية التعديل مفعلة'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {isAdmin
                  ? `بصفتك المشرف العام، يمكنك تعديل مدينة ومقر وسنة تأسيس وشعار وهوية «${provider.name}» مباشرة، وتغيير حالة الاعتماد.`
                  : 'يمكنك تعديل بيانات مؤسستك (المدينة، المقر، سنة التأسيس، الشعار، النبذة، وأرقام التواصل) لتظهر بالشكل الأمثل للطلاب.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant={isAdmin ? 'primary' : 'accent'}
              size="md"
              onClick={() => openEditModal('general')}
              className="gap-2 shadow-xs cursor-pointer font-bold text-xs"
            >
              <Edit3 className="w-4 h-4" />
              <span>تعديل بيانات المؤسسة</span>
            </Button>
          </div>
        </div>
      )}

      {/* Header Profile Cover Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xl">
        {/* Cover gradient or image */}
        <div 
          className={`h-52 sm:h-72 bg-gradient-to-br ${provider.coverColor || 'from-indigo-950 via-indigo-900 to-indigo-800'} relative p-6 sm:p-8 flex items-end justify-between transition-all overflow-hidden`}
        >
          {provider.coverImageUrl && (
            <img
              key={`cover-img-${provider.id}-${provider.coverImageUrl}-${provider.updatedAt || ''}`}
              src={getCacheBustedUrl(provider.coverImageUrl, provider.updatedAt)}
              alt={`${provider.name} بنر`}
              className="absolute inset-0 w-full h-full object-cover object-center z-0"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent z-1" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(99,102,241,0.2),transparent_50%)] z-1 pointer-events-none" />
          
          <div className="absolute top-4 end-4 flex items-center gap-2 z-10">
            {canEdit && (
              <button
                onClick={() => openEditModal('branding')}
                className="px-3 py-1.5 rounded-xl bg-black/45 hover:bg-black/65 text-white backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="تغيير لون وتصميم الغلاف"
              >
                <Palette className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تعديل الغلاف</span>
              </button>
            )}
            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-black/35 hover:bg-black/55 text-white backdrop-blur-md transition-colors cursor-pointer"
              aria-label="مشاركة الرابط"
              title="مشاركة رابط الملف"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Profile Details Container */}
        <div className="p-6 sm:p-8 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Logo / Avatar with quick edit */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-2 shadow-sm border-2 border-slate-200/90 shrink-0 overflow-hidden flex items-center justify-center">
                  {provider.logoUrl ? (
                    <img
                      key={`profile-logo-${provider.id}-${provider.logoUrl}-${provider.updatedAt || ''}`}
                      src={getCacheBustedUrl(provider.logoUrl, provider.updatedAt)}
                      alt={provider.name}
                      className="w-full h-full rounded-xl object-contain"
                    />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-indigo-950 text-white flex items-center justify-center font-bold text-3xl sm:text-4xl shadow-inner">
                      {provider.name[0] || 'أ'}
                    </div>
                  )}
                </div>
                {canEdit && (
                  <button
                    onClick={() => openEditModal('branding')}
                    className="absolute -bottom-1 -end-1 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-colors cursor-pointer"
                    title="تغيير الشعار أو الصورة"
                    aria-label="تغيير الشعار أو الصورة"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{provider.name}</h1>
                  {provider.accredited ? (
                    <Badge variant="success" className="gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>معتمد على المنصة</span>
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>قيد مراجعة الاعتماد</span>
                    </Badge>
                  )}
                  {provider.featured && (
                    <Badge variant="info" className="gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>مؤسسة مميزة</span>
                    </Badge>
                  )}
                </div>
                {provider.nameEn && (
                  <div className="text-xs text-slate-500 font-mono">{provider.nameEn}</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {canEdit && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => openEditModal('general')}
                  className="gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>تعديل سريع</span>
                </Button>
              )}
              <Button
                variant="accent"
                size="md"
                onClick={() => setActiveTab('courses')}
              >
                استعراض البرامج ({providerServices.length})
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
            <div>
              <div className="text-slate-500 mb-0.5">التقييم العام</div>
              <div className="flex items-center gap-1 font-bold text-slate-900 text-sm">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>{provider.rating.toFixed(1)}</span>
                <span className="text-slate-400 font-normal">({provider.reviewsCount} تقييم)</span>
              </div>
            </div>

            <div className="relative group">
              <div className="flex items-center justify-between">
                <div className="text-slate-500 mb-0.5">سنة التأسيس</div>
                {canEdit && (
                  <button
                    onClick={() => openEditModal('branding')}
                    className="text-slate-400 hover:text-indigo-600 p-0.5 transition-colors cursor-pointer"
                    title="تعديل سنة التأسيس"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="font-bold text-slate-900 text-sm">
                {provider.establishedYear ? `${provider.establishedYear} مـ` : 'غير مسجلة'}
              </div>
            </div>

            <div className="relative group">
              <div className="flex items-center justify-between">
                <div className="text-slate-500 mb-0.5">المدينة والمقر</div>
                {canEdit && (
                  <button
                    onClick={() => openEditModal('location')}
                    className="text-slate-400 hover:text-indigo-600 p-0.5 transition-colors cursor-pointer"
                    title="تعديل المدينة والمقر"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{provider.city}</span>
              </div>
            </div>

            <div>
              <div className="text-slate-500 mb-0.5">رقم الترخيص الرسمي</div>
              <div className="font-mono font-bold text-indigo-700 text-xs truncate">
                {provider.verifiedLicenseNumber || provider.licenseNumber || 'غير مسجل'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Control */}
      <div role="tablist" aria-label="أقسام ملف المؤسسة" className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('courses')}
          role="tab"
          aria-selected={activeTab === 'courses'}
          className={`px-4 py-2 rounded-xl transition-all font-semibold cursor-pointer ${
            activeTab === 'courses'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          البرامج والدورات المتاحة ({providerServices.length})
        </button>

        <button
          onClick={() => setActiveTab('about')}
          role="tab"
          aria-selected={activeTab === 'about'}
          className={`px-4 py-2 rounded-xl transition-all font-semibold cursor-pointer ${
            activeTab === 'about'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          نبذة عن المؤسسة والاعتمادات
        </button>

        <button
          onClick={() => setActiveTab('contact')}
          role="tab"
          aria-selected={activeTab === 'contact'}
          className={`px-4 py-2 rounded-xl transition-all font-semibold cursor-pointer ${
            activeTab === 'contact'
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          الموقع وبيانات التواصل
        </button>
      </div>

      {/* Tab 1: Available Courses */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              الدورات والخدمات المقدمة من {provider.name}
            </h2>
            <span className="text-xs text-slate-500">{providerServices.length} برامج منشورة</span>
          </div>

          {providerServices.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">لا توجد برامج منشورة حالياً لهذه المؤسسة.</p>
              {canEdit && (
                <p className="text-xs text-slate-500">
                  يمكن لمزود الخدمة إضافة ونشر برامج جديدة من خلال لوحة إدارة البرامج.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providerServices.map((service) => (
                <Card key={service.id} hoverable className="flex flex-col justify-between">
                  <div>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 text-xs font-semibold">
                          {service.level}
                        </span>
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-800">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>{service.rating.toFixed(1)}</span>
                        </div>
                      </div>
                      <CardTitle className="text-base">{service.title}</CardTitle>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {service.duration}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{service.mode === 'online' ? 'أونلاين' : service.mode === 'hybrid' ? 'مدمج' : 'حضوري'}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                        {service.description}
                      </p>
                      <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[10px]">الرسوم:</span>
                          <span className="text-sm font-bold text-slate-900 tabular-nums">
                            {service.numericPrice.toLocaleString()} {service.currency}
                          </span>
                        </div>
                        <div className="text-end">
                          <span className="text-slate-400 block text-[10px]">المقاعد الشاغرة:</span>
                          <span className="text-xs font-semibold text-emerald-700">
                            {service.seatsAvailable} مقعد
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </div>
                  <CardFooter>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectCourse(service.id)}
                    >
                      تفاصيل المنهج
                    </Button>
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => onNavigate('checkout', service.id)}
                    >
                      حجز مقعد
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: About & Accreditation */}
      {activeTab === 'about' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-8 space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-soft-card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">نبذة تعريفية شاملة</h2>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal('general')}
                  className="gap-1.5 text-xs cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>تعديل النبذة</span>
                </Button>
              )}
            </div>

            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {provider.description || 'لم تتم إضافة نبذة تعريفية عن المؤسسة بعد.'}
            </p>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">الخدمات والمسارات المسجلة:</h3>
                {canEdit && (
                  <button
                    onClick={() => openEditModal('accreditation')}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>تعديل الخدمات</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                {provider.servicesOffered && provider.servicesOffered.length > 0 ? (
                  provider.servicesOffered.map((srv, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{srv}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">لا توجد خدمات إضافية مسجلة.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">الاعتماد الأكاديمي والرقابي:</h3>
                {canEdit && (
                  <button
                    onClick={() => openEditModal('accreditation')}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>تعديل جهة الاعتماد</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {provider.accreditationBody || 'جهة الإشراف والاعتماد قيد المراجعة الرسمية.'}
              </p>
            </div>
          </div>

          <div className="md:col-span-4 space-y-4">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">الكلمات المفتاحية والوسوم</h3>
                {canEdit && (
                  <button
                    onClick={() => openEditModal('accreditation')}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>تعديل</span>
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {provider.tags && provider.tags.length > 0 ? (
                  provider.tags.map((t, idx) => (
                    <span key={idx} className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700">
                      #{t}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400">لا توجد وسوم مسجلة.</span>
                )}
              </div>
            </div>

            {/* Admin Info Card */}
            {canEdit && (
              <div className="bg-indigo-50/70 p-5 rounded-3xl border border-indigo-100 space-y-3 text-xs">
                <h4 className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>معلومات النظام والتحقق</span>
                </h4>
                <div className="space-y-1.5 text-slate-600">
                  <div className="flex justify-between">
                    <span>حالة الاعتماد:</span>
                    <span className="font-semibold text-slate-900">{provider.accredited ? 'معتمد' : 'غير معتمد'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>حالة التوثيق:</span>
                    <span className="font-semibold text-slate-900">{provider.verificationStatus || 'قيد المراجعة'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>رقم المزود (ID):</span>
                    <span className="font-mono text-[10px] text-slate-700 truncate max-w-[120px]">{provider.id}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Contact Details */}
      {activeTab === 'contact' && (
        <div className="max-w-2xl bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-soft-card space-y-5 text-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">معلومات الاتصال والموقع الجغرافي</h2>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEditModal('contact')}
                className="gap-1.5 text-xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                <span>تعديل معلومات الاتصال</span>
              </Button>
            )}
          </div>

          <div className="space-y-3 text-slate-700">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <Mail className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="text-slate-400 block text-[10px]">البريد الإلكتروني للقبول والتواصل:</span>
                <span dir="ltr" className="font-semibold text-slate-900">
                  {provider.contactEmail || 'لم يُضف البريد الإلكتروني بعد'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <Phone className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="text-slate-400 block text-[10px]">الهاتف المباشر:</span>
                <span dir="ltr" className="font-semibold text-slate-900">
                  {provider.contactPhone || 'لم يُضف رقم الهاتف بعد'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <span className="text-slate-400 block text-[10px]">المقر والعنوان الجغرافي:</span>
                  <span className="font-semibold text-slate-900">
                    {provider.address || `${provider.city}، الجمهورية العربية السورية`}
                  </span>
                </div>
              </div>
              {canEdit && (
                <button
                  onClick={() => openEditModal('location')}
                  className="text-xs text-indigo-600 hover:underline shrink-0 cursor-pointer"
                >
                  تعديل العنوان
                </button>
              )}
            </div>

            {provider.website ? (
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <Globe className="w-4 h-4 text-indigo-600" />
                <div>
                  <span className="text-slate-400 block text-[10px]">الموقع الإلكتروني الرسمي:</span>
                  <a 
                    href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-indigo-600 hover:underline font-semibold" 
                    dir="ltr"
                  >
                    {provider.website}
                  </a>
                </div>
              </div>
            ) : (
              canEdit && (
                <div className="p-3 rounded-xl border border-dashed border-slate-200 text-slate-400 flex items-center justify-between">
                  <span>لم يتم ربط موقع إلكتروني رسمي.</span>
                  <button
                    onClick={() => openEditModal('contact')}
                    className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
                  >
                    إضافة موقع إلكتروني
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Edit Provider Profile Modal */}
      {canEdit && (
        <EditProviderProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          provider={provider}
          isAdmin={isAdmin}
          onSave={handleSaveProvider}
          initialTab={initialEditTab}
        />
      )}
    </div>
  );
};

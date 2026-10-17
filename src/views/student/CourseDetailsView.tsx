import React, { useState } from 'react';
import { ActiveView, EducationalService, CourseModule } from '../../types';
import { usePlatformData } from '../../firebase/PlatformDataContext';
import { useAuth } from '../../firebase/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { getCacheBustedUrl } from '../../services/cloudinary';

import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { 
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  GraduationCap,
  Heart,
  HelpCircle,
  Info,
  MapPin,
  MessageSquare,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Video,
  BookOpen,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ExternalLink
} from 'lucide-react';

interface CourseDetailsViewProps {
  courseId: string;
  onNavigate: (view: ActiveView, extraId?: string) => void;
  onEnroll: (course: EducationalService) => void;
}

export const CourseDetailsView: React.FC<CourseDetailsViewProps> = ({
  courseId,
  onNavigate,
  onEnroll,
}) => {
  const { services, providers, categories, savedServiceIds, toggleSavedService, createInquiry } = usePlatformData();
  const { user, userProfile } = useAuth();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [inquiryText, setInquiryText] = useState('');
  const [isInquirySubmitting, setIsInquirySubmitting] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

  const course = services.find((s) => s.id === courseId);
  const provider = course ? providers.find((p) => p.id === course.providerId) : undefined;
  const isSaved = course ? savedServiceIds.includes(course.id) : false;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleShare = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      showToast('تم نسخ رابط البرنامج بنجاح');
    }
  };

  const handleToggleSave = async () => {
    if (!course) return;
    try {
      await toggleSavedService(course.id);
      showToast(isSaved ? 'تمت الإزالة من المحفوظات' : 'تمت الإضافة إلى المحفوظات');
    } catch {
      showToast('حدث خطأ أثناء حفظ البرنامج');
    }
  };

  const handleSendInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course || !inquiryText.trim()) return;

    if (!user) {
      onNavigate('auth-login');
      return;
    }

    setIsInquirySubmitting(true);
    try {
      await createInquiry(course, inquiryText.trim());
      setInquirySuccess(true);
      setInquiryText('');
      setTimeout(() => {
        setInquirySuccess(false);
        setIsInquiryModalOpen(false);
        showToast('تم إرسال استفسارك إلى المؤسسة التعليمية بنجاح');
      }, 1500);
    } catch {
      showToast('فشل إرسال الاستفسار، يرجى المحاولة لاحقاً');
    } finally {
      setIsInquirySubmitting(false);
    }
  };

  // If course not found
  if (!course) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">لم يتم العثور على البرنامج التعليمي</h2>
        <p className="text-slate-600 max-w-md mb-6 text-sm">
          قد يكون هذا البرنامج غير متاح حالياً أو تم تعديل رابطه من قبل المزود التعليمي.
        </p>
        <Button onClick={() => onNavigate('discovery')} variant="primary">
          العودة لدليل البرامج
        </Button>
      </div>
    );
  }

  // Related services
  const relatedCourses = services
    .filter((s) => s.id !== course.id && (s.category === course.category || s.providerId === course.providerId) && s.status === 'active')
    .slice(0, 3);

  const categoryLabel = categories.find((c) => c.id === course.category)?.nameAr || course.category;

  const modeBadge = {
    'on-campus': { label: 'حضوري في المقر', variant: 'neutral' as const, icon: Building2 },
    'online': { label: 'تعليم عن بُعد (أونلاين)', variant: 'info' as const, icon: Video },
    'hybrid': { label: 'تعليم مدمج (حضوري وعن بعد)', variant: 'success' as const, icon: Sparkles },
  }[course.mode] || { label: 'حضوري', variant: 'neutral' as const, icon: Building2 };

  const ModeIcon = modeBadge.icon;

  const seatsPercentage = course.totalSeats > 0 
    ? Math.min(100, Math.round(((course.totalSeats - course.seatsAvailable) / course.totalSeats) * 100))
    : 0;

  return (
    <div className="bg-slate-50/50 min-h-screen pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-xl shadow-xl text-sm font-medium flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <nav className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 overflow-x-auto whitespace-nowrap">
            <button 
              onClick={() => onNavigate('landing')}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              الرئيسية
            </button>
            <span className="text-slate-300">/</span>
            <button 
              onClick={() => onNavigate('discovery')}
              className="hover:text-indigo-600 transition-colors cursor-pointer"
            >
              دليل البرامج
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium truncate max-w-xs sm:max-w-md">
              {course.title}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content Area (2 cols on large screen) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Hero Course Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-soft-card">
              {/* Optional Course Image Banner */}
              {course.imageUrl ? (
                <div className="h-64 sm:h-80 w-full relative overflow-hidden bg-slate-900">
                  <img 
                    src={course.imageUrl} 
                    alt={course.title} 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
                  <div className="absolute top-4 end-4 flex items-center gap-2">
                    <button
                      onClick={handleToggleSave}
                      className={`p-2.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                        isSaved 
                          ? 'bg-rose-500/90 text-white border-rose-400' 
                          : 'bg-white/80 text-slate-800 border-white/40 hover:bg-white'
                      }`}
                      aria-label="حفظ في المفضلة"
                    >
                      <Heart className={`w-4 h-4 ${isSaved ? 'fill-white' : ''}`} />
                    </button>
                    <button
                      onClick={handleShare}
                      className="p-2.5 rounded-xl border bg-white/80 text-slate-800 border-white/40 hover:bg-white backdrop-blur-md transition-all cursor-pointer"
                      aria-label="مشاركة"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="h-32 sm:h-44 w-full bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 relative p-6 flex items-end justify-between">
                  <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold">
                    <GraduationCap className="w-4 h-4" />
                    <span>برنامج تعليمي معتمد</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleSave}
                      className={`p-2 rounded-lg border backdrop-blur-md transition-all cursor-pointer ${
                        isSaved 
                          ? 'bg-rose-500 text-white border-rose-400' 
                          : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                      }`}
                      aria-label="حفظ في المفضلة"
                    >
                      <Heart className={`w-4 h-4 ${isSaved ? 'fill-white' : ''}`} />
                    </button>
                    <button
                      onClick={handleShare}
                      className="p-2 rounded-lg border bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-md transition-all cursor-pointer"
                      aria-label="مشاركة"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Title & Badges */}
              <div className="p-6 sm:p-8 space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge variant="neutral">{categoryLabel}</Badge>
                  <Badge variant={modeBadge.variant}>
                    <span className="flex items-center gap-1">
                      <ModeIcon className="w-3 h-3" />
                      {modeBadge.label}
                    </span>
                  </Badge>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-100">
                    {course.level}
                  </span>
                  {course.featured && (
                    <Badge variant="warning">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        برنامج مميز
                      </span>
                    </Badge>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                  {course.title}
                </h1>

                {/* Provider reference with clickable link */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onNavigate('provider-profile', course.providerId)}
                    className="flex items-center gap-3 group text-start cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {provider?.logoUrl ? (
                        <img 
                          key={`provider-logo-${course.providerId}-${provider.logoUrl}-${provider.updatedAt || ''}`}
                          src={getCacheBustedUrl(provider.logoUrl, provider.updatedAt)} 
                          alt={course.providerName} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <Building2 className="w-5 h-5 text-indigo-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm sm:text-base">
                        <span>{course.providerName}</span>
                        {provider?.accredited && (
                          <span title="مزود معتمد">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {provider?.city ? `${provider.city} · ` : ''}عرض ملف المؤسسة الكامل
                      </span>
                    </div>
                  </button>

                  {/* Rating display */}
                  <div className="flex items-center gap-1.5 bg-amber-50/80 border border-amber-200/60 px-3 py-1.5 rounded-xl">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                    <span className="font-bold text-slate-900 text-sm">{course.rating.toFixed(1)}</span>
                    <span className="text-xs text-slate-500">({course.reviewsCount} تقييم)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <Clock className="w-5 h-5 text-indigo-600 mx-auto mb-1.5" />
                <span className="text-xs text-slate-500 block">مدة البرنامج</span>
                <span className="text-sm font-bold text-slate-900">{course.duration || 'غير محدد'}</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <Users className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
                <span className="text-xs text-slate-500 block">المقاعد المتاحة</span>
                <span className="text-sm font-bold text-emerald-700">{course.seatsAvailable} من {course.totalSeats}</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <GraduationCap className="w-5 h-5 text-indigo-600 mx-auto mb-1.5" />
                <span className="text-xs text-slate-500 block">المستوى التعليمي</span>
                <span className="text-sm font-bold text-slate-900">{course.level}</span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <Calendar className="w-5 h-5 text-purple-600 mx-auto mb-1.5" />
                <span className="text-xs text-slate-500 block">المواعيد والجدول</span>
                <span className="text-sm font-bold text-slate-900 truncate block">{course.schedule || 'مرن / أسبوعي'}</span>
              </div>
            </div>

            {/* Description Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  نبذة وتفاصيل البرنامج
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-slate-700 leading-relaxed text-sm sm:text-base whitespace-pre-line">
                  {course.description}
                </div>

                {course.instructorName && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                      {course.instructorName.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block">المشرف / المدرب الأكاديمي</span>
                      <span className="text-sm font-bold text-slate-900">{course.instructorName}</span>
                      {course.instructorRole && (
                        <span className="text-xs text-slate-600 block">{course.instructorRole}</span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Syllabus / Document / Modules Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    المنهج والخطة الدراسية
                  </CardTitle>
                  {course.syllabusUrl && (
                    <a
                      href={course.syllabusUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      تحميل الخطة (PDF)
                    </a>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Official Syllabus Document Card if uploaded via Cloudinary */}
                {course.syllabusUrl && (
                  <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 shadow-xs">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          {course.syllabusFileName || 'المنهج والخطة الدراسية المعتمدة'}
                        </div>
                        <div className="text-xs text-slate-500">
                          وثيقة رسمية مرفوعة من قِبل المزود التعليمي
                          {course.syllabusFileSize ? ` · ${(course.syllabusFileSize / (1024 * 1024)).toFixed(2)} MB` : ''}
                        </div>
                      </div>
                    </div>
                    <a
                      href={course.syllabusUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      معاينة وتحميل الملف
                    </a>
                  </div>
                )}

                {/* Course Modules List */}
                {course.modules && course.modules.length > 0 ? (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      الوحدات والمحاور التدريبية ({course.modules.length} محاور)
                    </h4>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {course.modules.map((module: CourseModule, idx: number) => {
                        const isExpanded = expandedModuleId === module.id;
                        return (
                          <div key={module.id || idx} className="bg-white">
                            <button
                              type="button"
                              onClick={() => setExpandedModuleId(isExpanded ? null : module.id)}
                              className="w-full p-4 flex items-center justify-between text-start hover:bg-slate-50/70 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="text-sm font-bold text-slate-900">{module.title}</div>
                                  <div className="text-xs text-slate-500">
                                    {module.lessonsCount ? `${module.lessonsCount} درس / محاضرة · ` : ''}
                                    المدة: {module.duration}
                                  </div>
                                </div>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </button>
                            {isExpanded && (
                              <div className="px-4 pb-4 pt-1 bg-slate-50/50 text-xs text-slate-600 leading-relaxed border-t border-slate-100">
                                تشمل هذه الوحدة دراسة تفصيلية للمفاهيم الأساسية، تدريبات عملية واختبارات قياس مستوى للتأكد من استيعاب كافة مخرجات التعلم المعتمدة.
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      خطة تعليمية مرنة وتطبيقية
                    </div>
                    <p className="leading-relaxed">
                      يتم توزيع المحتوى الأكاديمي وفق خطة أسبوعية تتناسب مع وتيرة المتعلم وتتضمن مشاريع تطبيقية وجلسات مراجعة دورية واختبارات تقييم مستمرة.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Related Courses */}
            {relatedCourses.length > 0 && (
              <div className="space-y-3 pt-4">
                <h3 className="text-base font-bold text-slate-900">برامج أخرى قد تهمك</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedCourses.map((relCourse) => (
                    <div 
                      key={relCourse.id} 
                      className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all cursor-pointer flex flex-col justify-between"
                      onClick={() => onNavigate('course-details', relCourse.id)}
                    >
                      <div>
                        <div className="text-xs text-indigo-600 font-semibold mb-1">{relCourse.providerName}</div>
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1 mb-2">{relCourse.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2 mb-3">{relCourse.description}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="font-bold text-slate-900">{relCourse.numericPrice} {relCourse.currency}</span>
                        <span className="text-indigo-600 font-medium flex items-center gap-1">
                          التفاصيل <ArrowRight className="w-3 h-3 rotate-180" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar: Enrollment & Inquiries */}
          <div className="space-y-6">
            
            {/* Enrollment & Booking Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-soft-card space-y-6 sticky top-24">
              <div>
                <span className="text-xs text-slate-500 block mb-1">الرسوم الدراسية</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900 tabular-nums">
                    {course.numericPrice.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-slate-600">{course.currency}</span>
                  {course.priceNote && (
                    <span className="text-xs text-slate-500">({course.priceNote})</span>
                  )}
                </div>
              </div>

              {/* Seats Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">المقاعد المتبقية:</span>
                  <span className="font-bold text-emerald-700">{course.seatsAvailable} من {course.totalSeats}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${seatsPercentage}%` }}
                  />
                </div>
                {course.seatsAvailable <= 5 && (
                  <p className="text-xs text-rose-600 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    سارع بالحجز، المقاعد المتبقية محدودة جداً!
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full text-base"
                  onClick={() => onEnroll(course)}
                  disabled={course.seatsAvailable <= 0}
                >
                  {course.seatsAvailable > 0 ? 'حجز وتسجيل في البرنامج' : 'المقاعد مكتملة'}
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  className="w-full"
                  onClick={() => setIsInquiryModalOpen(true)}
                  leftIcon={<MessageSquare className="w-4 h-4" />}
                >
                  إرسال استفسار للمؤسسة
                </Button>
              </div>

              {/* Guarantees List */}
              <div className="space-y-2.5 pt-4 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>شهادة إتمام معتمدة بعد إنهاء متطلبات البرنامج</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>دفع آمن وضمان حجز المقعد المباشر</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>دعم وإشراف مباشر من المشرف الأكاديمي</span>
                </div>
              </div>

              {/* Provider Quick Card */}
              {provider && (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    عن المؤسسة المقدمة
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {provider.logoUrl ? (
                        <img src={provider.logoUrl} alt={provider.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-5 h-5 text-indigo-600" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{provider.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {provider.city || 'المدينة المنورة'}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                    onClick={() => onNavigate('provider-profile', provider.id)}
                    rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
                  >
                    عرض الملف التعريفي والاعتمادات
                  </Button>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Inquiry Modal */}
      <Modal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        title={`استفسار عن ${course.title}`}
        description={`أرسل سؤالك أو استفسارك المباشر لمؤسسة ${course.providerName}، وسيقوم فريق القبول بالرد عليك.`}
        maxWidth="md"
      >
        <form onSubmit={handleSendInquiry} className="space-y-4 pt-2">
          {inquirySuccess ? (
            <div className="p-6 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-900">تم إرسال الاستفسار بنجاح!</h4>
              <p className="text-xs text-slate-600">سيتم التواصل معك عبر البريد الإلكتروني أو الهاتف المسجل.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  نص الاستفسار أو السؤال
                </label>
                <textarea
                  value={inquiryText}
                  onChange={(e) => setInquiryText(e.target.value)}
                  placeholder="اكتب استفسارك هنا، مثلاً: أوقات المحاضرات، آلية التقسيط، المتطلبات الخاصة..."
                  rows={4}
                  required
                  className="w-full p-3 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {!user && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>يتطلب إرسال الاستفسار تسجيل الدخول أولاً ليتمكن المزود من الرد عليك.</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInquiryModalOpen(false)}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isInquirySubmitting}
                >
                  {user ? 'إرسال الاستفسار' : 'تسجيل الدخول للمتابعة'}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
};

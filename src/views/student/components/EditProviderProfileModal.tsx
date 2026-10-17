import React, { useState, useEffect } from 'react';
import { EducationalProvider, ServiceCategory } from '../../../types';
import { usePlatformData } from '../../../firebase/PlatformDataContext';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { CloudinaryImageUpload } from '../../../components/ui/CloudinaryUpload';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Image as ImageIcon, 
  Palette, 
  Mail, 
  Phone, 
  Globe, 
  ShieldCheck, 
  Award, 
  Plus, 
  X, 
  Sparkles, 
  Save, 
  Info,
  CheckCircle2
} from 'lucide-react';

interface EditProviderProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: EducationalProvider;
  isAdmin: boolean;
  onSave: (changes: Partial<EducationalProvider>) => Promise<void>;
  initialTab?: 'general' | 'location' | 'branding' | 'contact' | 'accreditation' | 'admin';
}



const COVER_GRADIENTS = [
  { label: 'كحلي ملكي', value: 'from-indigo-950 via-indigo-900 to-indigo-800', preview: 'bg-gradient-to-r from-indigo-950 to-indigo-800' },
  { label: 'زمردي وطني', value: 'from-emerald-950 via-emerald-900 to-teal-800', preview: 'bg-gradient-to-r from-emerald-950 to-teal-800' },
  { label: 'كحلي أزرق', value: 'from-slate-950 via-slate-900 to-blue-950', preview: 'bg-gradient-to-r from-slate-950 to-blue-950' },
  { label: 'كهرماني دافئ', value: 'from-amber-950 via-amber-900 to-stone-900', preview: 'bg-gradient-to-r from-amber-950 to-stone-900' },
  { label: 'أرجواني أكاديمي', value: 'from-purple-950 via-purple-900 to-indigo-950', preview: 'bg-gradient-to-r from-purple-950 to-indigo-950' },
  { label: 'عنابي فاخر', value: 'from-rose-950 via-rose-900 to-slate-950', preview: 'bg-gradient-to-r from-rose-950 to-slate-950' },
];

export const EditProviderProfileModal: React.FC<EditProviderProfileModalProps> = ({
  isOpen,
  onClose,
  provider,
  isAdmin,
  onSave,
  initialTab = 'general',
}) => {
  const { cities } = usePlatformData();
  const [activeTab, setActiveTab] = useState<'general' | 'location' | 'branding' | 'contact' | 'accreditation' | 'admin'>(initialTab);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState(provider.name || '');
  const [nameEn, setNameEn] = useState(provider.nameEn || '');
  const [category, setCategory] = useState<ServiceCategory>(provider.category || 'schools');
  const [city, setCity] = useState(provider.city || 'الرياض');
  const [customCity, setCustomCity] = useState('');
  const [address, setAddress] = useState(provider.address || '');
  const [establishedYear, setEstablishedYear] = useState<string>(
    provider.establishedYear ? String(provider.establishedYear) : ''
  );
  const [logoUrl, setLogoUrl] = useState(provider.logoUrl || '');
  const [coverImageUrl, setCoverImageUrl] = useState(provider.coverImageUrl || '');
  const [coverColor, setCoverColor] = useState(provider.coverColor || COVER_GRADIENTS[0].value);
  const [description, setDescription] = useState(provider.description || '');
  const [contactPhone, setContactPhone] = useState(provider.contactPhone || '');
  const [contactEmail, setContactEmail] = useState(provider.contactEmail || '');
  const [website, setWebsite] = useState(provider.website || '');
  const [accreditationBody, setAccreditationBody] = useState(provider.accreditationBody || '');
  const [licenseNumber, setLicenseNumber] = useState(provider.licenseNumber || provider.verifiedLicenseNumber || '');
  
  // Array items
  const [servicesOffered, setServicesOffered] = useState<string[]>(provider.servicesOffered || []);
  const [newServiceInput, setNewServiceInput] = useState('');
  
  const [tags, setTags] = useState<string[]>(provider.tags || []);
  const [newTagInput, setNewTagInput] = useState('');

  // Admin Controls
  const [accredited, setAccredited] = useState(provider.accredited || false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'approved' | 'rejected'>(
    provider.verificationStatus || 'approved'
  );
  const [featured, setFeatured] = useState(provider.featured || false);

  // Sync state when provider changes
  useEffect(() => {
    if (isOpen) {
      setName(provider.name || '');
      setNameEn(provider.nameEn || '');
      setCategory(provider.category || 'schools');
      if (cities.includes(provider.city)) {
        setCity(provider.city);
        setCustomCity('');
      } else {
        setCity('other');
        setCustomCity(provider.city || '');
      }
      setAddress(provider.address || '');
      setEstablishedYear(provider.establishedYear ? String(provider.establishedYear) : '');
      setLogoUrl(provider.logoUrl || '');
      setCoverImageUrl(provider.coverImageUrl || '');
      setCoverColor(provider.coverColor || COVER_GRADIENTS[0].value);
      setDescription(provider.description || '');
      setContactPhone(provider.contactPhone || '');
      setContactEmail(provider.contactEmail || '');
      setWebsite(provider.website || '');
      setAccreditationBody(provider.accreditationBody || '');
      setLicenseNumber(provider.licenseNumber || provider.verifiedLicenseNumber || '');
      setServicesOffered(provider.servicesOffered || []);
      setTags(provider.tags || []);
      setAccredited(provider.accredited || false);
      setVerificationStatus(provider.verificationStatus || 'approved');
      setFeatured(provider.featured || false);
      setActiveTab(initialTab);
      setErrorMsg(null);
    }
  }, [isOpen, provider, initialTab]);

  const handleAddService = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newServiceInput.trim();
    if (trimmed && !servicesOffered.includes(trimmed)) {
      setServicesOffered([...servicesOffered, trimmed]);
      setNewServiceInput('');
    }
  };

  const handleRemoveService = (srv: string) => {
    setServicesOffered(servicesOffered.filter((s) => s !== srv));
  };

  const handleAddTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newTagInput.trim().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('يرجى إدخال اسم المؤسسة التعليمية.');
      setActiveTab('general');
      return;
    }

    const finalCity = city === 'other' ? customCity.trim() || 'الرياض' : city;

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const yearNum = establishedYear.trim() ? parseInt(establishedYear.trim(), 10) : undefined;

      const changes: Partial<EducationalProvider> = {
        name: name.trim(),
        nameEn: nameEn.trim(),
        category,
        city: finalCity,
        address: address.trim(),
        ...(yearNum && !isNaN(yearNum) ? { establishedYear: yearNum } : {}),
        logoUrl: logoUrl.trim(),
        coverImageUrl: coverImageUrl.trim(),
        coverColor,
        description: description.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        website: website.trim(),
        accreditationBody: accreditationBody.trim(),
        licenseNumber: licenseNumber.trim(),
        servicesOffered,
        tags,
      };

      if (isAdmin) {
        changes.accredited = accredited;
        changes.verificationStatus = verificationStatus;
        changes.featured = featured;
        changes.verifiedLicenseNumber = licenseNumber.trim();
      }

      await onSave(changes);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'تعذر حفظ البيانات، يرجى المحاولة لاحقاً.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`تعديل بيانات «${provider.name}»`}
      description={
        isAdmin
          ? 'بصفتك المشرف العام (Super Admin)، يمكنك تعديل وتحديث كافة بيانات المؤسسة ومقرها وتصنيفها مباشرة.'
          : 'تحديث بيانات ملفك التعريفي على المنصة ليظهر للطلاب وأولياء الأمور بأدق تفاصيله.'
      }
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <X className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-3 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'general'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>البيانات الأساسية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('location')}
            className={`px-3 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'location'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>المدينة والمقر</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`px-3 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'branding'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>الهوية وسنة التأسيس</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contact')}
            className={`px-3 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'contact'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>معلومات الاتصال</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accreditation')}
            className={`px-3 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'accreditation'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>الترخيص والخدمات</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>إدارة الاعتماد (سوبر أدمن)</span>
            </button>
          )}
        </div>

        {/* Tab 1: General Info */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="اسم المؤسسة التعليمية (بالعربية) *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: مدارس الرياض الأهلية، أكاديمية النخبة..."
                required
              />
              <Input
                label="الاسم الرسمي (بالإنجليزية)"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Riyadh International Schools"
                dir="ltr"
              />
            </div>

            <Select
              label="نوع وتصنيف المؤسسة التعليمية"
              value={category}
              onChange={(e) => setCategory(e.target.value as ServiceCategory)}
              options={[
                { value: 'schools', label: 'مدارس خاصة وحضانات' },
                { value: 'universities', label: 'جامعات وكليات أكاديمية' },
                { value: 'institutes', label: 'معاهد لغات وتدريب متخصص' },
                { value: 'tutors', label: 'مدرسون ومعلمون خصوصيون' },
                { value: 'training_centers', label: 'مراكز تدريب مهني وتقني' },
                { value: 'libraries', label: 'مكتبات ومراكز بحثية' },
              ]}
            />

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                نبذة تعريفية شاملة عن المؤسسة *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 leading-relaxed"
                placeholder="اكتب نبذة تعريفية توضح رسالة المؤسسة، أهدافها، البرامج التي تقدمها، وما يميزها للطلاب..."
                required
              />
            </div>
          </div>
        )}

        {/* Tab 2: Location & Address */}
        {activeTab === 'location' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  المدينة الرئيسية
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full min-h-12 rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 cursor-pointer"
                >
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="other">مدينة أخرى (إدخال يدوي)</option>
                </select>
              </div>

              {city === 'other' && (
                <Input
                  label="اسم المدينة"
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  placeholder="اكتب اسم المدينة هنا..."
                  required
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                المقر والعنوان الجغرافي التفصيلي
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 leading-relaxed"
                placeholder="مثال: حي النخيل الغربي، تقاطع طريق الملك عبدالله مع طريق الإمام، مبنى رقم 14، الرياض..."
              />
              <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>يساعد العنوان الدقيق الطلاب وأولياء الأمور في تحديد موقع الحرم التعليمي والمقر الرئيسي.</span>
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Branding & Established Year */}
        {activeTab === 'branding' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="سنة التأسيس"
                type="number"
                min="1900"
                max="2030"
                value={establishedYear}
                onChange={(e) => setEstablishedYear(e.target.value)}
                placeholder="مثال: 2008 أو 2018"
                leftIcon={<Calendar className="w-4 h-4" />}
                helperText="تظهر سنة التأسيس في شريط إحصائيات المؤسسة لإبراز عراقتها وخبرتها."
              />

              <CloudinaryImageUpload
                value={logoUrl}
                onChange={(url) => setLogoUrl(url)}
                folder="providers/logos"
                label="شعار المؤسسة التعليمية (Logo)"
                helperText="رفع الشعار المربع للمعهد عبر Cloudinary، مع إمكانية القص والتكبير والمحاذاة"
                aspectRatio="square"
              />
            </div>

            <div>
              <CloudinaryImageUpload
                value={coverImageUrl}
                onChange={(url) => setCoverImageUrl(url)}
                folder="providers/covers"
                label="صورة الغلاف والبنر الترويجي للمعهد (Institute Banner)"
                helperText="صورة غلاف عريضة تظهر أعلى صفحة المعهد. يمكنك تطويلها وقصها ومحاذاتها بالمللي لتحقيق أفضل مظهر."
                aspectRatio="banner"
              />
            </div>

            {/* Live Combined Header Preview */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>معاينة حية لشكل بنر وشعار المعهد كما سيظهر في المنصة:</span>
                </span>
                <span className="text-[10px] text-slate-400">تحديث فوري ومباشر</span>
              </div>

              <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 relative">
                {/* Banner Header */}
                <div
                  className={`h-32 sm:h-40 bg-gradient-to-br ${coverColor || 'from-indigo-950 via-indigo-900 to-indigo-800'} relative p-4 flex items-end justify-between transition-all bg-cover bg-center overflow-hidden`}
                  style={coverImageUrl ? { backgroundImage: `url(${coverImageUrl})` } : undefined}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.15),transparent_40%)] pointer-events-none" />
                  <div className="relative z-10 text-white">
                    <span className="text-[10px] bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-md font-semibold tracking-wide border border-white/20">
                      معاينة الهوية البصرية
                    </span>
                  </div>
                </div>

                {/* Institute Logo section */}
                <div className="p-3 relative flex items-center gap-3 bg-slate-900 border-t border-slate-800">
                  <div className="w-12 h-12 rounded-xl bg-white p-1 shadow-sm border border-slate-200 overflow-hidden shrink-0">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="w-full h-full rounded-lg object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full rounded-lg bg-indigo-950 text-white flex items-center justify-center font-bold text-lg">
                        {(name || provider.name || 'م')[0]}
                      </div>
                    )}
                  </div>
                  <div className="pb-1 text-slate-300 text-xs">
                    <span className="font-semibold text-white">{name || provider.name}</span>
                    <span className="text-[11px] block text-slate-400">{city} • {category}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cover Color Gradient */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                مظهر ولون غلاف المؤسسة (Cover Style)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {COVER_GRADIENTS.map((grad) => (
                  <button
                    key={grad.value}
                    type="button"
                    onClick={() => setCoverColor(grad.value)}
                    className={`p-3 rounded-xl border text-start transition-all cursor-pointer flex flex-col gap-2 ${
                      coverColor === grad.value
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`h-8 w-full rounded-lg ${grad.preview} shadow-2xs flex items-center justify-end px-2`}>
                      {coverColor === grad.value && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <span className="text-xs font-semibold text-slate-800">{grad.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Contact Details */}
        {activeTab === 'contact' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="الهاتف المباشر للتواصل"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+966 11 000 0000"
                dir="ltr"
                leftIcon={<Phone className="w-4 h-4" />}
              />

              <Input
                label="البريد الإلكتروني للقبول والتسجيل"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="admissions@institution.edu.sa"
                dir="ltr"
                leftIcon={<Mail className="w-4 h-4" />}
              />
            </div>

            <Input
              label="الموقع الإلكتروني الرسمي"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://institution.edu.sa"
              dir="ltr"
              leftIcon={<Globe className="w-4 h-4" />}
              helperText="رابط البوابة الإلكترونية الرسمية للطلاب والزوار."
            />
          </div>
        )}

        {/* Tab 5: Accreditation & Tags */}
        {activeTab === 'accreditation' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="جهة الاعتماد والإشراف الأكاديمي"
                value={accreditationBody}
                onChange={(e) => setAccreditationBody(e.target.value)}
                placeholder="مثال: وزارة التعليم، المركز الوطني للتقويم والاعتماد..."
              />

              <Input
                label="رقم الترخيص الرسمي"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="مثال: EDU-LIC-2024-998"
                dir="ltr"
              />
            </div>

            {/* Services Offered Manager */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                الخدمات والمسارات الأكاديمية المقدمة
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={newServiceInput}
                  onChange={(e) => setNewServiceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddService();
                    }
                  }}
                  placeholder="أضف مساراً أو خدمة (مثل: مسار دولي، دبلوم مهني، لغات)..."
                  className="flex-1 min-h-10 rounded-xl border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddService()}
                  className="text-xs"
                >
                  <Plus className="w-3.5 h-3.5 me-1" />
                  إضافة
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200 min-h-12 items-center">
                {servicesOffered.length === 0 ? (
                  <span className="text-xs text-slate-400">لم تُضف خدمات بعد. أضف مسارات الخدمة من الحقل أعلاه.</span>
                ) : (
                  servicesOffered.map((srv) => (
                    <span
                      key={srv}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 shadow-2xs"
                    >
                      <span>{srv}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveService(srv)}
                        className="text-slate-400 hover:text-rose-600 transition-colors"
                        aria-label={`حذف ${srv}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Tags Manager */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                الكلمات المفتاحية والوسوم (Tags)
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="أضف وسماً للبحث (مثل: ثانوي، ستيم، تحصيلي، لغات)..."
                  className="flex-1 min-h-10 rounded-xl border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddTag()}
                  className="text-xs"
                >
                  <Plus className="w-3.5 h-3.5 me-1" />
                  إضافة وسم
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200 min-h-12 items-center">
                {tags.length === 0 ? (
                  <span className="text-xs text-slate-400">لا توجد وسوم مسجلة.</span>
                ) : (
                  tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-800"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-indigo-400 hover:text-rose-600 transition-colors"
                        aria-label={`حذف #${tag}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Super Admin Controls */}
        {isAdmin && activeTab === 'admin' && (
          <div className="space-y-4 p-4 rounded-2xl bg-amber-50/70 border border-amber-200">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-amber-700" />
              <span>صلاحيات الإشراف والحوكمة (خاص بالسوبر أدمن)</span>
            </div>
            <p className="text-xs text-amber-800/80">
              تتيح لك هذه الإعدادات تغيير حالة اعتماد المؤسسة على المنصة، وحالة المراجعة الرسمية للتراخيص، وتحديد ما إذا كانت مميزة في الصفحة الرئيسية.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-amber-200 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={accredited}
                  onChange={(e) => setAccredited(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-900">مؤسسة معتمدة رسميّاً</span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-white border border-amber-200 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-900">تمييز في صدارة المنصة</span>
              </label>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  حالة التحقق والترخيص
                </label>
                <select
                  value={verificationStatus}
                  onChange={(e) => setVerificationStatus(e.target.value as 'approved' | 'pending' | 'rejected')}
                  className="w-full h-10 rounded-xl border border-amber-200 bg-white px-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="approved">معتمد وموثق (Approved)</option>
                  <option value="pending">قيد التدقيق (Pending)</option>
                  <option value="rejected">مرفوض / غير مكتمل (Rejected)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
            className="text-xs text-slate-500"
          >
            إلغاء التعديل
          </Button>

          <Button
            type="submit"
            variant="accent"
            size="md"
            disabled={isSaving}
            className="gap-2 text-xs font-bold shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};

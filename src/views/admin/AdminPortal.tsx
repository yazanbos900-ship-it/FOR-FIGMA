import React, { useState } from 'react';
import { ActiveView, ProviderVerification, ServiceCategory } from '../../types';
import { usePlatformData } from '../../firebase/PlatformDataContext';
import { PortalLayout } from '../../components/layout/PortalLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '../../components/ui/Table';
import { 
  ShieldCheck, 
  Building, 
  Users, 
  FileCheck2, 
  Layers, 
  Check, 
  X, 
  TrendingUp, 
  AlertTriangle, 
  Database, 
  Cloud, 
  RefreshCw,
  Copy,
  ExternalLink,
  Code2,
  CheckCircle2,
  Lock,
  Activity,
  Terminal,
  MapPin,
  Plus,
  Trash2
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';


interface AdminPortalProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView, extraId?: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  activeView,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<string>('verifications');
  const [providerSearch, setProviderSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { 
    providers, 
    services, 
    categories, 
    cities, 
    updateProvider, 
    addCity, 
    removeCity, 
    addCategory, 
    updateCategory, 
    removeCategory, 
    addProvider, 
    removeProvider, 
    catalogLoading, 
    catalogError 
  } = usePlatformData();
  const approvedCount = providers.filter((provider) => provider.accredited || provider.verificationStatus === 'approved').length;
  const verifications: ProviderVerification[] = providers
    .filter((provider) => provider.verificationStatus === 'pending')
    .map((provider) => ({
      id: provider.id,
      institutionName: provider.name,
      category: provider.category,
      licenseNumber: provider.licenseNumber || '',
      submissionDate: provider.submittedAt || provider.createdAt || '',
      status: 'pending',
      city: provider.city,
    }));
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [newCityName, setNewCityName] = useState('');
  const [newCatId, setNewCatId] = useState('');
  const [newCatNameAr, setNewCatNameAr] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  const [newProvName, setNewProvName] = useState('');
  const [newProvCategory, setNewProvCategory] = useState<ServiceCategory>('schools');
  const [newProvCity, setNewProvCity] = useState('دمشق');
  const [newProvPhone, setNewProvPhone] = useState('0933000000');
  const [newProvEmail, setNewProvEmail] = useState('info@institution.edu.sy');

  const [showAddCityModal, setShowAddCityModal] = useState(false);
  const [isSubmittingCity, setIsSubmittingCity] = useState(false);
  const [cityToDelete, setCityToDelete] = useState<string | null>(null);
  const [isDeletingCity, setIsDeletingCity] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; nameAr: string } | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingProvider, setIsDeletingProvider] = useState(false);

  const handleOpenAddCityModal = () => {
    setNewCityName('');
    setShowAddCityModal(true);
  };

  const handleModalAddCity = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newCityName.trim();
    if (!trimmed) {
      setActionNotice('يرجى إدخال اسم المدينة المراد إضافتها.');
      setTimeout(() => setActionNotice(null), 4000);
      return;
    }
    setIsSubmittingCity(true);
    try {
      await addCity(trimmed);
      setNewCityName('');
      setShowAddCityModal(false);
      setActionNotice(`تمت إضافة مدينة «${trimmed}» بنجاح وتحديث فلاتر المنصة.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : 'تعذر إضافة المدينة.');
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setIsSubmittingCity(false);
    }
  };

  const handleConfirmDeleteCity = async () => {
    if (!cityToDelete) return;
    const target = cityToDelete;
    setIsDeletingCity(true);
    try {
      await removeCity(target);
      setCityToDelete(null);
      setActionNotice(`تم حذف مدينة «${target}» بنجاح من فلاتر وقوائم المنصة.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : 'تعذر حذف المدينة.');
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setIsDeletingCity(false);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const { id, nameAr } = categoryToDelete;
    setIsDeletingCategory(true);
    try {
      await removeCategory(id);
      setCategoryToDelete(null);
      setActionNotice(`تم حذف القطاع «${nameAr}» بنجاح.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : 'تعذر حذف القطاع.');
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleConfirmDeleteProvider = async () => {
    if (!providerToDelete) return;
    const { id, name } = providerToDelete;
    setIsDeletingProvider(true);
    try {
      await removeProvider(id);
      setProviderToDelete(null);
      setActionNotice(`تم حذف مؤسسة «${name}» بنجاح.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err) {
      setActionNotice(err instanceof Error ? err.message : 'تعذر حذف المؤسسة.');
      setTimeout(() => setActionNotice(null), 4000);
    } finally {
      setIsDeletingProvider(false);
    }
  };

  const sidebarItems = [
    {
      id: 'verifications',
      label: 'طلبات الاعتماد والتحقق',
      icon: <FileCheck2 className="w-4 h-4" />,
    },
    {
      id: 'all-providers',
      label: 'دليل المؤسسات والتعديل المباشر',
      icon: <Building className="w-4 h-4" />,
      badge: providers.length,
    },
    {
      id: 'categories',
      label: 'إدارة القطاعات التعليمية',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'cities',
      label: 'إدارة المدن والفلاتر',
      icon: <MapPin className="w-4 h-4" />,
      badge: cities.length,
    },
  ];

  const handleUpdateStatus = (id: string, newStatus: 'approved' | 'rejected') => {
    const item = verifications.find((v) => v.id === id);
    void updateProvider(id, { verificationStatus: newStatus, accredited: newStatus === 'approved' })
      .then(() => {
        setActionNotice(newStatus === 'approved'
          ? `تم اعتماد «${item?.institutionName}» وتفعيل ظهورها في الدليل.`
          : `تم رفض طلب «${item?.institutionName}».`);
        setTimeout(() => setActionNotice(null), 5000);
      })
      .catch((error) => setActionNotice(error instanceof Error ? error.message : 'تعذر تحديث طلب الاعتماد.'));
  };

  const pendingCount = verifications.filter((v) => v.status === 'pending').length;

  return (
    <PortalLayout
      roleTitle="بوابة الإدارة والحوكمة"
      roleSubtitle="الإشراف العام وتدقيق تراخيص مزودي الخدمة"
      roleBadge="المشرف العام"
      activeView={activeView}
      onNavigate={onNavigate}
      sidebarItems={sidebarItems}
      activeTab={activeTab}
      onSelectTab={setActiveTab}
    >
      <div className="space-y-6">
        {/* Admin Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <span>لوحة الإدارة</span>
              <span aria-hidden="true">/</span>
              <span className="text-slate-800 font-medium">حوكمة المنظومة</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              مركز التدقيق وحوكمة منصة أعالي
            </h1>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>المنصة متصلة وجاهزة</span>
            </span>
          </div>
        </div>

        {actionNotice && (
          <Alert type="info" onClose={() => setActionNotice(null)}>
            {actionNotice}
          </Alert>
        )}

        {/* Global Statistics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-medium text-slate-500 mb-1">طلبات الاعتماد المعلقة</div>
            <div className="text-2xl font-bold text-amber-600 tabular-nums">{pendingCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">بحاجة لتدقيق الوثائق</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-medium text-slate-500 mb-1">المؤسسات المعتمدة</div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{approvedCount}</div>
            <div className="text-[11px] text-slate-400 mt-1">من سجلات مزودي الخدمة</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-medium text-slate-500 mb-1">الخدمات المفهرسة</div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{services.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">البرامج والخدمات المنشورة</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-xs font-medium text-slate-500 mb-1">التصنيفات التعليمية</div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{categories.length}</div>
            <div className="text-[11px] text-slate-400 mt-1">التصنيفات المعتمدة بالمنصة</div>
          </div>
        </div>

        {/* Tab 1: Verifications Queue */}
        {activeTab === 'verifications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">قائمة تدقيق تراخيص مزودي الخدمات الجدد</h2>
                <p className="text-xs text-slate-500">التأكد من التراخيص الرسمية قبل منح شارة الاعتماد للمؤسسة</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>اسم المؤسسة / المركز</TableHeaderCell>
                    <TableHeaderCell>التصنيف</TableHeaderCell>
                    <TableHeaderCell>رقم الترخيص</TableHeaderCell>
                    <TableHeaderCell>المدينة</TableHeaderCell>
                    <TableHeaderCell>تاريخ التقديم</TableHeaderCell>
                    <TableHeaderCell>الحالة</TableHeaderCell>
                    <TableHeaderCell>إجراء المشرف</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {verifications.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-semibold text-slate-900">
                        {v.institutionName}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {categories.find((c) => c.id === v.category)?.nameAr}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {v.licenseNumber}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{v.city}</TableCell>
                      <TableCell className="text-xs text-slate-500">{v.submissionDate}</TableCell>
                      <TableCell>
                        {v.status === 'pending' && <Badge variant="warning">قيد التدقيق</Badge>}
                        {v.status === 'approved' && <Badge variant="success">معتمد</Badge>}
                        {v.status === 'rejected' && <Badge variant="danger">مرفوض</Badge>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {v.status === 'pending' ? (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                className="text-xs py-1 px-2.5 bg-emerald-700 hover:bg-emerald-800"
                                onClick={() => handleUpdateStatus(v.id, 'approved')}
                                leftIcon={<Check className="w-3 h-3" />}
                              >
                                اعتماد
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                className="text-xs py-1 px-2.5"
                                onClick={() => handleUpdateStatus(v.id, 'rejected')}
                                leftIcon={<X className="w-3 h-3" />}
                              >
                                رفض
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">تم البت</span>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs py-1 px-2 text-indigo-700 hover:text-indigo-900 border-indigo-200 hover:bg-indigo-50"
                            onClick={() => onNavigate('provider-profile', v.id)}
                            title="فتح صفحة المؤسسة وتعديل بياناتها كـ Super Admin"
                          >
                            <ExternalLink className="w-3 h-3 me-1" />
                            <span>تعديل الصفحة</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Tab 2: All Providers Directory & Direct Edit */}
        {activeTab === 'all-providers' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">دليل مزودي الخدمات وإدارتهم المباشرة</h2>
                <p className="text-xs text-slate-500">
                  بصفتك المشرف العام (Super Admin)، يمكنك إضافة مؤسسة جديدة، أو تعديل بيانات وحذف أي مؤسسة من المنصة.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="text-xs h-9 gap-1.5 cursor-pointer"
                  onClick={() => setShowAddProviderModal(true)}
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>إضافة مؤسسة جديدة</span>
                </Button>

                <input
                  type="text"
                  placeholder="بحث باسم المؤسسة أو المدينة..."
                  value={providerSearch}
                  onChange={(e) => setProviderSearch(e.target.value)}
                  className="min-h-9 px-3 text-xs rounded-xl border border-slate-300 w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="min-h-9 px-3 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <option value="all">كافة القطاعات</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.nameAr}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers
                .filter((p) => {
                  const matchSearch =
                    !providerSearch.trim() ||
                    p.name.toLowerCase().includes(providerSearch.toLowerCase()) ||
                    (p.nameEn && p.nameEn.toLowerCase().includes(providerSearch.toLowerCase())) ||
                    p.city.toLowerCase().includes(providerSearch.toLowerCase()) ||
                    (p.licenseNumber && p.licenseNumber.includes(providerSearch));
                  const matchCategory = categoryFilter === 'all' || p.category === categoryFilter;
                  return matchSearch && matchCategory;
                })
                .map((provider) => {
                  const isApproved = provider.accredited || provider.verificationStatus === 'approved';
                  const providerServicesCount = services.filter((s) => s.providerId === provider.id).length;

                  return (
                    <div
                      key={provider.id}
                      className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-indigo-950 text-white flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden shadow-2xs">
                              {provider.logoUrl ? (
                                <img
                                  src={provider.logoUrl}
                                  alt={provider.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <span>{provider.name[0] || 'أ'}</span>
                              )}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm leading-tight line-clamp-1">
                                {provider.name}
                              </h3>
                              <span className="text-[11px] text-slate-500 block">
                                {categories.find((c) => c.id === provider.category)?.nameAr || provider.category}
                              </span>
                            </div>
                          </div>

                          <Badge variant={isApproved ? 'success' : provider.verificationStatus === 'rejected' ? 'danger' : 'warning'}>
                            {isApproved ? 'معتمد' : provider.verificationStatus === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-400 block">المدينة:</span>
                            <span className="font-semibold text-slate-800">{provider.city}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">سنة التأسيس:</span>
                            <span className="font-semibold text-slate-800">
                              {provider.establishedYear ? `${provider.establishedYear} مـ` : 'غير مسجلة'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">رقم الترخيص:</span>
                            <span className="font-mono font-semibold text-slate-800 truncate block">
                              {provider.licenseNumber || 'غير مسجل'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">البرامج المنشورة:</span>
                            <span className="font-semibold text-indigo-700">{providerServicesCount} برامج</span>
                          </div>
                        </div>

                        {provider.address && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            <span className="font-semibold text-slate-600">المقر: </span>
                            {provider.address}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <Button
                          variant="accent"
                          size="sm"
                          className="flex-1 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
                          onClick={() => onNavigate('provider-profile', provider.id)}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>تعديل الصفحة</span>
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="text-xs px-2.5 font-bold cursor-pointer"
                          onClick={() => setProviderToDelete({ id: provider.id, name: provider.name })}
                          title="حذف المؤسسة"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Tab 2: Categories Management */}
        {activeTab === 'categories' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">إدارة القطاعات والتصنيفات التعليمية</h2>
                <p className="text-xs text-slate-500 mt-0.5">يمكنك إضافة قطاعات جديدة أو تعديل وحذف القطاعات الحالية في المنصة.</p>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCatId.trim() || !newCatNameAr.trim()) {
                  setActionNotice('يرجى إدخال معرف التصنيف بالإنجليزية واسمه بالعربية.');
                  setTimeout(() => setActionNotice(null), 4000);
                  return;
                }
                try {
                  await addCategory({
                    id: newCatId.trim(),
                    nameAr: newCatNameAr.trim(),
                    nameEn: newCatId.trim(),
                    descriptionAr: newCatDesc.trim(),
                  });
                  setNewCatId('');
                  setNewCatNameAr('');
                  setNewCatDesc('');
                  setActionNotice('تمت إضافة القطاع التعليمي بنجاح.');
                  setTimeout(() => setActionNotice(null), 4000);
                } catch (err) {
                  setActionNotice(err instanceof Error ? err.message : 'تعذر إضافة القطاع.');
                  setTimeout(() => setActionNotice(null), 4000);
                }
              }}
              className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end p-4 bg-slate-50 rounded-xl border border-slate-200"
            >
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">معرف التصنيف (إنجليزي):</label>
                <input
                  type="text"
                  placeholder="e.g. academies"
                  value={newCatId}
                  onChange={(e) => setNewCatId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">اسم القطاع بالعربية:</label>
                <input
                  type="text"
                  placeholder="مثال: أكاديميات متخصصة"
                  value={newCatNameAr}
                  onChange={(e) => setNewCatNameAr(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">وصف مختصر:</label>
                <input
                  type="text"
                  placeholder="وصف القطاع..."
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <Button type="submit" variant="primary" size="md" className="w-full h-10">
                  إضافة قطاع جديد
                </Button>
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <div key={cat.id} className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-4 shadow-2xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{cat.nameAr}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600">{cat.id}</span>
                    </div>
                    {cat.descriptionAr && <p className="text-xs text-slate-500">{cat.descriptionAr}</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="success">مفعل</Badge>
                    <button
                      type="button"
                      onClick={() => setCategoryToDelete({ id: cat.id, nameAr: cat.nameAr })}
                      className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="حذف القطاع"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Provider Modal */}
        {showAddProviderModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-base">إضافة مؤسسة تعليمية جديدة</h3>
                <button type="button" onClick={() => setShowAddProviderModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newProvName.trim()) {
                    alert('يرجى إدخال اسم المؤسسة.');
                    return;
                  }
                  try {
                    await addProvider({
                      name: newProvName.trim(),
                      nameEn: newProvName.trim(),
                      category: newProvCategory,
                      city: newProvCity,
                      rating: 5.0,
                      reviewsCount: 0,
                      description: 'مؤسسة تعليمية معتمدة عبر منصة أعالي.',
                      accredited: true,
                      featured: false,
                      contactEmail: newProvEmail.trim() || 'info@institution.edu.sa',
                      contactPhone: newProvPhone.trim() || '0500000000',
                      servicesOffered: [],
                      tags: ['معتمد'],
                      verificationStatus: 'approved',
                      establishedYear: 2020,
                    });
                    setShowAddProviderModal(false);
                    setNewProvName('');
                    setActionNotice('تمت إضافة المؤسسة التعليمية بنجاح.');
                    setTimeout(() => setActionNotice(null), 4000);
                  } catch (err) {
                    setActionNotice(err instanceof Error ? err.message : 'تعذر إضافة المؤسسة.');
                    setTimeout(() => setActionNotice(null), 4000);
                  }
                }}
                className="space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">اسم المؤسسة أو المركز:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أكاديمية المستقبل للتدريب"
                    value={newProvName}
                    onChange={(e) => setNewProvName(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">القطاع:</label>
                    <select
                      value={newProvCategory}
                      onChange={(e) => setNewProvCategory(e.target.value as ServiceCategory)}
                      className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.nameAr}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">المدينة:</label>
                    <select
                      value={newProvCity}
                      onChange={(e) => setNewProvCity(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      {cities.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">رقم الهاتف:</label>
                    <input
                      type="text"
                      value={newProvPhone}
                      onChange={(e) => setNewProvPhone(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">البريد الإلكتروني:</label>
                    <input
                      type="email"
                      value={newProvEmail}
                      onChange={(e) => setNewProvEmail(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-300 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddProviderModal(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    حفظ وإضافة المؤسسة
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab: Cities Management */}
        {activeTab === 'cities' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">إدارة المدن المتاحة في فلاتر المنصة</h2>
                <p className="text-xs text-slate-500 mt-0.5">يمكنك إضافة أو حذف المدن التي تظهر في قائمة الفلاتر وصفحات المؤسسات لجميع زوار المنصة.</p>
              </div>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleOpenAddCityModal}
                className="gap-2 shrink-0 cursor-pointer shadow-2xs font-bold"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة مدينة جديدة</span>
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
              <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="اسم المدينة الجديدة (مثال: دمشق، حلب، حمص، اللاذقية...)"
                  value={newCityName}
                  onChange={(e) => setNewCityName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newCityName.trim()) {
                        void handleModalAddCity(e);
                      } else {
                        handleOpenAddCityModal();
                      }
                    }
                  }}
                  className="flex-1 h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300/60"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={(e) => {
                    if (newCityName.trim()) {
                      void handleModalAddCity(e);
                    } else {
                      handleOpenAddCityModal();
                    }
                  }}
                  className="h-11 px-5 cursor-pointer font-bold shrink-0"
                >
                  إضافة مدينة
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleOpenAddCityModal}
                className="h-11 px-4 cursor-pointer text-xs font-semibold shrink-0 gap-1.5 bg-white hover:bg-slate-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>فتح استمارة الإضافة</span>
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
              {cities.map((city) => (
                <div
                  key={city}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300 flex items-center justify-between gap-2 shadow-2xs transition-all"
                >
                  <span className="text-xs font-semibold text-slate-800 truncate flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>{city}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCityToDelete(city)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title={`حذف مدينة "${city}"`}
                    aria-label={`حذف مدينة "${city}"`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add City Form */}
      <Modal
        isOpen={showAddCityModal}
        onClose={() => setShowAddCityModal(false)}
        title="استمارة إضافة مدينة جديدة"
        description="أدخل اسم المدينة لإضافتها مباشرة إلى قائمة المدن وفلاتر البحث في المنصة."
        maxWidth="md"
      >
        <form onSubmit={handleModalAddCity} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              اسم المدينة <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="مثال: دمشق، حلب، حمص، اللاذقية، طرطوس، حماة..."
              value={newCityName}
              onChange={(e) => setNewCityName(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-300 px-4 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-300/60 bg-white"
              autoFocus
            />
          </div>

          <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-indigo-950 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span>بمجرد الحفظ، ستظهر المدينة فوراً في قائمة الفلاتر للزوار والطلاب وكذلك في استمارات تسجيل مزودي الخدمات.</span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddCityModal(false)}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmittingCity}
            >
              {isSubmittingCity ? 'جارٍ الحفظ...' : 'حفظ وإضافة المدينة'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirm Delete City */}
      <Modal
        isOpen={Boolean(cityToDelete)}
        onClose={() => setCityToDelete(null)}
        title="تأكيد حذف المدينة"
        description="تأكيد رغبتك في إزالة المدينة من قائمة الفلاتر والمدن المتاحة."
        maxWidth="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCityToDelete(null)}
              disabled={isDeletingCity}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleConfirmDeleteCity}
              disabled={isDeletingCity}
            >
              {isDeletingCity ? 'جارٍ الحذف...' : 'نعم، حذف المدينة'}
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-xs text-slate-600">
          <p>
            هل أنت متأكد من حذف مدينة <strong className="font-bold text-slate-900">«{cityToDelete}»</strong> من فلاتر المنصة؟
          </p>
          <p className="text-slate-500 text-[11px]">
            لن تظهر المدينة في خيارات البحث الجديدة، بينما تبقى سجلات المؤسسات المسجلة سابقاً محفوظة.
          </p>
        </div>
      </Modal>

      {/* Modal: Confirm Delete Category */}
      <Modal
        isOpen={Boolean(categoryToDelete)}
        onClose={() => setCategoryToDelete(null)}
        title="تأكيد حذف القطاع التعليمي"
        description="تأكيد إزالة هذا القطاع من المنصة."
        maxWidth="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCategoryToDelete(null)}
              disabled={isDeletingCategory}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleConfirmDeleteCategory}
              disabled={isDeletingCategory}
            >
              {isDeletingCategory ? 'جارٍ الحذف...' : 'نعم، حذف القطاع'}
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-xs text-slate-600">
          <p>
            هل أنت متأكد من حذف القطاع <strong className="font-bold text-slate-900">«{categoryToDelete?.nameAr}»</strong>؟
          </p>
        </div>
      </Modal>

      {/* Modal: Confirm Delete Provider */}
      <Modal
        isOpen={Boolean(providerToDelete)}
        onClose={() => setProviderToDelete(null)}
        title="تأكيد حذف المؤسسة التعليمية"
        description="تأكيد رغبتك في إزالة هذه المؤسسة من الدليل."
        maxWidth="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setProviderToDelete(null)}
              disabled={isDeletingProvider}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleConfirmDeleteProvider}
              disabled={isDeletingProvider}
            >
              {isDeletingProvider ? 'جارٍ الحذف...' : 'نعم، حذف المؤسسة'}
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-xs text-slate-600">
          <p>
            هل أنت متأكد من رغبتك في حذف مؤسسة <strong className="font-bold text-slate-900">«{providerToDelete?.name}»</strong> نهائياً؟
          </p>
        </div>
      </Modal>
    </PortalLayout>
  );
};

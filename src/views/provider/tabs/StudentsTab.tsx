import React, { useMemo, useState } from 'react';
import {
  Download,
  Search,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  ShieldCheck,
  Calendar,
  Mail,
  Phone,
  BookOpen,
  DollarSign,
  Info
} from 'lucide-react';
import { EnrolledStudent } from '../types';
import { EducationalService } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

interface StudentsTabProps {
  students: EnrolledStudent[];
  services: EducationalService[];
  onUpdateStatus: (
    enrollmentId: string,
    newStatus: 'confirmed' | 'rejected' | 'cancelled' | 'pending',
    options?: {
      paymentStatus?: 'paid' | 'pending' | 'installments' | 'failed' | 'refunded' | 'overdue';
    }
  ) => Promise<void>;
  onShowToast: (msg: string) => void;
}

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export const StudentsTab: React.FC<StudentsTabProps> = ({
  students,
  services,
  onUpdateStatus,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected' | 'cancelled'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'installments' | 'pending'>('all');
  const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmModalData, setConfirmModalData] = useState<{
    student: EnrolledStudent;
    service?: EducationalService;
    isZeroSeats: boolean;
  } | null>(null);

  // Map services by ID for fast lookup
  const servicesMap = useMemo(() => {
    const map = new Map<string, EducationalService>();
    services.forEach((s) => map.set(s.id, s));
    return map;
  }, [services]);

  const filteredStudents = useMemo(() => students.filter((student) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || [student.name, student.programTitle, student.phone, student.email]
      .some((value) => value.toLowerCase().includes(query));

    const currentStatus = student.enrollmentStatus || 'pending';
    const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;
    const matchesPayment = paymentFilter === 'all' || student.paymentStatus === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  }), [students, searchQuery, statusFilter, paymentFilter]);

  const handleExportCSV = () => {
    const rows = [
      ['اسم الطالب', 'البرنامج', 'تاريخ الطلب', 'قيمة الطلب', 'حالة الطلب', 'حالة الدفع', 'الهاتف', 'البريد الإلكتروني'],
      ...filteredStudents.map((student) => [
        student.name,
        student.programTitle,
        student.enrollDate,
        student.amount ?? '',
        student.enrollmentStatus === 'confirmed' ? 'مقبول ومثبت' : student.enrollmentStatus === 'rejected' ? 'مرفوض' : student.enrollmentStatus === 'cancelled' ? 'ملغي' : 'بانتظار التثبيت',
        student.paymentStatus,
        student.phone,
        student.email,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'enrollments.csv';
    link.click();
    URL.revokeObjectURL(url);
    onShowToast(`تم تصدير ${filteredStudents.length} سجل بنجاح.`);
  };

  // Trigger Confirmation Flow
  const triggerConfirmFlow = (student: EnrolledStudent) => {
    const service = student.courseId ? servicesMap.get(student.courseId) : undefined;
    const isZeroSeats = service ? service.seatsAvailable <= 0 : false;
    setConfirmModalData({ student, service, isZeroSeats });
  };

  const executeConfirmStudent = async (markPaid = false) => {
    if (!confirmModalData) return;
    const { student } = confirmModalData;
    setProcessingId(student.id);
    setConfirmModalData(null);
    try {
      await onUpdateStatus(student.id, 'confirmed', {
        paymentStatus: markPaid ? 'paid' : student.paymentStatus,
      });
      if (selectedStudent?.id === student.id) {
        setSelectedStudent((prev) => prev ? { ...prev, enrollmentStatus: 'confirmed', paymentStatus: markPaid ? 'paid' : prev.paymentStatus } : null);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectStudent = async (student: EnrolledStudent) => {
    setProcessingId(student.id);
    try {
      await onUpdateStatus(student.id, 'rejected');
      if (selectedStudent?.id === student.id) {
        setSelectedStudent((prev) => prev ? { ...prev, enrollmentStatus: 'rejected' } : null);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelStudent = async (student: EnrolledStudent) => {
    setProcessingId(student.id);
    try {
      await onUpdateStatus(student.id, 'cancelled');
      if (selectedStudent?.id === student.id) {
        setSelectedStudent((prev) => prev ? { ...prev, enrollmentStatus: 'cancelled' } : null);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = students.filter((s) => !s.enrollmentStatus || s.enrollmentStatus === 'pending').length;
  const confirmedCount = students.filter((s) => s.enrollmentStatus === 'confirmed').length;
  const totalAvailableSeats = services.reduce((acc, s) => acc + (s.seatsAvailable || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner explaining the confirmed seats logic */}
      <div className="bg-gradient-to-l from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-indigo-800/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
                آلية إدارة وتثبيت المقاعد
              </span>
              <span className="text-xs text-indigo-200">مزامنة سحابية لحظية</span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white">
              إدارة طلبات التحاق وقبول الطلاب
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
              عند تسجيل الطالب في أي برنامج، يُسجل طلبه كطلب <span className="text-amber-300 font-semibold">«معلق بانتظار المراجعة»</span> ولا تُخصم الطاقة الاستيعابية مطلقاً إلا بعد النقر على <span className="text-emerald-300 font-semibold">«قبول وتثبيت الطالب»</span> من هذه القائمة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="text-xs gap-1.5 text-white border-white/30 hover:bg-white/10"
              disabled={!filteredStudents.length}
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير CSV</span>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-medium">إجمالي طلبات التسجيل</span>
            <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{students.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-amber-200 bg-amber-50/30 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-amber-800 text-xs font-bold">بانتظار القبول والتثبيت</span>
            <div className="text-2xl font-black text-amber-700 mt-1 tabular-nums">{pendingCount}</div>
            <span className="text-[10px] text-amber-600 block mt-0.5">لم يتم حسم المقاعد بعد</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-emerald-800 text-xs font-bold">طلاب مثبتون ومقبولون</span>
            <div className="text-2xl font-black text-emerald-700 mt-1 tabular-nums">{confirmedCount}</div>
            <span className="text-[10px] text-emerald-600 block mt-0.5">مقاعد محجوزة رسمياً</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs font-medium">المقاعد الشاغرة المتبقية</span>
            <div className="text-2xl font-black text-indigo-700 mt-1 tabular-nums">{totalAvailableSeats}</div>
            <span className="text-[10px] text-slate-400 block mt-0.5">عبر كافة البرامج النشطة</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="ابحث باسم الطالب، البرنامج، رقم الهاتف، أو البريد الإلكتروني..."
            className="w-full ps-9 pe-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs w-full md:w-auto shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">حالة التثبيت:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value="all">كل الحالات</option>
              <option value="pending">بانتظار القبول والتثبيت ({pendingCount})</option>
              <option value="confirmed">مثبت ومقبول ({confirmedCount})</option>
              <option value="rejected">مرفوض</option>
              <option value="cancelled">ملغي</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 text-[11px]">حالة الدفع:</span>
            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value as typeof paymentFilter)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value="all">كل حالات الدفع</option>
              <option value="paid">مدفوع</option>
              <option value="pending">بانتظار الدفع</option>
              <option value="installments">أقساط</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-2xs">
        <table className="w-full text-start text-xs">
          <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3.5 font-bold text-start">الطالب المسجل</th>
              <th className="px-4 py-3.5 font-bold text-start">البرنامج والمقاعد المتبقية</th>
              <th className="px-4 py-3.5 font-bold text-start">تاريخ الطلب</th>
              <th className="px-4 py-3.5 font-bold text-start">الرسوم المسجلة</th>
              <th className="px-4 py-3.5 font-bold text-start">حالة الاعتماد والتثبيت</th>
              <th className="px-4 py-3.5 font-bold text-start">حالة الدفع</th>
              <th className="px-4 py-3.5 font-bold text-center">إجراءات القبول والتثبيت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.map((student) => {
              const service = student.courseId ? servicesMap.get(student.courseId) : undefined;
              const seatsLeft = service ? service.seatsAvailable : undefined;
              const isPending = !student.enrollmentStatus || student.enrollmentStatus === 'pending';
              const isConfirmed = student.enrollmentStatus === 'confirmed';
              const isRejected = student.enrollmentStatus === 'rejected';
              const isCancelled = student.enrollmentStatus === 'cancelled';
              const isBusy = processingId === student.id;

              return (
                <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Student Info */}
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-slate-900">{student.name}</div>
                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                      {student.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{student.phone}</span>}
                      {student.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" />{student.email}</span>}
                    </div>
                  </td>

                  {/* Program & Seat count */}
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-slate-800 line-clamp-1">{student.programTitle}</div>
                    {seatsLeft !== undefined ? (
                      <div className="text-[11px] mt-0.5">
                        <span className={`inline-flex items-center gap-1 font-medium ${seatsLeft > 0 ? 'text-indigo-700' : 'text-rose-700 font-bold'}`}>
                          {seatsLeft > 0 ? `المتاح حالياً: ${seatsLeft} مقعد` : 'اكتملت المقاعد (0 مقاعد متبقية)'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">برنامج تعليمي</span>
                    )}
                  </td>

                  {/* Request Date */}
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{student.enrollDate || '—'}</span>
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3.5 text-slate-800 font-bold whitespace-nowrap">
                    {typeof student.amount === 'number'
                      ? `${student.amount.toLocaleString('ar-SY')} ل.س`
                      : '—'}
                  </td>

                  {/* Enrollment Status */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    {isPending && (
                      <Badge variant="warning" className="gap-1 px-2.5 py-1">
                        <Clock className="w-3 h-3" />
                        <span>معلق بانتظار التثبيت</span>
                      </Badge>
                    )}
                    {isConfirmed && (
                      <Badge variant="success" className="gap-1 px-2.5 py-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>مقبول ومثبت رسمياً</span>
                      </Badge>
                    )}
                    {isRejected && (
                      <Badge variant="danger" className="gap-1 px-2.5 py-1">
                        <XCircle className="w-3 h-3" />
                        <span>طلب مرفوض</span>
                      </Badge>
                    )}
                    {isCancelled && (
                      <Badge variant="neutral" className="gap-1 px-2.5 py-1">
                        <span>طلب ملغي</span>
                      </Badge>
                    )}
                  </td>

                  {/* Payment Status */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <Badge variant={student.paymentStatus === 'paid' ? 'success' : student.paymentStatus === 'failed' || student.paymentStatus === 'overdue' ? 'danger' : student.paymentStatus === 'refunded' ? 'neutral' : 'warning'}>
                      {student.paymentStatus === 'paid' ? 'مدفوع' : student.paymentStatus === 'failed' ? 'فشل الدفع' : student.paymentStatus === 'overdue' ? 'متأخر' : student.paymentStatus === 'installments' ? 'أقساط' : student.paymentStatus === 'refunded' ? 'مسترد' : 'بانتظار الدفع'}
                    </Badge>
                  </td>

                  {/* Actions Column */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={isBusy}
                            onClick={() => triggerConfirmFlow(student)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 gap-1 shadow-2xs"
                            title="قبول وتثبيت الطالب وحسم مقعد من البرنامج"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>قبول وتثبيت الطالب</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => handleRejectStudent(student)}
                            className="text-rose-600 border-rose-200 hover:bg-rose-50 text-[11px] px-2.5 py-1.5 gap-1"
                            title="رفض الطلب"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>رفض</span>
                          </Button>
                        </>
                      )}

                      {isConfirmed && (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            تم تثبيت المقعد
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => handleCancelStudent(student)}
                            className="text-slate-500 hover:text-rose-600 border-slate-200 text-[11px] px-2 py-1"
                            title="إلغاء التثبيت وإعادة المقعد المتاح للبرنامج"
                          >
                            إلغاء التثبيت
                          </Button>
                        </div>
                      )}

                      {(isRejected || isCancelled) && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => triggerConfirmFlow(student)}
                          className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-[11px] px-2.5 py-1.5 gap-1"
                          title="إعادة النظر وقبول تثبيت الطالب"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>إعادة التثبيت</span>
                        </Button>
                      )}

                      {/* Detail View Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedStudent(student)}
                        className="text-slate-400 hover:text-slate-700 p-1.5"
                        title="عرض كامل تفاصيل الطلب"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredStudents.length === 0 && (
          <div className="p-12 text-center text-sm text-slate-500 space-y-2">
            <Users className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">
              {students.length ? 'لا توجد نتائج مطابقة لمعايير البحث والفلترة.' : 'لا توجد طلبات تسجيل حتى الآن.'}
            </p>
            <p className="text-xs text-slate-400">
              عندما يسجل أي طالب على أي إعلان أو دورة، سيظهر طلبه هنا فوراً معلقاً حتى تقوم بتثبيته.
            </p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  تأكيد قبول وتثبيت تسجيل الطالب
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تثبيت الطالب سيخصم مقعداً واحداً من المقاعد الشاغرة للبرنامج في قاعدة البيانات فوراً.
                </p>
              </div>
            </div>

            {/* Program & Seat info */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">اسم الطالب:</span>
                <span className="font-bold text-slate-900">{confirmModalData.student.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">البرنامج:</span>
                <span className="font-bold text-indigo-700">{confirmModalData.student.programTitle}</span>
              </div>
              {confirmModalData.service && (
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-slate-600 font-medium">المقاعد الشاغرة المتبقية:</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="tabular-nums text-slate-800">{confirmModalData.service.seatsAvailable} مقعد</span>
                    <span className="text-slate-400">←</span>
                    <span className="tabular-nums text-emerald-700 font-extrabold">{Math.max(0, confirmModalData.service.seatsAvailable - 1)} مقعد</span>
                  </div>
                </div>
              )}
            </div>

            {/* Warning if 0 seats */}
            {confirmModalData.isZeroSeats && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">تنبيه: الطاقة الاستيعابية مكتملة (0 مقاعد متبقية)</span>
                  <span>البرنامج لا يحتوي على مقاعد شاغرة حالياً. سيتم قبول الطالب بصفة استثنائية أو يمكنك زيادة المقاعد في إعدادات البرنامج.</span>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmModalData(null)}
                className="w-full sm:w-auto text-xs"
              >
                إلغاء التراجع
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => executeConfirmStudent(false)}
                className="w-full sm:w-auto text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-bold"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>تأكيد القبول وحسم المقعد</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Full Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedStudent.name}</h3>
                  <span className="text-[11px] text-slate-400">طلب تسجيل برقم: {selectedStudent.id.slice(0, 10)}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedStudent(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">البرنامج التعليمي:</span>
                  <span className="font-bold text-slate-900">{selectedStudent.programTitle}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">تاريخ الطلب:</span>
                  <span className="font-semibold text-slate-800">{selectedStudent.enrollDate || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">الهاتف للتواصل:</span>
                  <span className="font-semibold text-slate-800">{selectedStudent.phone || 'غير مسجل'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">البريد الإلكتروني:</span>
                  <span className="font-semibold text-slate-800">{selectedStudent.email || 'غير مسجل'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">الرسوم:</span>
                  <span className="font-bold text-slate-900">
                    {typeof selectedStudent.amount === 'number' ? `${selectedStudent.amount.toLocaleString('ar-SY')} ل.س` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">حالة التثبيت:</span>
                  <span className="font-bold">
                    {selectedStudent.enrollmentStatus === 'confirmed' ? 'مقبول ومثبت (مقعد محجوز)' : selectedStudent.enrollmentStatus === 'rejected' ? 'مرفوض' : selectedStudent.enrollmentStatus === 'cancelled' ? 'ملغي' : 'معلق بانتظار التثبيت'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-2 text-indigo-900">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  يتم تحديث المقاعد الشاغرة وإرسال حالة الحجز للطالب بشكل مباشر عبر المنصة فور اعتماد التثبيت.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {(!selectedStudent.enrollmentStatus || selectedStudent.enrollmentStatus === 'pending') && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const s = selectedStudent;
                      setSelectedStudent(null);
                      void handleRejectStudent(s);
                    }}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
                  >
                    رفض الطلب
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      const s = selectedStudent;
                      setSelectedStudent(null);
                      triggerConfirmFlow(s);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>قبول وتثبيت الطالب</span>
                  </Button>
                </>
              )}

              {selectedStudent.enrollmentStatus === 'confirmed' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const s = selectedStudent;
                    setSelectedStudent(null);
                    void handleCancelStudent(s);
                  }}
                  className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs"
                >
                  إلغاء التثبيت وإعادة المقعد
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedStudent(null)}
                className="text-xs"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

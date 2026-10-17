import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { useAuth } from './AuthContext';
import {
  CourseBooking,
  EducationalProvider,
  EducationalService,
  ServiceCategory,
  StudentInquiry,
} from '../types';
import { StaffMember } from '../views/provider/types';
import { ProviderReviewItem } from '../views/provider/types';

export interface InquiryRecord extends StudentInquiry {
  studentId: string;
  providerId: string;
  serviceId: string;
  studentEmail?: string;
  phone?: string;
  responseNote?: string;
  interviewDate?: string;
  internalNotes?: string;
}

interface PlatformDataContextValue {
  services: EducationalService[];
  providers: EducationalProvider[];
  categories: ServiceCategoryRecord[];
  cities: string[];
  enrollments: CourseBooking[];
  inquiries: InquiryRecord[];
  teamMembers: StaffMember[];
  reviews: ProviderReviewItem[];
  savedServiceIds: string[];
  catalogLoading: boolean;
  catalogError: string | null;
  dataError: string | null;
  saveService: (service: Partial<EducationalService>, id?: string) => Promise<string>;
  updateProvider: (id: string, changes: Partial<EducationalProvider>) => Promise<void>;
  submitProviderVerification: (details: { licenseNumber: string; city: string }) => Promise<void>;
  saveProviderProfile: (details: { name: string; city: string; description: string; phone: string; email: string; logoUrl?: string; coverImageUrl?: string }) => Promise<void>;
  addTeamMember: (member: Omit<StaffMember, 'id'>) => Promise<void>;
  replyToReview: (reviewId: string, text: string, responder: string) => Promise<void>;
  removeService: (id: string) => Promise<void>;
  updateService: (id: string, changes: Partial<EducationalService>) => Promise<void>;
  createInquiry: (service: EducationalService, message: string) => Promise<void>;
  updateInquiry: (id: string, changes: Pick<InquiryRecord, 'status'> & Partial<Pick<InquiryRecord, 'responseNote' | 'interviewDate' | 'internalNotes'>>) => Promise<void>;
  createEnrollment: (booking: Omit<CourseBooking, 'id' | 'transactionId'>) => Promise<CourseBooking>;
  updateEnrollmentStatus: (
    enrollmentId: string,
    newStatus: 'confirmed' | 'rejected' | 'cancelled' | 'pending',
    options?: {
      paymentStatus?: 'paid' | 'pending' | 'installments' | 'failed' | 'refunded' | 'overdue';
    }
  ) => Promise<void>;
  toggleSavedService: (serviceId: string) => Promise<void>;
  addCity: (cityName: string) => Promise<void>;
  removeCity: (cityName: string) => Promise<void>;
  addCategory: (cat: { id: string; nameAr: string; nameEn: string; descriptionAr: string }) => Promise<void>;
  updateCategory: (id: string, changes: Partial<ServiceCategoryRecord>) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  addProvider: (provider: Omit<EducationalProvider, 'id'>) => Promise<string>;
  removeProvider: (id: string) => Promise<void>;
}

export interface ServiceCategoryRecord {
  id: ServiceCategory;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  iconName: string;
}

const PlatformDataContext = createContext<PlatformDataContextValue | undefined>(undefined);

const valueAsString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const valueAsNumber = (value: unknown, fallback = 0) => {
  const number = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(number) ? number : fallback;
};
const valueAsStringArray = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string')
  : [];

const asService = (id: string, data: Record<string, unknown>): EducationalService => {
  const totalSeats = Math.max(0, valueAsNumber(data.totalSeats, valueAsNumber(data.seatsAvailable)));
  const seatsAvailable = Math.max(0, valueAsNumber(data.seatsAvailable, totalSeats));
  const mode = data.mode === 'online' || data.mode === 'hybrid' || data.mode === 'on-campus' ? data.mode : 'on-campus';
  const status = data.status === 'active' || data.status === 'closed' || data.status === 'draft' ? data.status : 'draft';
  const categories: EducationalService['category'][] = ['schools', 'universities', 'institutes', 'tutors', 'training_centers', 'libraries'];
  const category = categories.includes(data.category as EducationalService['category']) ? data.category as EducationalService['category'] : 'schools';
  return {
    id,
    providerId: valueAsString(data.providerId),
    providerName: valueAsString(data.providerName),
    title: valueAsString(data.title, valueAsString(data.name, 'برنامج تعليمي')),
    category,
    level: valueAsString(data.level),
    duration: valueAsString(data.duration),
    priceNote: valueAsString(data.priceNote),
    numericPrice: Math.max(0, valueAsNumber(data.numericPrice, valueAsNumber(data.price))),
    currency: (typeof data.currency === 'string' && data.currency !== 'ر.س') ? data.currency : 'ل.س',
    description: valueAsString(data.description),
    seatsAvailable,
    totalSeats,
    status,
    rating: valueAsNumber(data.rating),
    reviewsCount: Math.max(0, valueAsNumber(data.reviewsCount)),
    mode,
    ...(typeof data.imageUrl === 'string' ? { imageUrl: data.imageUrl } : {}),
    ...(typeof data.syllabusUrl === 'string' ? { syllabusUrl: data.syllabusUrl } : {}),
    ...(typeof data.syllabusFileName === 'string' ? { syllabusFileName: data.syllabusFileName } : {}),
    ...(typeof data.syllabusFileSize === 'number' ? { syllabusFileSize: data.syllabusFileSize } : {}),
    ...(Array.isArray(data.modules) ? { modules: data.modules as EducationalService['modules'] } : {}),
    ...(typeof data.schedule === 'string' ? { schedule: data.schedule } : {}),
    ...(typeof data.instructorName === 'string' ? { instructorName: data.instructorName } : {}),
    ...(typeof data.instructorRole === 'string' ? { instructorRole: data.instructorRole } : {}),
    ...(Array.isArray(data.prerequisites) ? { prerequisites: valueAsStringArray(data.prerequisites) } : {}),
    ...(typeof data.featured === 'boolean' ? { featured: data.featured } : {}),
  };
};

const asProvider = (id: string, data: Record<string, unknown>): EducationalProvider => {
  const serviceCategories: EducationalProvider['category'][] = ['schools', 'universities', 'institutes', 'tutors', 'training_centers', 'libraries'];
  const verificationStatus = data.verificationStatus === 'approved' || data.verificationStatus === 'rejected' || data.verificationStatus === 'pending'
    ? data.verificationStatus
    : undefined;
  return {
    id,
    name: valueAsString(data.name, valueAsString(data.nameAr, 'مزود خدمة تعليمية')),
    nameEn: valueAsString(data.nameEn),
    category: serviceCategories.includes(data.category as EducationalProvider['category']) ? data.category as EducationalProvider['category'] : 'schools',
    city: valueAsString(data.city),
    rating: valueAsNumber(data.rating),
    reviewsCount: Math.max(0, valueAsNumber(data.reviewsCount)),
    description: valueAsString(data.description),
    accredited: data.accredited === true || verificationStatus === 'approved',
    featured: data.featured === true,
    contactEmail: valueAsString(data.contactEmail),
    contactPhone: valueAsString(data.contactPhone),
    servicesOffered: valueAsStringArray(data.servicesOffered),
    ...(typeof data.establishedYear === 'number' ? { establishedYear: data.establishedYear } : {}),
    tags: valueAsStringArray(data.tags),
    ...(typeof data.coverColor === 'string' ? { coverColor: data.coverColor } : {}),
    ...(typeof data.logoUrl === 'string' && data.logoUrl.trim() !== '' ? { logoUrl: data.logoUrl } : typeof data.photoURL === 'string' && data.photoURL.trim() !== '' ? { logoUrl: data.photoURL } : {}),
    ...(typeof data.coverImageUrl === 'string' && data.coverImageUrl.trim() !== '' ? { coverImageUrl: data.coverImageUrl } : {}),
    ...(Array.isArray(data.documents) ? { documents: data.documents as EducationalProvider['documents'] } : {}),
    ...(typeof data.website === 'string' ? { website: data.website } : {}),
    ...(typeof data.address === 'string' ? { address: data.address } : {}),
    ...(typeof data.accreditationBody === 'string' ? { accreditationBody: data.accreditationBody } : {}),
    ...(typeof data.verifiedLicenseNumber === 'string' ? { verifiedLicenseNumber: data.verifiedLicenseNumber } : {}),
    ...(typeof data.providerId === 'string' ? { providerId: data.providerId } : {}),
    ...(verificationStatus ? { verificationStatus } : {}),
    ...(typeof data.licenseNumber === 'string' ? { licenseNumber: data.licenseNumber } : {}),
    ...(typeof data.createdAt === 'string' ? { createdAt: data.createdAt } : {}),
    ...(typeof data.submittedAt === 'string' ? { submittedAt: data.submittedAt } : {}),
    ...(typeof data.updatedAt === 'string' ? { updatedAt: data.updatedAt } : {}),
  };
};

const DEFAULT_CITIES = [
  'دمشق',
  'حلب',
  'حمص',
  'اللاذقية',
  'حماة',
  'طرطوس',
  'السويداء',
  'درعا',
  'دير الزور',
  'الحسكة',
  'الرقة',
  'إدلب',
  'القنيطرة',
];

const LOCAL_STORAGE_CITIES_KEY = 'aali_platform_cities_sy_v2';

export const PlatformDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [services, setServices] = useState<EducationalService[]>([]);
  const [providers, setProviders] = useState<EducationalProvider[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryRecord[]>([]);
  const [cities, setCities] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_CITIES_KEY);
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore
    }
    return DEFAULT_CITIES;
  });
  const [enrollments, setEnrollments] = useState<CourseBooking[]>([]);
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<StaffMember[]>([]);
  const [reviews, setReviews] = useState<ProviderReviewItem[]>([]);
  const [savedServiceIds, setSavedServiceIds] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    const loaded = new Set<string>();
    const markLoaded = (name: string) => {
      loaded.add(name);
      if (loaded.size === 4) setCatalogLoading(false);
    };
    const fail = (error: Error) => {
      setCatalogError(error.message);
      setCatalogLoading(false);
    };
    const unsubscribers = [
      onSnapshot(collection(db, 'services'), (snapshot) => {
        setServices(snapshot.docs.map((item) => asService(item.id, item.data())));
        markLoaded('services');
      }, fail),
      onSnapshot(collection(db, 'providers'), (snapshot) => {
        setProviders(snapshot.docs.map((item) => asProvider(item.id, item.data())));
        markLoaded('providers');
      }, fail),
      onSnapshot(collection(db, 'categories'), (snapshot) => {
        setCategories(snapshot.docs.map((item) => {
          const data = item.data();
          return {
            id: item.id as ServiceCategory,
            nameAr: valueAsString(data.nameAr, valueAsString(data.name, item.id)),
            nameEn: valueAsString(data.nameEn, item.id),
            descriptionAr: valueAsString(data.descriptionAr, valueAsString(data.description)),
            iconName: valueAsString(data.iconName, 'BookOpen'),
          };
        }));
        markLoaded('categories');
      }, fail),
      onSnapshot(collection(db, 'cities'), (snapshot) => {
        const list = snapshot.docs.map((item) => valueAsString(item.data().name, item.id)).filter(Boolean);
        if (list.length > 0) {
          const sorted = list.sort((a, b) => a.localeCompare(b, 'ar'));
          setCities(sorted);
          try {
            localStorage.setItem(LOCAL_STORAGE_CITIES_KEY, JSON.stringify(sorted));
          } catch {
            // Ignore
          }
        } else {
          try {
            const cached = localStorage.getItem(LOCAL_STORAGE_CITIES_KEY);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setCities(parsed);
                markLoaded('cities');
                return;
              }
            }
          } catch {
            // Ignore
          }
          setCities(DEFAULT_CITIES);
        }
        markLoaded('cities');
      }, () => {
        try {
          const cached = localStorage.getItem(LOCAL_STORAGE_CITIES_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCities(parsed);
              markLoaded('cities');
              return;
            }
          }
        } catch {
          // Ignore
        }
        setCities(DEFAULT_CITIES);
        markLoaded('cities');
      }),
      onSnapshot(collection(db, 'reviews'), (snapshot) => {
        setReviews(snapshot.docs.map((item) => {
          const data = item.data();
          const studentName = valueAsString(data.studentName, 'طالب');
          const replyValue = data.reply || data.providerReply;
          const reply = replyValue && typeof replyValue === 'object' ? replyValue as ProviderReviewItem['reply'] : undefined;
          const aspectData = data.aspects && typeof data.aspects === 'object' ? data.aspects as Record<string, unknown> : {};
          return {
            id: item.id,
            providerId: valueAsString(data.providerId),
            courseTitle: valueAsString(data.courseTitle, valueAsString(data.serviceTitle)),
            studentName,
            avatarInitials: valueAsString(data.avatarInitials, studentName.slice(0, 1)),
            rating: valueAsNumber(data.rating),
            date: valueAsString(data.date, valueAsString(data.createdAt)),
            comment: valueAsString(data.comment, valueAsString(data.text)),
            aspects: {
              teaching: valueAsNumber(aspectData.teaching),
              facilities: valueAsNumber(aspectData.facilities),
              organization: valueAsNumber(aspectData.organization),
            },
            ...(reply ? { reply } : {}),
          } as ProviderReviewItem;
        }));
      }, fail),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  useEffect(() => {
    setEnrollments([]);
    setInquiries([]);
    setTeamMembers([]);
    setSavedServiceIds([]);
    setDataError(null);
    if (!user || !userProfile) return;

    const role = userProfile.role;
    const ownershipField = role === 'admin' ? null : role === 'provider' ? 'providerId' : 'studentId';
    const subscribeRecords = <T,>(name: 'inquiries' | 'enrollments', setRows: (rows: T[]) => void) => {
      const source = collection(db, name);
      const recordQuery = ownershipField ? query(source, where(ownershipField, '==', user.uid)) : source;
      return onSnapshot(recordQuery, (snapshot) => {
        setRows(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T));
      }, (error) => setDataError(error.message));
    };

    const unsubscribers = [
      subscribeRecords<InquiryRecord>('inquiries', setInquiries),
      subscribeRecords<CourseBooking>('enrollments', setEnrollments),
      onSnapshot(collection(db, 'users', user.uid, 'savedServices'), (snapshot) => {
        setSavedServiceIds(snapshot.docs.map((item) => item.id));
      }, (error) => setDataError(error.message)),
      onSnapshot(collection(db, 'users', user.uid, 'teamMembers'), (snapshot) => {
        setTeamMembers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as StaffMember));
      }, (error) => setDataError(error.message)),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [user, userProfile]);

  const saveService = useCallback(async (service: Partial<EducationalService>, id?: string) => {
    if (!user || userProfile?.role !== 'provider') throw new Error('يجب تسجيل الدخول بحساب مزود خدمة لحفظ البرنامج.');
    const serviceRef = id ? doc(db, 'services', id) : doc(collection(db, 'services'));
    const existing = services.find((item) => item.id === id);
    const isApprovedProvider = providers.some((provider) => provider.id === user.uid && (provider.accredited || provider.verificationStatus === 'approved'));
    const payload = {
      ...(existing || {}),
      ...service,
      ...(!isApprovedProvider && service.status === 'active' ? { status: 'draft' as const } : {}),
      id: undefined,
      providerId: user.uid,
      providerName: userProfile.institutionName || userProfile.displayName,
      updatedAt: new Date().toISOString(),
      ...(id ? {} : { createdAt: new Date().toISOString() }),
    };
    delete (payload as Record<string, unknown>).id;
    await setDoc(serviceRef, payload, { merge: Boolean(id) });
    return serviceRef.id;
  }, [services, providers, user, userProfile]);

  const removeService = useCallback(async (id: string) => {
    if (!user) throw new Error('سجّل الدخول أولاً.');
    await deleteDoc(doc(db, 'services', id));
  }, [user]);

  const updateProvider = useCallback(async (id: string, changes: Partial<EducationalProvider>) => {
    if (!user) throw new Error('سجّل الدخول أولاً لتنفيذ هذا الإجراء.');
    const isAdmin = userProfile?.role === 'admin' || user.email === 'yazan.bos900@gmail.com';
    const isOwner = (userProfile?.role === 'provider' && user.uid === id) || (user.uid === id);
    if (!isAdmin && !isOwner) {
      throw new Error('لا تملك صلاحية تعديل بيانات هذه المؤسسة.');
    }
    const { id: _ignoredId, providerId: _ignoredOwner, ...safeChanges } = changes;
    if (!isAdmin) {
      delete (safeChanges as Record<string, unknown>).accredited;
      delete (safeChanges as Record<string, unknown>).featured;
      if (safeChanges.verificationStatus && safeChanges.verificationStatus !== 'pending') {
        delete (safeChanges as Record<string, unknown>).verificationStatus;
      }
    }
    const timestamp = new Date().toISOString();
    // Optimistic immediate update for instant UI synchronization across all screens
    setProviders((prev) => prev.map((p) => p.id === id ? { ...p, ...safeChanges, updatedAt: timestamp } : p));

    await setDoc(doc(db, 'providers', id), {
      ...safeChanges,
      providerId: id,
      updatedAt: timestamp
    }, { merge: true });

    if ((safeChanges.name || safeChanges.logoUrl) && (isOwner || isAdmin)) {
      try {
        await setDoc(doc(db, 'users', id), {
          ...(safeChanges.name ? { displayName: safeChanges.name, institutionName: safeChanges.name } : {}),
          ...(safeChanges.logoUrl ? { logoUrl: safeChanges.logoUrl, photoURL: safeChanges.logoUrl } : {}),
          updatedAt: timestamp,
        }, { merge: true });
      } catch {
        // user profile doc update is best effort
      }
    }
  }, [user, userProfile]);

  const submitProviderVerification = useCallback(async (details: { licenseNumber: string; city: string }) => {
    if (!user || userProfile?.role !== 'provider') throw new Error('سجّل الدخول بحساب مزود خدمة أولاً.');
    const timestamp = new Date().toISOString();
    setProviders((prev) => prev.map((p) => p.id === user.uid ? { ...p, licenseNumber: details.licenseNumber.trim(), city: details.city.trim(), verificationStatus: 'pending', updatedAt: timestamp } : p));
    await setDoc(doc(db, 'providers', user.uid), {
      licenseNumber: details.licenseNumber.trim(),
      city: details.city.trim(),
      verificationStatus: 'pending',
      submittedAt: timestamp,
      updatedAt: timestamp,
    }, { merge: true });
  }, [user, userProfile]);

  const saveProviderProfile = useCallback(async (details: { name: string; city: string; description: string; phone: string; email: string; logoUrl?: string; coverImageUrl?: string }) => {
    if (!user || (userProfile?.role !== 'provider' && userProfile?.role !== 'admin' && user.email !== 'yazan.bos900@gmail.com')) {
      throw new Error('تحديث ملف المؤسسة متاح لحساب مزود خدمة أو المشرف.');
    }
    const timestamp = new Date().toISOString();
    const providerUpdate: any = {
      providerId: user.uid,
      name: details.name.trim(),
      nameEn: details.name.trim(),
      city: details.city.trim(),
      description: details.description.trim(),
      contactPhone: details.phone.trim(),
      contactEmail: details.email.trim(),
      updatedAt: timestamp,
    };
    if (details.logoUrl !== undefined) providerUpdate.logoUrl = details.logoUrl;
    if (details.coverImageUrl !== undefined) providerUpdate.coverImageUrl = details.coverImageUrl;

    // Optimistic immediate update across all public and internal views
    setProviders((prev) => prev.map((p) => p.id === user.uid ? { ...p, ...providerUpdate } : p));

    await setDoc(doc(db, 'providers', user.uid), providerUpdate, { merge: true });
    try {
      await setDoc(doc(db, 'users', user.uid), {
        displayName: details.name.trim(),
        institutionName: details.name.trim(),
        ...(details.logoUrl ? { logoUrl: details.logoUrl, photoURL: details.logoUrl } : {}),
        updatedAt: timestamp,
      }, { merge: true });
    } catch (e) {
      console.warn('User profile update note:', e);
    }
  }, [user, userProfile]);

  const addTeamMember = useCallback(async (member: Omit<StaffMember, 'id'>) => {
    if (!user || userProfile?.role !== 'provider') throw new Error('إدارة جهات الاتصال متاحة لحساب مزود خدمة.');
    await addDoc(collection(db, 'users', user.uid, 'teamMembers'), {
      ...member,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, [user, userProfile]);

  const replyToReview = useCallback(async (reviewId: string, replyText: string, responder: string) => {
    if (!user || userProfile?.role !== 'provider') throw new Error('الرد على التقييمات متاح لحساب مزود خدمة.');
    const review = reviews.find((item) => item.id === reviewId);
    if (!review || review.providerId !== user.uid) throw new Error('لا تملك صلاحية الرد على هذا التقييم.');
    await updateDoc(doc(db, 'reviews', reviewId), {
      providerReply: { text: replyText.trim(), date: new Date().toISOString(), responder },
      updatedAt: new Date().toISOString(),
    });
  }, [reviews, user, userProfile]);

  const updateService = useCallback(async (id: string, changes: Partial<EducationalService>) => {
    if (!user) throw new Error('سجّل الدخول أولاً.');
    const { id: _ignoredId, providerId: _ignoredOwner, ...safeChanges } = changes;
    await updateDoc(doc(db, 'services', id), { ...safeChanges, updatedAt: new Date().toISOString() });
  }, [user]);

  const createInquiry = useCallback(async (service: EducationalService, message: string) => {
    if (!user || !userProfile) throw new Error('سجّل الدخول لإرسال الاستفسار.');
    if (userProfile.role !== 'student') throw new Error('إرسال الاستفسارات متاح لحساب الطالب.');
    await addDoc(collection(db, 'inquiries'), {
      studentId: user.uid,
      studentName: userProfile.displayName,
      studentEmail: user.email || userProfile.email,
      providerId: service.providerId,
      providerName: service.providerName,
      serviceId: service.id,
      serviceTitle: service.title,
      date: new Date().toISOString(),
      status: 'pending',
      notes: message.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, [user, userProfile]);

  const updateInquiry = useCallback(async (id: string, changes: Pick<InquiryRecord, 'status'> & Partial<Pick<InquiryRecord, 'responseNote' | 'interviewDate' | 'internalNotes'>>) => {
    if (!user) throw new Error('سجّل الدخول أولاً.');
    await updateDoc(doc(db, 'inquiries', id), { ...changes, updatedAt: new Date().toISOString() });
  }, [user]);

  const createEnrollment = useCallback(async (booking: Omit<CourseBooking, 'id' | 'transactionId'>) => {
    if (!user || !userProfile) throw new Error('سجّل الدخول لإتمام طلب الالتحاق.');
    if (userProfile.role !== 'student') throw new Error('طلب الالتحاق متاح لحساب الطالب.');
    const enrollmentRef = doc(collection(db, 'enrollments'));
    const payload = {
      ...booking,
      studentId: user.uid,
      providerId: services.find((service) => service.id === booking.courseId)?.providerId || '',
      status: 'pending',
      paymentStatus: 'pending',
      transactionId: `pending-${enrollmentRef.id}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(enrollmentRef, payload);
    return { ...booking, id: enrollmentRef.id, transactionId: payload.transactionId, status: 'pending' } as CourseBooking;
  }, [services, user, userProfile]);

  const updateEnrollmentStatus = useCallback(async (
    enrollmentId: string,
    newStatus: 'confirmed' | 'rejected' | 'cancelled' | 'pending',
    options?: {
      paymentStatus?: 'paid' | 'pending' | 'installments' | 'failed' | 'refunded' | 'overdue';
    }
  ) => {
    if (!user) throw new Error('سجّل الدخول أولاً للمتابعة.');
    const enrollment = enrollments.find((item) => item.id === enrollmentId);
    if (!enrollment) throw new Error('لم يتم العثور على سجل طلب التسجيل.');

    const oldStatus = enrollment.status;
    const courseId = enrollment.courseId;
    const nowIso = new Date().toISOString();

    const enrollmentUpdate: Record<string, unknown> = {
      status: newStatus,
      updatedAt: nowIso,
    };
    if (options?.paymentStatus) {
      enrollmentUpdate.paymentStatus = options.paymentStatus;
    }

    // 1. Update enrollment status in Firestore
    await updateDoc(doc(db, 'enrollments', enrollmentId), enrollmentUpdate);

    // 2. Synchronize available seats on the service in Firestore:
    // When provider accepts & confirms student enrollment (pending -> confirmed), decrement seatsAvailable by 1.
    // If a previously confirmed enrollment is cancelled/rejected (confirmed -> cancelled/rejected), restore seatsAvailable by 1.
    if (courseId) {
      const service = services.find((s) => s.id === courseId);
      if (service) {
        let seatAdjustment = 0;
        if (newStatus === 'confirmed' && oldStatus !== 'confirmed') {
          // Confirming enrollment: decrement available seats
          seatAdjustment = -1;
        } else if (oldStatus === 'confirmed' && (newStatus === 'cancelled' || newStatus === 'rejected')) {
          // Cancelling confirmed enrollment: release/restore seat
          seatAdjustment = 1;
        }

        if (seatAdjustment !== 0) {
          const newSeats = Math.max(0, Math.min(service.totalSeats, service.seatsAvailable + seatAdjustment));
          await updateDoc(doc(db, 'services', courseId), {
            seatsAvailable: newSeats,
            updatedAt: nowIso,
          });
        }
      }
    }
  }, [user, enrollments, services]);

  const toggleSavedService = useCallback(async (serviceId: string) => {
    if (!user || userProfile?.role !== 'student') throw new Error('سجّل الدخول بحساب طالب لحفظ البرامج.');
    const savedRef = doc(db, 'users', user.uid, 'savedServices', serviceId);
    if (savedServiceIds.includes(serviceId)) await deleteDoc(savedRef);
    else await setDoc(savedRef, { serviceId, createdAt: new Date().toISOString() });
  }, [savedServiceIds, user, userProfile]);

  const addCity = useCallback(async (cityName: string) => {
    const trimmed = cityName.trim();
    if (!trimmed) throw new Error('يرجى إدخال اسم المدينة.');
    if (cities.includes(trimmed)) throw new Error('هذه المدينة موجودة مسبقاً في القائمة.');
    const updated = [...cities, trimmed].sort((a, b) => a.localeCompare(b, 'ar'));
    setCities(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_CITIES_KEY, JSON.stringify(updated));
    } catch {
      // Local state already updated
    }
    try {
      await setDoc(doc(db, 'cities', trimmed), { name: trimmed, updatedAt: new Date().toISOString() }, { merge: true });
    } catch {
      // Local state already updated
    }
  }, [cities]);

  const removeCity = useCallback(async (cityName: string) => {
    const updated = cities.filter((c) => c !== cityName);
    setCities(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_CITIES_KEY, JSON.stringify(updated));
    } catch {
      // Local state already updated
    }
    try {
      await deleteDoc(doc(db, 'cities', cityName));
      // Persist the remaining cities into Firestore if needed
      const batch = writeBatch(db);
      for (const remaining of updated) {
        batch.set(doc(db, 'cities', remaining), { name: remaining, updatedAt: new Date().toISOString() }, { merge: true });
      }
      await batch.commit().catch(() => null);
    } catch {
      // Local state already updated
    }
  }, [cities]);

  const addCategory = useCallback(async (cat: { id: string; nameAr: string; nameEn: string; descriptionAr: string }) => {
    const id = cat.id.trim().toLowerCase().replace(/\s+/g, '_');
    if (!id || !cat.nameAr.trim()) throw new Error('يرجى تحديد معرف واسم التصنيف.');
    const timestamp = new Date().toISOString();
    const payload = {
      nameAr: cat.nameAr.trim(),
      nameEn: cat.nameEn.trim() || id,
      descriptionAr: cat.descriptionAr.trim(),
      iconName: 'BookOpen',
      updatedAt: timestamp,
    };
    setCategories((prev) => [...prev.filter((c) => c.id !== id), { id: id as ServiceCategory, ...payload }]);
    await setDoc(doc(db, 'categories', id), payload, { merge: true });
  }, []);

  const updateCategory = useCallback(async (id: string, changes: Partial<ServiceCategoryRecord>) => {
    const timestamp = new Date().toISOString();
    setCategories((prev) => prev.map((c) => c.id === id ? { ...c, ...changes } : c));
    await setDoc(doc(db, 'categories', id), { ...changes, updatedAt: timestamp }, { merge: true });
  }, []);

  const removeCategory = useCallback(async (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    await deleteDoc(doc(db, 'categories', id));
  }, []);

  const addProvider = useCallback(async (providerData: Omit<EducationalProvider, 'id'>) => {
    const timestamp = new Date().toISOString();
    const docRef = doc(collection(db, 'providers'));
    const newProvider: EducationalProvider = {
      ...providerData,
      id: docRef.id,
      accredited: providerData.accredited ?? true,
      verificationStatus: providerData.verificationStatus ?? 'approved',
      rating: 5.0,
      reviewsCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    setProviders((prev) => [newProvider, ...prev]);
    await setDoc(docRef, { ...newProvider, providerId: docRef.id });
    return docRef.id;
  }, []);

  const removeProvider = useCallback(async (id: string) => {
    setProviders((prev) => prev.filter((p) => p.id !== id));
    await deleteDoc(doc(db, 'providers', id));
  }, []);

  const value = useMemo(() => ({
    services, providers, categories, cities, enrollments, inquiries, teamMembers, reviews, savedServiceIds,
    catalogLoading, catalogError, dataError,
    saveService, updateProvider, submitProviderVerification, saveProviderProfile, addTeamMember, replyToReview, removeService, updateService, createInquiry, updateInquiry, createEnrollment, updateEnrollmentStatus, toggleSavedService, addCity, removeCity, addCategory, updateCategory, removeCategory, addProvider, removeProvider,
  }), [services, providers, categories, cities, enrollments, inquiries, teamMembers, reviews, savedServiceIds, catalogLoading, catalogError, dataError, saveService, updateProvider, submitProviderVerification, saveProviderProfile, addTeamMember, replyToReview, removeService, updateService, createInquiry, updateInquiry, createEnrollment, updateEnrollmentStatus, toggleSavedService, addCity, removeCity, addCategory, updateCategory, removeCategory, addProvider, removeProvider]);

  return <PlatformDataContext.Provider value={value}>{children}</PlatformDataContext.Provider>;
};

export const usePlatformData = () => {
  const context = useContext(PlatformDataContext);
  if (!context) throw new Error('usePlatformData must be used within PlatformDataProvider');
  return context;
};

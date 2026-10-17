/**
 * Cloudinary Media & Document Integration Service
 * 
 * Provides production-ready direct client-side unsigned uploads to Cloudinary,
 * image optimization URLs, document handling (PDF, images, archives),
 * and Firestore settings synchronization.
 */

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  apiKey?: string;
  folderPrefix?: string;
}

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  url: string;
  format: string;
  bytes: number;
  resourceType: 'image' | 'raw' | 'video';
  originalFilename: string;
  createdAt: string;
  width?: number;
  height?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

const STORAGE_KEY = 'aali_cloudinary_config';

// Default platform configuration
const DEFAULT_CONFIG: CloudinaryConfig = {
  cloudName: (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || 'aali-platform',
  uploadPreset: (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || 'aali_uploads',
  apiKey: (import.meta as any).env?.VITE_CLOUDINARY_API_KEY || '',
  folderPrefix: 'aali_education',
};

/**
 * Retrieves current Cloudinary configuration from LocalStorage or env defaults
 */
export function getCloudinaryConfig(): CloudinaryConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        cloudName: parsed.cloudName || DEFAULT_CONFIG.cloudName,
        uploadPreset: parsed.uploadPreset || DEFAULT_CONFIG.uploadPreset,
        apiKey: parsed.apiKey || DEFAULT_CONFIG.apiKey,
        folderPrefix: parsed.folderPrefix || DEFAULT_CONFIG.folderPrefix,
      };
    }
  } catch {
    // Fallback to defaults
  }
  return DEFAULT_CONFIG;
}

/**
 * Saves Cloudinary configuration in browser storage
 */
export function saveCloudinaryConfig(config: Partial<CloudinaryConfig>): CloudinaryConfig {
  const current = getCloudinaryConfig();
  const updated: CloudinaryConfig = {
    ...current,
    ...config,
    cloudName: (config.cloudName ?? current.cloudName).trim(),
    uploadPreset: (config.uploadPreset ?? current.uploadPreset).trim(),
    folderPrefix: (config.folderPrefix ?? current.folderPrefix)?.trim() || 'aali_education',
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save Cloudinary configuration in localStorage', err);
  }
  return updated;
}

/**
 * Formats file size in readable Arabic format (كيلوبايت / ميجابايت)
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 ك.ب';
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} م.ب`;
}

/**
 * Determines whether a file is an image based on its type or extension
 */
export function isImageFile(fileOrName: File | string): boolean {
  if (typeof fileOrName === 'string') {
    const ext = fileOrName.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'avif'].includes(ext);
  }
  return fileOrName.type.startsWith('image/');
}

/**
 * Transforms a Cloudinary URL to add optimization flags (f_auto, q_auto, width/height)
 */
export function getOptimizedImageUrl(
  url: string,
  options?: { width?: number; height?: number; crop?: 'fill' | 'fit' | 'thumb' | 'limit'; quality?: string }
): string {
  if (!url || !url.includes('cloudinary.com')) return url;

  const transforms: string[] = ['f_auto', 'q_auto'];
  if (options?.width) transforms.push(`w_${options.width}`);
  if (options?.height) transforms.push(`h_${options.height}`);
  if (options?.crop) transforms.push(`c_${options.crop}`);
  if (options?.quality) transforms.push(`q_${options.quality}`);

  const transformString = transforms.join(',');

  // Check if URL already has /upload/
  if (url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/${transformString}/`);
  }
  return url;
}

/**
 * Uploads a file (image, document, PDF, etc.) directly to Cloudinary
 * using unsigned upload preset via the REST API.
 */
export async function uploadToCloudinary(
  file: File | Blob,
  options?: {
    folder?: string;
    resourceType?: 'image' | 'raw' | 'auto';
    customConfig?: Partial<CloudinaryConfig>;
    onProgress?: (progress: UploadProgress) => void;
  }
): Promise<CloudinaryUploadResult> {
  const config = {
    ...getCloudinaryConfig(),
    ...(options?.customConfig || {}),
  };

  const cloudName = config.cloudName || DEFAULT_CONFIG.cloudName;
  const uploadPreset = config.uploadPreset || DEFAULT_CONFIG.uploadPreset;

  const folder = options?.folder
    ? `${config.folderPrefix || 'aali_education'}/${options.folder}`
    : config.folderPrefix || 'aali_education';

  // Determine resource type: images -> 'image', PDFs/docs -> 'auto' or 'raw'
  const isImg = file instanceof File ? isImageFile(file) : true;
  const resourceType = options?.resourceType || (isImg ? 'image' : 'auto');

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  if (folder) {
    formData.append('folder', folder);
  }

  // Use XMLHttpRequest to track upload progress accurately
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);

    if (xhr.upload && options?.onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentage = Math.round((e.loaded / e.total) * 100);
          options.onProgress?.({
            loaded: e.loaded,
            total: e.total,
            percentage,
          });
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve({
            publicId: res.public_id,
            secureUrl: res.secure_url || res.url,
            url: res.url || res.secure_url,
            format: res.format || (file instanceof File ? file.name.split('.').pop() || '' : 'file'),
            bytes: res.bytes || (file.size ?? 0),
            resourceType: res.resource_type || (isImg ? 'image' : 'raw'),
            originalFilename: res.original_filename || (file instanceof File ? file.name : 'upload'),
            createdAt: res.created_at || new Date().toISOString(),
            width: res.width,
            height: res.height,
          });
        } catch {
          reject(new Error('فشل قراءة استجابة خادم Cloudinary.'));
        }
      } else {
        let errorMsg = `خطأ في الرفع (${xhr.status})`;
        try {
          const errRes = JSON.parse(xhr.responseText);
          if (errRes.error?.message) {
            errorMsg = errRes.error.message;
          }
        } catch {
          // Keep default
        }

        // Helpful guidance for Cloudinary preset configuration
        if (errorMsg.includes('Upload preset must be specified') || errorMsg.includes('preset') || xhr.status === 400 || xhr.status === 404) {
          reject(new Error(`لم يتم العثور على إعداد الرفع "${uploadPreset}" في سحابة Cloudinary (${cloudName}). يرجى التحقق من Cloud Name أو إنشاء Unsigned Upload Preset في لوحة تحكم Cloudinary.`));
        } else {
          reject(new Error(errorMsg));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('تعذر الاتصال بخادم Cloudinary. تحقق من الاتصال بالإنترنت أو إعدادات السحابة.'));
    };

    xhr.send(formData);
  });
}

/**
 * Tests Cloudinary connection by uploading a 1x1 transparent PNG pixel
 */
export async function testCloudinaryConnection(testConfig?: Partial<CloudinaryConfig>): Promise<{
  success: boolean;
  message: string;
  details?: CloudinaryUploadResult;
}> {
  try {
    // 1x1 transparent base64 PNG
    const base64Pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAAPI8AAAAASUVORK5CYII=';
    const blob = await (await fetch(base64Pixel)).blob();
    const testFile = new File([blob], 'cloudinary-test-ping.png', { type: 'image/png' });

    const result = await uploadToCloudinary(testFile, {
      folder: 'system_tests',
      customConfig: testConfig,
    });

    return {
      success: true,
      message: `تم التحقق بنجاح! الاتصال بسحابة Cloudinary (${testConfig?.cloudName || getCloudinaryConfig().cloudName}) نشط وجاهز للرفع الفوري.`,
      details: result,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'فشل الاتصال بـ Cloudinary.',
    };
  }
}

/**
 * Generates a robust cache-busted media URL using provider updatedAt timestamp.
 */
export function getCacheBustedUrl(url?: string, updatedAt?: string): string {
  if (!url || !url.trim()) return '';
  const trimmed = url.trim();
  const timeNum = updatedAt ? new Date(updatedAt).getTime() : Date.now();
  if (isNaN(timeNum)) return trimmed;
  return trimmed.includes('?') ? `${trimmed}&_t=${timeNum}` : `${trimmed}?v=${timeNum}`;
}


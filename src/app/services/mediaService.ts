import axios from 'axios';
import { toAbsoluteAssetUrl } from '../utils/fileUrl';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };
};

export interface MediaItem {
  _id: string;
  title: string;
  description?: string;
  mediaType: 'video' | 'audio' | 'image' | 'document';
  type?: 'video' | 'audio' | 'document'; // Alias for backward compatibility
  category: string;
  fileUrl: string;
  storageProvider?: 'gridfs' | 'local' | 's3' | 'cloudinary';
  fileAssetId?: string;
  gridfsFileId?: string;
  streamUrl?: string;
  viewUrl?: string;
  downloadUrl?: string;
  storage?: {
    provider?: string;
    fileAssetId?: string;
    fileId?: string;
    streamUrl?: string;
    viewUrl?: string;
    downloadUrl?: string;
  };
  thumbnailUrl?: string;
  duration?: number;
  fileSize: number;
  mimeType: string;
  fileName: string;
  views?: number;
  viewCount?: number; // Backend uses viewCount
  uniqueViewersCount?: number; // Number of unique students who viewed
  uploadedBy: {
    userId?: string;
    _id?: string;
    name?: string;
    userType?: string;
  };
  isActive?: boolean;
  isPublic?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MediaLibraryResponse {
  success: boolean;
  data: MediaItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Get all media
export const getMediaLibrary = async (filters?: {
  type?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const params = new URLSearchParams();
  if (filters?.type) params.append('type', filters.type);
  if (filters?.category) params.append('category', filters.category);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const response = await axios.get(
    `${API_URL}/media?${params.toString()}`,
    getAuthHeader()
  );
  return response.data as MediaLibraryResponse;
};

export interface UploadedAsset {
  _id?: string;
  fileAssetId?: string;
  gridfsFileId?: string;
  storageProvider?: 'gridfs' | 'local' | 's3' | 'cloudinary';
  bucketName?: string;
  originalName?: string;
  fileName?: string;
  mimeType?: string;
  mediaType?: 'video' | 'image' | 'audio' | 'document' | 'other';
  type?: string;
  fileSize?: number;
  fileUrl: string;
  streamUrl?: string;
  viewUrl?: string;
  downloadUrl?: string;
  title?: string;
  accessLevel?: string;
  transcript?: string;
  transcriptStatus?: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  transcriptWordCount?: number;
  aiProcessing?: {
    transcriptStatus?: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
    transcriptErrorMessage?: string;
  };
}

// Get single media
export const getMedia = async (mediaId: string) => {
  const response = await axios.get(`${API_URL}/media/${mediaId}`, getAuthHeader());
  return response.data;
};

// Upload media
export const uploadMedia = async (formData: FormData) => {
  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_URL}/media/upload`, formData, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
};

export const uploadAsset = async (
  file: File,
  options?: {
    title?: string;
    description?: string;
    category?: string;
    usageType?: string;
    source?: string;
    module?: string;
    accessLevel?: string;
    relatedCourse?: string;
    tags?: string[];
    onProgress?: (progress: number) => void;
  }
) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', options?.title || file.name);
  formData.append('description', options?.description || '');
  formData.append('category', options?.category || 'other');
  formData.append('usageType', options?.usageType || 'user-upload');
  formData.append('accessLevel', options?.accessLevel || 'private');
  if (options?.source) formData.append('source', options.source);
  if (options?.module) formData.append('module', options.module);
  if (options?.relatedCourse) formData.append('relatedCourse', options.relatedCourse);
  if (options?.tags) formData.append('tags', JSON.stringify(options.tags));

  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_URL}/files/upload`, formData, {
    headers: {
      'Authorization': `Bearer ${token}`
    },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && options?.onProgress) {
        options.onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
      }
    }
  });
  const payload = response.data as { success: boolean; message?: string; data: UploadedAsset };
  if (payload?.data) {
    payload.data.fileUrl = toAbsoluteAssetUrl(payload.data.fileUrl || '');
    payload.data.streamUrl = toAbsoluteAssetUrl(payload.data.streamUrl || '');
    payload.data.viewUrl = toAbsoluteAssetUrl(payload.data.viewUrl || '');
    payload.data.downloadUrl = toAbsoluteAssetUrl(payload.data.downloadUrl || '');
  }
  return payload;
};

// Delete media
export const deleteMedia = async (mediaId: string) => {
  const response = await axios.delete(`${API_URL}/media/${mediaId}`, getAuthHeader());
  return response.data;
};

// Get media stream URL
export const getMediaStreamUrl = (mediaId: string) => {
  return `${API_URL}/media/${mediaId}/stream`;
};

// Upload file with progress tracking
export const uploadFile = async (
  file: File,
  options?: {
    title?: string;
    description?: string;
    category?: string;
    usageType?: string;
    source?: string;
    module?: string;
    accessLevel?: string;
    onProgress?: (progress: number) => void;
  }
) => {
  return uploadAsset(file, {
    ...options,
    usageType: options?.usageType || 'user-upload',
    accessLevel: options?.accessLevel || 'enrolled',
  });
};

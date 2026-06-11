const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '');

export function toAbsoluteAssetUrl(url: string): string {
  const value = String(url || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('//')) return `${window.location.protocol}${value}`;
  if (value.startsWith('/')) return `${BACKEND_ORIGIN}${value}`;
  return value;
}

export function getAssetUrl(item: any, preferred: 'stream' | 'view' | 'download' = 'view'): string {
  if (!item) return '';

  if (preferred === 'stream') {
    return toAbsoluteAssetUrl(
      item?.videoAsset?.streamUrl ||
      item?.audioAsset?.streamUrl ||
      item?.storage?.streamUrl ||
      item?.streamUrl ||
      item?.videoUrl ||
      item?.lessonVideo ||
      item?.fileUrl ||
      item?.url ||
      ''
    );
  }

  if (preferred === 'download') {
    return toAbsoluteAssetUrl(
      item?.downloadUrl ||
      item?.videoAsset?.downloadUrl ||
      item?.imageAsset?.downloadUrl ||
      item?.audioAsset?.downloadUrl ||
      item?.storage?.downloadUrl ||
      item?.url ||
      item?.fileUrl ||
      ''
    );
  }

  return toAbsoluteAssetUrl(
    item?.viewUrl ||
    item?.imageAsset?.viewUrl ||
    item?.storage?.viewUrl ||
    item?.lessonImage ||
    item?.thumbnail ||
    item?.fileUrl ||
    item?.url ||
    ''
  );
}

export const buildLessonAssetPatch = (asset: any, kind: 'video' | 'image' | 'audio') => {
  const streamUrl = toAbsoluteAssetUrl(asset.streamUrl || asset.fileUrl || '');
  const viewUrl = toAbsoluteAssetUrl(asset.viewUrl || asset.fileUrl || '');
  const downloadUrl = toAbsoluteAssetUrl(asset.downloadUrl || asset.fileUrl || '');

  const common = {
    title: asset.title || asset.originalName || asset.fileName || '',
    storageProvider: asset.storageProvider || 'gridfs',
    fileAssetId: asset.fileAssetId,
    gridfsFileId: asset.gridfsFileId,
    bucketName: asset.bucketName || 'uploads',
    streamUrl,
    viewUrl,
    downloadUrl,
    originalName: asset.originalName || asset.fileName || '',
    mimeType: asset.mimeType || '',
    fileSize: asset.fileSize || 0,
    uploadedAt: new Date().toISOString(),
  };

  if (kind === 'video') {
    return {
      videoUrl: streamUrl,
      lessonVideo: streamUrl,
      videoAsset: common,
    };
  }
  if (kind === 'audio') {
    return {
      lessonAudio: streamUrl,
      audioAsset: common,
    };
  }
  return {
    lessonImage: viewUrl,
    imageAsset: common,
  };
};

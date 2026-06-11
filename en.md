# Backend ENV Guide (`backend/.env`)

Ye file tum dusre dev ko directly share kar sakte ho.  
Important: real secrets (`JWT_SECRET`, DB password, API keys) replace karo, plain text secrets share mat karo.

## Recommended `.env` for 1-2 hour video uploads

```env
# =========================
# Core Server
# =========================
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Increase Node memory (important for current memoryStorage flow)
# Start backend with this env in shell:
# NODE_OPTIONS=--max-old-space-size=8192

# =========================
# Database
# =========================
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
MONGODB_URI_PROD=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority

# =========================
# Auth
# =========================
JWT_SECRET=replace_with_strong_secret
JWT_EXPIRE=30d
JWT_COOKIE_EXPIRE=30

# =========================
# Frontend Origins
# =========================
FRONTEND_URL=http://localhost:5173
ADMIN_PANEL_URL=http://localhost:3001

# =========================
# Upload / File Storage (GridFS)
# =========================
FILE_STORAGE_PROVIDER=gridfs
GRIDFS_BUCKET_NAME=uploads

# For long videos (1-2 hr), increase limit
# Typical range: 1500-3000 MB depending on bitrate
MAX_UPLOAD_SIZE_MB=2048

# Keep DB-only behavior strict
STRICT_DB_ONLY_UPLOADS=true
PREFER_GRIDFS_UPLOAD=true

# Upload timing + chunk tuning
GRIDFS_UPLOAD_TIMEOUT_MS=900000
GRIDFS_FALLBACK_TIMEOUT_MS=900000
GRIDFS_UPLOAD_CHUNK_BYTES=262144
GRIDFS_UPLOAD_WRITE_CONCERN_W=1
GRIDFS_FORCE_MANUAL_READ=false

# Legacy/compat keys (safe to keep)
GRIDFS_PROMOTION_TIMEOUT_MS=1200000
GRIDFS_UPLOAD_WATCHDOG_MS=600000

# Optional old limits (keep aligned)
MAX_FILE_SIZE=2147483648
MAX_VIDEO_SIZE=2147483648

# =========================
# Rate Limiting
# =========================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
AI_RATE_LIMIT_MAX=20

# =========================
# AI Service (optional)
# =========================
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TIMEOUT_MS=120000
AI_SERVICE_RETRIES=1
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_API_KEY=replace_with_real_key
NVIDIA_MODEL=meta/llama-3.1-70b-instruct
```

## Practical notes for long video uploads

1. Current backend upload flow `multer.memoryStorage()` use kar raha hai, matlab poori file RAM me aati hai.
2. 1-2 hour videos ke liye server RAM high honi chahiye (minimum 8GB, better 16GB+).
3. Agar OOM ya random upload failures aaye to next upgrade stream-based upload (busboy/direct stream) pe shift karna hoga.
4. Reverse proxy (Nginx/Cloudflare) ka body limit bhi bada hona chahiye, warna backend tak file nahi pahuchegi.

## Quick validation checklist

1. `GET /api/v1/auth/me` returns `200`
2. `POST /api/v1/files/upload` returns `201`
3. `GET /api/v1/files/:fileAssetId/stream` returns `200` or `206`
4. Course editor video preview plays from `/api/v1/files/.../stream`


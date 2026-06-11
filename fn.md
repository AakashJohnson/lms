# Frontend ENV Guide (Vite)

Ye frontend config share-friendly hai.  
Isko frontend project root me `.env` ya `.env.local` me रखो.

## Recommended frontend env

```env
# Backend API base used by services
VITE_API_URL=http://localhost:5000/api/v1

# Used in some services (proctoring etc.)
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

## Why this matters

1. Upload response me relative URLs aate hain (`/api/v1/files/.../stream`).
2. Frontend utility now un URLs ko backend absolute URL me convert karti hai.
3. Agar `VITE_API_URL` galat hua, video preview 0:00 pe stuck ya `500/404` de sakta hai.

## Production example

```env
VITE_API_URL=https://api.yourdomain.com/api/v1
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
```

## Quick frontend checks

1. Upload ke baad lesson `Video URL` field `/api/v1/files/<id>/stream` dikha sakta hai (ye normal hai).
2. Browser network me actual request backend domain par jaani chahiye.
3. Video preview request status `200` ya `206` hona chahiye.


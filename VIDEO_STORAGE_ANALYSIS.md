# 📹 Video Storage Architecture Analysis

## Overview
This document provides a **complete analysis** of where videos are stored for **course lessons** and **media library**, plus what's stored in **MongoDB**.

---

## 1️⃣ COURSE LESSONS VIDEOS

### Storage Location
**Local Server Disk** (`/backend/uploads/videos/`)

### File Structure
```
backend/
  └── uploads/
      ├── videos/          ← Lesson videos stored here
      ├── images/          ← Lesson thumbnails
      ├── audio/           ← Audio files (if any)
      └── documents/       ← PDFs, docs
```

### How It Works

#### Upload Flow:
1. **Frontend** (Trainer creates lesson) → `CreateCourse.tsx`
2. Trainer clicks **"Upload Video"** button (line 2091 in CreateCourse.tsx)
3. File sent to backend via **`POST /api/v1/media/upload`** (multipart/form-data)
4. **Multer middleware** processes upload:
   - Storage strategy: `multer.diskStorage`
   - File destination determined by MIME type
   - Filename: `${timestamp}-${randomString}.${extension}`
5. File saved to `/backend/uploads/videos/`
6. **File URL generated**: `http://localhost:5000/uploads/videos/1705123456789-abc123def.mp4`
7. URL stored in MongoDB (Course → Lesson → `videoUrl` field)

#### Example Video File Naming:
```
/backend/uploads/videos/1705123456789-k9f8h3j2k1.mp4
```

### Multer Configuration (media.controller.js)
```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = file.mimetype.startsWith('video') ? 'videos'
               : file.mimetype.startsWith('image') ? 'images'
               : file.mimetype.startsWith('audio') ? 'audio'
               : 'documents';
    const dir = path.join(UPLOAD_DIR, type);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

// File size limit: 2 GB
limits: { fileSize: 2 * 1024 * 1024 * 1024 }
```

### Supported Video Formats
✅ MP4  
✅ WebM  
✅ Ogg  
✅ MOV (QuickTime)  
✅ MKV (Matroska)  
✅ AVI  

---

## 2️⃣ MEDIA LIBRARY VIDEOS

### Storage Location
**Same Local Server Disk** (`/backend/uploads/videos/`)

### Key Difference from Lessons
The **Media Library** is a **central repository** for all media (videos, audio, images, documents) that can be:
- Used independently
- Reused across multiple courses
- Accessed by students as standalone learning resources
- Categorized and tagged for discovery

### Upload Flow for Media Library

1. **Frontend** (Admin/Trainer) → `MediaLibrary.tsx`
2. Clicks **"Upload"** to open `UploadContent` component
3. Selects media file, adds title, description, category, tags
4. File sent to **`POST /api/v1/media/upload`**
5. Same Multer process as lessons (file saved to `/backend/uploads/videos/`)
6. **Full metadata stored in MongoDB** (Media collection) with:
   - Title, description
   - Category (educational, training, documentary, tutorial, webinar)
   - Tags (searchable)
   - Upload by (trainer/admin info)
   - Access level (public, enrolled, premium)
   - View count, download count
   - Unique viewers list

---

## 3️⃣ MONGODB STORAGE

### Course → Lessons → Video Storage

#### Course Schema (Course.model.js)
```javascript
const courseSchema = {
  // ... other fields
  
  // Sections array - contains lessons
  sections: [{
    title: String,
    description: String,
    lessons: [{
      title: String,
      type: String,  // 'video', 'article', 'quiz', etc.
      
      // ❌ ACTUAL VIDEO URL (stored in MongoDB)
      videoUrl: String,        // e.g., "http://localhost:5000/uploads/videos/1705123456789-abc123.mp4"
      lessonVideo: String,     // Same URL (alias for compatibility)
      videoDuration: String,   // "mm:ss" format
      
      // Video summary & AI processing
      videoSummary: {
        status: String,        // 'idle', 'pending', 'completed', 'failed'
        sourceVideoUrl: String,
        rawTranscript: String,
        transcript: String,
        generated: {
          summary: String,
          detailedSummary: String,
          keyTakeaways: [String],
          timestamps: [{
            start: Number,
            end: Number,
            label: String,
            summary: String
          }],
          flashcards: [],
          quizQuestions: []
        }
      },
      
      // Lesson metadata
      lessonImage: String,     // Thumbnail URL
      lessonAudio: String,     // Audio file URL
      content: String,         // Article body (if article type)
      transcript: String,      // Video transcript for AI notes
      resources: [{            // Supplementary materials
        title: String,
        url: String,
        type: 'pdf' | 'doc' | 'link' | 'zip'
      }],
      
      // Embedded questions (asked during lesson)
      questions: [{
        question: String,
        questionType: 'multiple-choice' | 'true-false' | 'short-answer',
        options: [{text, isCorrect}],
        correctAnswer: String,
        explanation: String,
        timestamp: Number        // When to show during video
      }]
    }]
  }],
  
  // Course-level media
  thumbnail: String,          // Course thumbnail URL
  promoVideo: String,         // Course promo video URL
  
  // ❌ IMPORTANT DATA STORED IN MONGODB
  welcomeMessage: String,     // HTML rich text
  congratsMessage: String,    // HTML rich text
  enableCertificate: Boolean,
  certPassScore: Number,
  enableDiscussion: Boolean,
  courseValidity: String,     // Days before expiry
}
```

### Media Collection (MongoDB) - Media Library

#### Media Schema (Media.model.js)
```javascript
const mediaSchema = {
  // Core metadata
  title: String,              // e.g., "Python Basics Tutorial"
  description: String,        // e.g., "Introduction to Python..."
  
  // File details (stored in MongoDB)
  mediaType: 'video' | 'audio' | 'image' | 'document',
  fileUrl: String,            // ❌ ACTUAL PATH: "http://localhost:5000/uploads/videos/1705123456789-xyz.mp4"
  fileName: String,           // "1705123456789-xyz.mp4"
  fileSize: Number,           // In bytes
  mimeType: String,           // "video/mp4"
  
  // Media metadata
  category: 'educational' | 'training' | 'documentary' | 'tutorial' | 'webinar' | 'other',
  tags: [String],             // ["python", "basics", "programming"]
  duration: Number,           // In seconds (for video/audio)
  thumbnailUrl: String,       // "http://localhost:5000/uploads/images/thumb-xyz.jpg"
  
  // Upload information
  uploadedBy: {
    userId: ObjectId,         // Reference to User
    userType: 'admin' | 'trainer',
    name: String
  },
  
  // Related course (if any)
  relatedCourse: ObjectId,    // Reference to Course (if linked to specific course)
  
  // Access control
  accessLevel: 'public' | 'enrolled' | 'premium',
  
  // Statistics
  viewCount: Number,          // Total views
  uniqueViewers: [{           // Individual viewers
    userId: ObjectId,
    viewedAt: Date
  }],
  downloadCount: Number,
  likes: Number,
  
  // Metadata
  metadata: {
    resolution: String,       // For videos, stores relative file path for streaming
    bitrate: String,
    codec: String,
    aspectRatio: String
  },
  
  // Status
  isActive: Boolean,
  isFeatured: Boolean,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}
```

---

## 4️⃣ DATA FLOW COMPARISON

### Lesson Videos
```
Trainer creates course
    ↓
Uploads video in CreateCourse.tsx (Content step)
    ↓
Multer saves to /backend/uploads/videos/
    ↓
File URL stored in MongoDB (Course → Section → Lesson → videoUrl)
    ↓
Student views course
    ↓
Browser loads video from http://localhost:5000/uploads/videos/...
    ↓
Backend also generates AI transcript & summary asynchronously
```

### Media Library Videos
```
Admin/Trainer accesses Media Library page
    ↓
Clicks "Upload" → UploadContent wizard
    ↓
Selects file + metadata (title, category, tags)
    ↓
Multer saves to /backend/uploads/videos/
    ↓
All metadata saved in MongoDB (Media collection)
    ↓
Video appears in Media Library for discovery
    ↓
Can be linked to courses or accessed standalone
    ↓
View count tracked in MongoDB
```

---

## 5️⃣ MONGODB DATA STRUCTURE - WHAT'S STORED

### ✅ IN MONGODB (Metadata):
1. **Video URL path** (file location reference)
2. **Title & Description**
3. **Duration** (calculated, stored)
4. **Upload metadata** (who uploaded, when)
5. **Category & Tags** (for filtering)
6. **Access permissions**
7. **View counts & viewers list**
8. **AI processing status** (transcript, summary state)
9. **Timestamps & segments** (for navigation)
10. **Embedded questions** (during video playback)
11. **Course relationships** (which course it belongs to)

### ❌ NOT IN MONGODB (Stored on Disk):
1. **Actual video file** (binary data on `/backend/uploads/videos/`)
2. **Audio extracted from video** (on disk during AI processing)
3. **Temporary transcoding files** (if any)

---

## 6️⃣ KEY ENDPOINTS

### Upload Video
```
POST /api/v1/media/upload
Headers: Authorization: Bearer {token}
Body: FormData
  - file: <video file>
  - title: "Lesson Title"
  - category: "educational"
  - tags: ["python", "basics"]

Response:
{
  success: true,
  data: {
    _id: "media-doc-id",
    fileUrl: "http://localhost:5000/uploads/videos/...",
    type: "video",
    title: "Lesson Title"
  }
}
```

### Get Media Library
```
GET /api/v1/media?type=video&category=educational&page=1&limit=20
Response: Array of Media documents with all metadata
```

### Stream Video (with range support for seeking)
```
GET /api/v1/media/{mediaId}/stream
Response: Video stream with HTTP 206 Partial Content (for seeking)
```

### Increment View Count
```
POST /api/v1/media/{mediaId}/view
Response: Updated view count
```

---

## 7️⃣ CLOUD STORAGE OPTIONS (Currently Configured)

From TECHNOLOGY_STACK.md, these are **configured but might not be actively used**:

- **AWS S3** - For scalable video storage
- **Cloudinary** - For media optimization

Currently, the system uses **local disk storage**. To switch to S3/Cloudinary:

**Would require:**
1. Modifying Multer storage strategy
2. Using AWS SDK or Cloudinary SDK
3. Storing S3/Cloudinary URLs in MongoDB instead of local paths
4. Updating `.env` with cloud credentials

---

## 8️⃣ FILE ROUTES IN FRONTEND

### Course Lesson Videos
```typescript
// src/app/components/course/CreateCourse.tsx

// Upload handler
const onVideoUpload = async (lesson, file) => {
  const res = await uploadFile(file, {
    title: lesson.title,
    category: 'educational'
  });
  
  update(lesson with {
    lessonVideo: res.data.fileUrl,    // ← Stored URL
    videoUrl: res.data.fileUrl,
  });
};

// When saving course
const saveLesson = () => {
  const lessonData = {
    ...lesson,
    videoUrl: "http://localhost:5000/uploads/videos/...",  // ← URL in MongoDB
    videoDuration: "12:34"
  };
  // Save to MongoDB
};
```

### Media Library Videos
```typescript
// src/app/components/MediaLibrary.tsx
// src/app/components/media/UploadContent.tsx

const onPublish = async (payload) => {
  const res = await uploadMedia(formData);
  // Media document with all metadata saved to MongoDB
  // fileUrl in response points to /uploads/videos/...
};
```

---

## 9️⃣ COMPLETE DATA HIERARCHY

```
MONGODB
├── Course Collection
│   ├── title, description, category
│   ├── sections: [{
│   │   ├── title, description
│   │   └── lessons: [{
│   │       ├── title, type: 'video'
│   │       ├── videoUrl: "http://localhost:5000/uploads/videos/xyz.mp4" ← STORED HERE
│   │       ├── videoDuration: "12:34"
│   │       ├── lessonVideo: "http://localhost:5000/uploads/videos/xyz.mp4"
│   │       ├── videoSummary: { status, transcript, summary, ... }
│   │       ├── lessonImage: "http://localhost:5000/uploads/images/thumb.jpg"
│   │       └── questions: [{ question, timestamp, options, ... }]
│   │   }]
│   }]
│   ├── thumbnail: "http://localhost:5000/uploads/images/course-thumb.jpg"
│   ├── promoVideo: "http://localhost:5000/uploads/videos/promo.mp4"
│   ├── welcomeMessage: "<p>Welcome...</p>"
│   ├── congratsMessage: "<p>Congratulations...</p>"
│   └── createdBy: ObjectId (User)
│
└── Media Collection
    ├── title: "Python Basics"
    ├── fileUrl: "http://localhost:5000/uploads/videos/media-xyz.mp4" ← STORED HERE
    ├── fileName: "1705123456789-k9f8h3j2k1.mp4"
    ├── fileSize: 523456789 (bytes)
    ├── mimeType: "video/mp4"
    ├── category: "tutorial"
    ├── tags: ["python", "basics"]
    ├── uploadedBy: { userId, userType, name }
    ├── accessLevel: "enrolled"
    ├── viewCount: 156
    ├── uniqueViewers: [{ userId, viewedAt }, ...]
    └── metadata: { resolution: "/uploads/videos/...", ... }

DISK (/backend/uploads/)
├── videos/
│   ├── 1705123456789-k9f8h3j2k1.mp4 ← ACTUAL VIDEO FILE (500+ MB)
│   ├── 1705123456790-a1b2c3d4e5.mp4
│   └── ...
├── images/
│   ├── 1705123456791-thumb-xyz.jpg
│   └── ...
├── audio/
│   └── ... (if needed)
└── documents/
    └── ... (PDFs, etc.)
```

---

## 🔟 SUMMARY TABLE

| Aspect | Lesson Videos | Media Library Videos |
|--------|---------------|----------------------|
| **Storage Location** | `/backend/uploads/videos/` | `/backend/uploads/videos/` |
| **File System** | Local disk | Local disk |
| **Metadata Store** | MongoDB (Course → Lesson) | MongoDB (Media collection) |
| **URL Storage** | In `videoUrl` field | In `fileUrl` field |
| **Primary Use** | Course curriculum | Central repository |
| **Categorization** | Part of lessons | Independently categorized |
| **Reusability** | Tied to course | Can link to multiple courses |
| **View Tracking** | Via Course progress | Via Media collection stats |
| **Access Control** | Enrolled students | public/enrolled/premium |
| **AI Processing** | Yes (transcript, summary) | Optional (not automatic) |

---

## ✨ KEY INSIGHTS

1. **Videos are NOT stored in MongoDB** - only URLs/metadata stored
2. **Local disk storage is default** - but S3/Cloudinary options exist in code
3. **Media Library is separate** - designed for central resource management
4. **Dual URL fields** - `videoUrl` and `lessonVideo` for backward compatibility
5. **AI processing happens async** - transcript & summary generated after upload
6. **View tracking enabled** - both for Media and Course progress
7. **File naming is unique** - uses timestamp + random string to avoid collisions

---

## 🚀 Next Steps If You Need To:

### Switch to AWS S3:
- Install: `npm install aws-sdk`
- Configure multer-s3 middleware
- Update `.env` with AWS credentials
- Modify media.controller.js upload handler

### Add Video Transcoding:
- Install: `npm install ffmpeg`
- Process video after upload
- Store multiple quality versions

### Enable Video Streaming Optimization:
- Use HLS (HTTP Live Streaming)
- Generate video chunks
- Enable adaptive bitrate streaming

---

**Created:** 2024  
**Purpose:** Complete video storage architecture reference  
**Status:** Ready for reference (no changes made to codebase)

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import Course from '../src/models/Course.model.js';
import FileAsset from '../src/models/FileAsset.model.js';
import Media from '../src/models/Media.model.js';

dotenv.config({ path: './.env' });

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  console.log('🌐 Overrode default DNS resolution servers with [8.8.8.8, 1.1.1.1]');
} catch (err) {}

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL || process.env.DATABASE_URL || 'mongodb://localhost:27017/ceas-lms';

// Helper to extract a filename from a URL or path
function getFilename(urlOrPath) {
  if (!urlOrPath) return '';
  const parts = urlOrPath.split('/');
  return parts[parts.length - 1];
}

async function run() {
  try {
    console.log(`Connecting to MongoDB at ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully!');

    // 1. Fetch all courses
    const courses = await Course.find({}).lean();
    console.log(`Found ${courses.length} courses in database.`);

    const lessonAssetIds = new Set();
    const lessonGridfsIds = new Set();
    const lessonUrls = new Set();
    const lessonFilenames = new Set();

    const addId = (idField, set) => {
      if (idField) {
        set.add(idField.toString());
      }
    };

    const addUrl = (urlField) => {
      if (urlField && typeof urlField === 'string' && urlField.trim()) {
        lessonUrls.add(urlField.trim());
        const filename = getFilename(urlField.trim());
        if (filename) {
          lessonFilenames.add(filename);
        }
      }
    };

    // 2. Collect all references from Course curriculum
    for (const course of courses) {
      if (!course.sections) continue;
      for (const section of course.sections) {
        if (!section.lessons) continue;
        for (const lesson of section.lessons) {
          // URLs
          addUrl(lesson.videoUrl);
          addUrl(lesson.lessonVideo);
          addUrl(lesson.lessonImage);
          addUrl(lesson.lessonAudio);

          // Video Asset
          if (lesson.videoAsset) {
            addId(lesson.videoAsset.fileAssetId, lessonAssetIds);
            addId(lesson.videoAsset.gridfsFileId, lessonGridfsIds);
            addUrl(lesson.videoAsset.streamUrl);
            addUrl(lesson.videoAsset.viewUrl);
            addUrl(lesson.videoAsset.downloadUrl);
            if (lesson.videoAsset.originalName) {
              lessonFilenames.add(lesson.videoAsset.originalName);
            }
          }
          // Image Asset
          if (lesson.imageAsset) {
            addId(lesson.imageAsset.fileAssetId, lessonAssetIds);
            addId(lesson.imageAsset.gridfsFileId, lessonGridfsIds);
            addUrl(lesson.imageAsset.streamUrl);
            addUrl(lesson.imageAsset.viewUrl);
            addUrl(lesson.imageAsset.downloadUrl);
            if (lesson.imageAsset.originalName) {
              lessonFilenames.add(lesson.imageAsset.originalName);
            }
          }
          // Audio Asset
          if (lesson.audioAsset) {
            addId(lesson.audioAsset.fileAssetId, lessonAssetIds);
            addId(lesson.audioAsset.gridfsFileId, lessonGridfsIds);
            addUrl(lesson.audioAsset.streamUrl);
            addUrl(lesson.audioAsset.viewUrl);
            addUrl(lesson.audioAsset.downloadUrl);
            if (lesson.audioAsset.originalName) {
              lessonFilenames.add(lesson.audioAsset.originalName);
            }
          }
          // Resources
          if (Array.isArray(lesson.resources)) {
            for (const res of lesson.resources) {
              addId(res.fileAssetId, lessonAssetIds);
              addId(res.gridfsFileId, lessonGridfsIds);
              addUrl(res.url);
              addUrl(res.streamUrl);
              addUrl(res.viewUrl);
              addUrl(res.downloadUrl);
              if (res.originalName) {
                lessonFilenames.add(res.originalName);
              }
            }
          }
          // Assignment
          if (lesson.assignment) {
            addUrl(lesson.assignment.attachmentUrl);
            if (lesson.assignment.attachmentAsset) {
              addId(lesson.assignment.attachmentAsset.fileAssetId, lessonAssetIds);
              addId(lesson.assignment.attachmentAsset.gridfsFileId, lessonGridfsIds);
              addUrl(lesson.assignment.attachmentAsset.streamUrl);
              addUrl(lesson.assignment.attachmentAsset.viewUrl);
              addUrl(lesson.assignment.attachmentAsset.downloadUrl);
              if (lesson.assignment.attachmentAsset.originalName) {
                lessonFilenames.add(lesson.assignment.attachmentAsset.originalName);
              }
            }
          }
        }
      }
    }

    const assetIdList = Array.from(lessonAssetIds);
    const gridfsIdList = Array.from(lessonGridfsIds);
    const urlList = Array.from(lessonUrls);
    const filenameList = Array.from(lessonFilenames);

    console.log(`Collected details:`);
    console.log(`  - ${assetIdList.length} unique fileAssetIds`);
    console.log(`  - ${gridfsIdList.length} unique gridfsFileIds`);
    console.log(`  - ${urlList.length} unique URLs`);
    console.log(`  - ${filenameList.length} unique filenames`);

    // 3. Mark FileAssets
    const fileAssetQuery = {
      $or: [
        { _id: { $in: assetIdList } },
        { gridfsFileId: { $in: gridfsIdList } },
        { fileUrl: { $in: urlList } },
        { streamUrl: { $in: urlList } },
        { viewUrl: { $in: urlList } },
        { downloadUrl: { $in: urlList } },
        { fileName: { $in: filenameList } },
        { originalName: { $in: filenameList } },
        { usageType: { $regex: /^(lesson-|assignment-|quiz-)/i } },
        { category: 'assignment' }
      ]
    };

    const faRes = await FileAsset.updateMany(
      fileAssetQuery,
      {
        $set: {
          source: 'lesson',
          module: 'lesson_content',
          usageType: 'lesson_asset'
        }
      }
    );
    console.log(`Updated ${faRes.modifiedCount} FileAssets to source: 'lesson'`);

    // 4. Mark Media documents
    const mediaQuery = {
      $or: [
        { fileAssetId: { $in: assetIdList } },
        { gridfsFileId: { $in: gridfsIdList } },
        { fileUrl: { $in: urlList } },
        { streamUrl: { $in: urlList } },
        { viewUrl: { $in: urlList } },
        { downloadUrl: { $in: urlList } },
        { fileName: { $in: filenameList } },
        { title: { $in: ['Welcome to the course', 'New Lesson', 'Untitled Lesson'] } },
        { relatedCourse: { $ne: null } },
        { usageType: { $regex: /^(lesson-|assignment-|quiz-)/i } },
        { category: 'assignment' }
      ]
    };

    const mediaRes = await Media.updateMany(
      mediaQuery,
      {
        $set: {
          source: 'lesson',
          module: 'lesson_content',
          usageType: 'lesson_asset'
        }
      }
    );
    console.log(`Updated ${mediaRes.modifiedCount} Media items to source: 'lesson'`);

    // 5. Mark remaining Media items as 'media_library'
    const libMediaRes = await Media.updateMany(
      {
        source: { $ne: 'lesson' }
      },
      {
        $set: {
          source: 'media_library',
          module: 'media_library',
          usageType: 'library_resource'
        }
      }
    );
    console.log(`Marked ${libMediaRes.modifiedCount} remaining Media items as source: 'media_library'`);

    // 6. Mark corresponding FileAssets of media_library Media items as 'media_library'
    const libMediaDocs = await Media.find({ source: 'media_library' }).select('fileAssetId gridfsFileId').lean();
    const libAssetIds = libMediaDocs.map(d => d.fileAssetId).filter(Boolean);
    const libGridfsIds = libMediaDocs.map(d => d.gridfsFileId).filter(Boolean);

    if (libAssetIds.length > 0 || libGridfsIds.length > 0) {
      const libFaRes = await FileAsset.updateMany(
        {
          $or: [
            { _id: { $in: libAssetIds } },
            { gridfsFileId: { $in: libGridfsIds } }
          ]
        },
        {
          $set: {
            source: 'media_library',
            module: 'media_library',
            usageType: 'library_resource'
          }
        }
      );
      console.log(`Updated ${libFaRes.modifiedCount} corresponding FileAssets to source: 'media_library'`);
    }

    console.log('Robust backfill process completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during robust backfill:', err);
    process.exit(1);
  }
}

run();

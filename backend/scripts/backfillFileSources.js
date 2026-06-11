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
} catch (err) {
  console.warn(`⚠️ Custom DNS server configuration failed: ${err.message}`);
}

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGODB_URI_LOCAL || process.env.DATABASE_URL || 'mongodb://localhost:27017/ceas-lms';

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

    // Helper to add IDs safely
    const addId = (idField, set) => {
      if (idField) {
        set.add(idField.toString());
      }
    };

    // 2. Collect references from Course curriculum
    for (const course of courses) {
      if (!course.sections) continue;
      for (const section of course.sections) {
        if (!section.lessons) continue;
        for (const lesson of section.lessons) {
          // Video Asset
          if (lesson.videoAsset) {
            addId(lesson.videoAsset.fileAssetId, lessonAssetIds);
            addId(lesson.videoAsset.gridfsFileId, lessonGridfsIds);
          }
          // Image Asset
          if (lesson.imageAsset) {
            addId(lesson.imageAsset.fileAssetId, lessonAssetIds);
            addId(lesson.imageAsset.gridfsFileId, lessonGridfsIds);
          }
          // Audio Asset
          if (lesson.audioAsset) {
            addId(lesson.audioAsset.fileAssetId, lessonAssetIds);
            addId(lesson.audioAsset.gridfsFileId, lessonGridfsIds);
          }
          // Resources
          if (Array.isArray(lesson.resources)) {
            for (const res of lesson.resources) {
              addId(res.fileAssetId, lessonAssetIds);
              addId(res.gridfsFileId, lessonGridfsIds);
            }
          }
          // Assignment
          if (lesson.assignment && lesson.assignment.attachmentAsset) {
            addId(lesson.assignment.attachmentAsset.fileAssetId, lessonAssetIds);
            addId(lesson.assignment.attachmentAsset.gridfsFileId, lessonGridfsIds);
          }
        }
      }
    }

    const assetIdList = Array.from(lessonAssetIds);
    const gridfsIdList = Array.from(lessonGridfsIds);

    console.log(`Collected ${assetIdList.length} unique fileAssetIds and ${gridfsIdList.length} unique gridfsFileIds referenced in courses.`);

    // 3. Mark referenced FileAssets as lesson assets
    let faUpdatedCount = 0;
    if (assetIdList.length > 0 || gridfsIdList.length > 0) {
      const faRes = await FileAsset.updateMany(
        {
          $or: [
            { _id: { $in: assetIdList } },
            { gridfsFileId: { $in: gridfsIdList } }
          ]
        },
        {
          $set: {
            source: 'lesson',
            module: 'lesson_content',
            usageType: 'lesson_asset'
          }
        }
      );
      faUpdatedCount += faRes.modifiedCount;
      console.log(`Updated ${faRes.modifiedCount} referenced FileAssets to source: 'lesson'`);
    }

    // 4. Mark referenced Media documents as lesson assets
    let mediaUpdatedCount = 0;
    if (assetIdList.length > 0 || gridfsIdList.length > 0) {
      const mediaRes = await Media.updateMany(
        {
          $or: [
            { fileAssetId: { $in: assetIdList } },
            { gridfsFileId: { $in: gridfsIdList } }
          ]
        },
        {
          $set: {
            source: 'lesson',
            module: 'lesson_content',
            usageType: 'lesson_asset'
          }
        }
      );
      mediaUpdatedCount += mediaRes.modifiedCount;
      console.log(`Updated ${mediaRes.modifiedCount} referenced Media items to source: 'lesson'`);
    }

    // 5. Update by usageType patterns for older FileAssets/Media (e.g. usageType starts with 'lesson-' or 'assignment-')
    const typeFaRes = await FileAsset.updateMany(
      {
        $or: [
          { usageType: { $regex: /^(lesson-|assignment-|quiz-)/i } },
          { category: 'assignment' }
        ],
        source: { $ne: 'lesson' }
      },
      {
        $set: {
          source: 'lesson',
          module: 'lesson_content',
          usageType: 'lesson_asset'
        }
      }
    );
    console.log(`Updated ${typeFaRes.modifiedCount} additional FileAssets by usageType pattern to source: 'lesson'`);

    const typeMediaRes = await Media.updateMany(
      {
        $or: [
          { usageType: { $regex: /^(lesson-|assignment-|quiz-)/i } },
          { category: 'assignment' }
        ],
        source: { $ne: 'lesson' }
      },
      {
        $set: {
          source: 'lesson',
          module: 'lesson_content',
          usageType: 'lesson_asset'
        }
      }
    );
    console.log(`Updated ${typeMediaRes.modifiedCount} additional Media items by usageType pattern to source: 'lesson'`);

    // 6. Any other Media items that are NOT lesson assets should default to media_library
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
    console.log(`Marked ${libMediaRes.modifiedCount} other Media items as source: 'media_library' (Media Library resources).`);

    // 7. Update other FileAssets uploaded via Media Library to source: 'media_library'
    // If a FileAsset's ID is referenced in any Media item with source: 'media_library', it should also be 'media_library'
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

    console.log('Backfill process completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error during backfill:', err);
    process.exit(1);
  }
}

run();

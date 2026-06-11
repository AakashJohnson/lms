const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;
  
  // Get the course with trainer lookup
  const course = await db.collection('courses').aggregate([
    { $match: { title: 'test' } },
    {
      $lookup: {
        from: 'users',
        localField: 'trainer',
        foreignField: '_id',
        as: 'trainerData'
      }
    },
    { $unwind: { path: '$trainerData', preserveNullAndEmptyArrays: true } }
  ]).toArray();
  
  if (course.length > 0) {
    console.log('✅ Course:', course[0].title);
    console.log('✅ Trainer Name:', course[0].trainerData?.firstName, course[0].trainerData?.lastName);
    console.log('✅ Trainer Email:', course[0].trainerData?.email);
  } else {
    console.log('❌ Course not found');
  }
  
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

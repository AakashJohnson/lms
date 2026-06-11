import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Department from './src/models/Department.model.js';
import Batch from './src/models/Batch.model.js';
import User from './src/models/User.model.js';

dotenv.config();

async function testDepartmentBatchAPIs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find an admin user to use as createdBy
    const admin = await User.findOne({ role: 'administrator' });
    if (!admin) {
      console.log('❌ No admin user found. Please create an admin user first.');
      await mongoose.disconnect();
      return;
    }
    console.log(`✅ Found admin user: ${admin.firstName} ${admin.lastName}\n`);

    // Test 1: Create Departments
    console.log('📝 Test 1: Creating Departments...');
    console.log('='.repeat(60));

    const departments = [
      { name: 'Computer Science', code: 'CS', description: 'Computer Science & Engineering Department' },
      { name: 'Mechanical Engineering', code: 'ME', description: 'Mechanical Engineering Department' },
      { name: 'Civil Engineering', code: 'CE', description: 'Civil Engineering Department' },
      { name: 'Electrical Engineering', code: 'EE', description: 'Electrical Engineering Department' }
    ];

    const createdDepartments = [];
    for (const dept of departments) {
      // Check if already exists
      let existing = await Department.findOne({ code: dept.code });
      if (existing) {
        console.log(`⚠️  Department ${dept.code} already exists, skipping...`);
        createdDepartments.push(existing);
      } else {
        const newDept = await Department.create({
          ...dept,
          createdBy: admin._id
        });
        console.log(`✅ Created: ${newDept.name} (${newDept.code})`);
        createdDepartments.push(newDept);
      }
    }

    console.log(`\n✅ Total Departments: ${createdDepartments.length}\n`);

    // Test 2: Create Batches
    console.log('📝 Test 2: Creating Batches...');
    console.log('='.repeat(60));

    const batches = [];
    for (const dept of createdDepartments) {
      const batchData = [
        { name: 'Batch A - 2026', code: `${dept.code}-2026-A`, year: 2026, maxStudents: 50 },
        { name: 'Batch B - 2026', code: `${dept.code}-2026-B`, year: 2026, maxStudents: 50 },
        { name: 'Batch A - 2025', code: `${dept.code}-2025-A`, year: 2025, maxStudents: 45 }
      ];

      for (const batch of batchData) {
        // Check if already exists
        let existing = await Batch.findOne({ code: batch.code });
        if (existing) {
          console.log(`⚠️  Batch ${batch.code} already exists, skipping...`);
          batches.push(existing);
        } else {
          const newBatch = await Batch.create({
            ...batch,
            department: dept._id,
            createdBy: admin._id
          });
          console.log(`✅ Created: ${newBatch.name} (${newBatch.code}) for ${dept.name}`);
          batches.push(newBatch);
        }
      }
    }

    console.log(`\n✅ Total Batches: ${batches.length}\n`);

    // Test 3: Verify Relationships
    console.log('📝 Test 3: Verifying Relationships...');
    console.log('='.repeat(60));

    for (const dept of createdDepartments) {
      const deptBatches = await Batch.find({ department: dept._id });
      console.log(`${dept.name} (${dept.code}): ${deptBatches.length} batches`);
      deptBatches.forEach(b => {
        console.log(`  - ${b.name} (${b.code}) - Year: ${b.year}, Max: ${b.maxStudents}`);
      });
    }

    console.log('\n');

    // Test 4: Test Populate
    console.log('📝 Test 4: Testing Populate...');
    console.log('='.repeat(60));

    const populatedBatch = await Batch.findOne()
      .populate('department', 'name code')
      .populate('createdBy', 'firstName lastName email');

    if (populatedBatch) {
      console.log('✅ Batch with populated fields:');
      console.log(`  Name: ${populatedBatch.name}`);
      console.log(`  Code: ${populatedBatch.code}`);
      console.log(`  Department: ${populatedBatch.department.name} (${populatedBatch.department.code})`);
      console.log(`  Created By: ${populatedBatch.createdBy.firstName} ${populatedBatch.createdBy.lastName}`);
    }

    console.log('\n');

    // Test 5: Summary
    console.log('📊 Summary:');
    console.log('='.repeat(60));
    const totalDepts = await Department.countDocuments();
    const totalBatches = await Batch.countDocuments();
    const activeDepts = await Department.countDocuments({ isActive: true });
    const activeBatches = await Batch.countDocuments({ isActive: true });

    console.log(`Total Departments: ${totalDepts} (Active: ${activeDepts})`);
    console.log(`Total Batches: ${totalBatches} (Active: ${activeBatches})`);

    console.log('\n✅ All tests completed successfully!');
    console.log('\n🎯 Next Steps:');
    console.log('1. Start backend server: npm start');
    console.log('2. Test APIs with Postman or frontend');
    console.log('3. Create admin UI components');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testDepartmentBatchAPIs();

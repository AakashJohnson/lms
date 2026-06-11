
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../../backend/.env') });

const UserSchema = new mongoose.Schema({ email: String, role: String });
const CourseSchema = new mongoose.Schema({ title: String });
const EnrollmentSchema = new mongoose.Schema({ user: mongoose.Schema.Types.ObjectId, course: mongoose.Schema.Types.ObjectId });

const User = mongoose.model('User', UserSchema);
const Course = mongoose.model('Course', CourseSchema);
const Enrollment = mongoose.model('Enrollment', EnrollmentSchema);

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const userCount = await User.countDocuments();
    const courseCount = await Course.countDocuments();
    const enrollmentCount = await Enrollment.countDocuments();

    console.log(`Users: ${userCount}`);
    console.log(`Courses: ${courseCount}`);
    console.log(`Enrollments: ${enrollmentCount}`);

    const student = await User.findOne({ role: 'student' });
    if (student) {
      const studentEnrollments = await Enrollment.find({ user: student._id });
      console.log(`Student ${student.email} has ${studentEnrollments.length} enrollments`);
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

checkData();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'src/controllers/admin.controller.js');

console.log('🔧 Fixing admin.controller.js to use unified User model\n');

let content = fs.readFileSync(filePath, 'utf8');

// Replace all old model usages with User model
const replacements = [
  // getUserById function - remove the if checks for other models
  {
    from: /user = await Trainer\.findById\(req\.params\.id\)\s+\.select\('-password'\)\s+\.populate\('coursesCreated', 'title thumbnail'\);[\s\S]*?if \(!user\) \{\s+user = await Participant\.findById\(req\.params\.id\)/,
    to: 'return next(new ErrorResponse(\'User not found\', 404));\n  }\n\n  // Populate based on role\n  if (user.role === \'trainer\') {\n    await user.populate(\'coursesCreated\', \'title thumbnail\');\n  } else if (user.role === \'student\') {\n    await user.populate(\'enrolledCourses\', \'title thumbnail\');\n  }\n\n  if (!user) {'
  },
  
  // rejectUser function
  {
    from: /let user = await Trainer\.findById\(req\.params\.id\);\s+let Model = Trainer;\s+if \(!user\) \{\s+user = await Participant\.findById\(req\.params\.id\);\s+Model = Participant;\s+\}/,
    to: 'const user = await User.findById(req.params.id);'
  },
  
  // deleteUser function
  {
    from: /let deleted = await Trainer\.findByIdAndDelete\(req\.params\.id\);\s+if \(!deleted\) \{\s+deleted = await Participant\.findByIdAndDelete\(req\.params\.id\);\s+\}/,
    to: 'const deleted = await User.findByIdAndDelete(req.params.id);'
  },
  
  // getDashboardStats - recent registrations
  {
    from: /Trainer\.find\(\)\.sort\('-createdAt'\)\.limit\(5\)\.select\('firstName lastName email isApproved createdAt'\),\s+Participant\.find\(\)\.sort\('-createdAt'\)\.limit\(5\)\.select\('firstName lastName email isApproved createdAt role'\)/,
    to: "User.find({ role: 'trainer' }).sort('-createdAt').limit(5).select('firstName lastName email isApproved createdAt'),\n    User.find({ role: 'student' }).sort('-createdAt').limit(5).select('firstName lastName email isApproved createdAt role')"
  },
  
  // findUserById helper function
  {
    from: /async function findUserById\(id\) \{\s+let user = await Admin\.findById\(id\);\s+if \(user\) return user;\s+user = await Trainer\.findById\(id\);\s+if \(user\) return user;\s+user = await Participant\.findById\(id\);\s+return user;\s+\}/,
    to: 'async function findUserById(id) {\n  return await User.findById(id);\n}'
  },
  
  // getStudentsByDepartmentAndBatch
  {
    from: /const students = await Participant\.find\(\)/,
    to: "const students = await User.find({ role: 'student' })"
  },
  
  // getStudentById
  {
    from: /const student = await Participant\.findById\(id\)/,
    to: "const student = await User.findById(id)"
  },
  
  // getAllTrainers
  {
    from: /const trainers = await Trainer\.find\(\)/,
    to: "const trainers = await User.find({ role: 'trainer' })"
  },
  
  // getBatchStudents
  {
    from: /const students = await Participant\.find\(\{\s+batch: batch\._id\s+\}\)/,
    to: "const students = await User.find({\n      role: 'student',\n      batch: batch._id\n    })"
  }
];

let changeCount = 0;

replacements.forEach(({ from, to }, index) => {
  const matches = content.match(from);
  if (matches) {
    content = content.replace(from, to);
    changeCount++;
    console.log(`✅ Replacement ${index + 1}: Success`);
  } else {
    console.log(`⚠️  Replacement ${index + 1}: Pattern not found (may already be updated)`);
  }
});

fs.writeFileSync(filePath, content, 'utf8');

console.log(`\n✅ Admin controller updated: ${changeCount} replacements made`);
console.log('📝 File: backend/src/controllers/admin.controller.js');

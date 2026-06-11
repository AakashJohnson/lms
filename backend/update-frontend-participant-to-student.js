import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files to update
const filesToUpdate = [
  '../src/app/components/UserManagement.tsx',
  '../src/app/components/StudentOnboarding.tsx',
  '../src/app/components/UserSwitcher.tsx',
  '../src/components/admin/UserManagement.jsx'
];

const replacements = [
  // Type definitions
  { from: /type UserRole = 'Participant' \| 'Trainer' \| 'Admin'/g, to: "type UserRole = 'Student' | 'Trainer' | 'Admin'" },
  
  // Role mappings
  { from: /participant: 'Participant'/g, to: "student: 'Student'" },
  { from: /'Participant' as const/g, to: "'Student' as const" },
  { from: /role: 'Participant'/g, to: "role: 'Student'" },
  { from: /'Participant'/g, to: "'Student'" },
  { from: /<option>Participant<\/option>/g, to: "<option>Student</option>" },
  
  // Variable names and comments
  { from: /participants/g, to: "students" },
  { from: /Participants/g, to: "Students" },
  { from: /participant/g, to: "student" },
  { from: /Participant/g, to: "Student" },
  
  // API endpoints
  { from: /\/users\/participants/g, to: "/users/students" },
  { from: /role=participant/g, to: "role=student" },
  
  // Role map entries
  { from: /Participant: 'participant'/g, to: "Student: 'student'" },
  { from: /'participant'/g, to: "'student'" },
  
  // Case statements
  { from: /case 'participant':/g, to: "case 'student':" }
];

console.log('🔄 Updating frontend files: participant → student\n');

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changeCount = 0;
  
  replacements.forEach(({ from, to }) => {
    const matches = content.match(from);
    if (matches) {
      changeCount += matches.length;
      content = content.replace(from, to);
    }
  });
  
  if (changeCount > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${file}: ${changeCount} replacements`);
  } else {
    console.log(`ℹ️  ${file}: No changes needed`);
  }
});

console.log('\n✅ Frontend update complete!');

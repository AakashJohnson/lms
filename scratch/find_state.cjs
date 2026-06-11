const fs = require('fs');
const file = 'src/app/components/course/CreateCourse.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('useState') || line.includes('initialData')) {
    if (line.trim().startsWith('const') || line.trim().startsWith('function') || line.trim().startsWith('export')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});

const fs = require('fs');
const file = 'src/app/components/course/CreateCourse.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
let start = -1;
let openBrackets = 0;
lines.forEach((line, idx) => {
  if (line.includes('interface CourseFormData')) {
    start = idx;
  }
  if (start !== -1 && idx >= start && idx < start + 50) {
    console.log(`${idx + 1}: ${line}`);
  }
});

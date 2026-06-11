const fs = require('fs');
const file = 'src/app/components/course/CreateCourse.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
let sIdx = -1;
let lIdx = -1;
lines.forEach((line, idx) => {
  if (line.includes('interface CourseSection')) sIdx = idx;
  if (line.includes('interface CourseLesson')) lIdx = idx;
});

if (sIdx !== -1) {
  console.log("--- CourseSection ---");
  for (let i = sIdx; i < sIdx + 15; i++) console.log(`${i+1}: ${lines[i]}`);
}
if (lIdx !== -1) {
  console.log("--- CourseLesson ---");
  for (let i = lIdx; i < lIdx + 30; i++) console.log(`${i+1}: ${lines[i]}`);
}

const fs = require('fs');
const parser = require('./node_modules/@babel/parser');
const path = 'src/app/components/MyCourses.tsx';
const text = fs.readFileSync(path, 'utf8');

for (let n = 1; n <= text.split(/\r?\n/).length; n++) {
  const code = text.split(/\r?\n/).slice(0, n).join('\n');
  try {
    parser.parse(code, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
  } catch (e) {
    console.error('FAIL at line', n, 'msg:', e.message);
    process.exit(0);
  }
}
console.log('ALL OK');

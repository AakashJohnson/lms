const fs = require('fs');
const parser = require('./node_modules/@babel/parser');
const text = fs.readFileSync('src/app/components/MyCourses.tsx', 'utf8');
try {
  const ast = parser.parse(text, { sourceType: 'module', plugins: ['typescript', 'jsx'], tokens: true, errorRecovery: true });
  const tokens = ast.tokens;
  const targetLine = 1314;
  const nearby = tokens.filter(t => t.loc.start.line >= targetLine-3 && t.loc.start.line <= targetLine+3);
  console.log('nearby tokens', nearby.map(t => ({type:t.type.label, value:t.value, line:t.loc.start.line, col:t.loc.start.column})));
  if (ast.errors && ast.errors.length) {
    console.log('errors', ast.errors.map(e => ({ message: e.message, loc: e.loc }))); 
  }
} catch (e) {
  console.error('parse failed', e.message);
  if (e.loc) console.error('loc', e.loc);
}

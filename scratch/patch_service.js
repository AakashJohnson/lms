const fs = require('fs');
const file = 'src/app/services/aiLessonNoteService.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /forceRegenerate\?\:\s*boolean;?\s*\r?\n?\s*\}\)\s*=>\s*\{/,
  'forceRegenerate?: boolean;\r\n  languageHint?: string;\r\n  asrMode?: string;\r\n}) => {'
);
fs.writeFileSync(file, content, 'utf8');
console.log('Patched successfully!');

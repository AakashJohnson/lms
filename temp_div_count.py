from pathlib import Path
import re
path = Path('c:/projects/lms/lms/src/app/components/MyCourses.tsx')
lines = path.read_text(encoding='utf-8').splitlines()
start = 1317 - 1
end = 1598
block = '\n'.join(lines[start:end])
open_div = len(re.findall(r'<div(?![^>]*?/>)', block))
close_div = len(re.findall(r'</div>', block))
print('open_div', open_div, 'close_div', close_div)
for i, line in enumerate(lines[start:end], start=start+1):
    if '<div' in line or '</div>' in line:
        print(f'{i}: {line}')

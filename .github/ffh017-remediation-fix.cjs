const fs = require('node:fs');
const path = '.github/ffh017-remediation-apply.cjs';
let text = fs.readFileSync(path, 'utf8');
const replacements = [
  ['`monthly room ${expected.room}`', '"monthly room " + expected.room'],
  ['`annual room ${expected.room}`', '"annual room " + expected.room'],
  ['`remainder ${expected.room}`', '"remainder " + expected.room'],
];
for (const [oldValue, newValue] of replacements) {
  const count = text.split(oldValue).length - 1;
  if (count !== 1) throw new Error(`Expected one match for ${oldValue}, found ${count}`);
  text = text.replace(oldValue, newValue);
}
fs.writeFileSync(path, text);
fs.rmSync('.github/ffh017-remediation-fix.cjs');
console.log('Apply harness quoting repaired.');

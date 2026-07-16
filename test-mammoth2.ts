import * as mammoth from 'mammoth';
import fs from 'fs';

async function run() {
  const result = await mammoth.convertToHtml({ buffer: fs.readFileSync('test.docx') });
  console.log(result.value.substring(0, 100)); // Should fail if test.docx doesnt exist, so I'll create a dummy zip
}
run();

import fs from 'fs';
fs.writeFileSync('/app/applet/dump.env.txt', JSON.stringify(process.env, null, 2));

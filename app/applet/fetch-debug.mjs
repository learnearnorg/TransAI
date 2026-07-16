import fs from 'fs';
fetch('http://localhost:3000/api/debug/env')
.then(r => r.json())
.then(j => fs.writeFileSync('/app/applet/env-output.json', JSON.stringify(j)))
.catch(e => console.error(e));

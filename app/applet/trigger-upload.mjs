import fs from 'fs';
fetch('http://localhost:3000/api/vault/process/test', {
    method: 'POST',
    headers: { 'x-api-key': 'undefined' }
}).then(r => r.json()).then(console.log).catch(console.error);

const html = `<p>Test</p><img src="data:image/jpeg;base64,XYZ" alt="blabla" /><p>Another</p>`;
const imgRegex = /<img[^>]+src="data:([^;]+);base64,([^"]+)"[^>]*>/gi;
const matches = [...html.matchAll(imgRegex)];
console.log(matches.map(m => m[1]));

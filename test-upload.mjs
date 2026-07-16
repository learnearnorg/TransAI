
const testUpload = async () => {
  console.log('Testing upload to /api/vault/upload');
  const formData = new FormData();
  formData.append('file', new Blob(['test content'], { type: 'text/plain' }), 'test.txt');

  try {
    const res = await fetch('http://localhost:3000/api/vault/upload', {
      method: 'POST',
      body: formData
    });

    console.log('Status:', res.status);
    console.log('Headers:', JSON.stringify(Object.fromEntries(res.headers.entries()), null, 2));
    
    const text = await res.text();
    try {
      console.log('Body:', JSON.parse(text));
    } catch (e) {
      console.log('Body (first 100 chars):', text.substring(0, 100));
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
};

testUpload();

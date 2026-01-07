// Test if your Cloudflare Worker is accessible
// Run with: node test-worker.js

const WORKER_URL = 'https://edge-guardian.michaelangelo41699.worker.dev';

async function testWorker() {
  console.log('Testing Cloudflare Worker...');
  console.log('URL:', WORKER_URL);
  console.log('');

  try {
    // Test 1: Simple GET request
    console.log('Test 1: GET request');
    const getResponse = await fetch(WORKER_URL);
    console.log('Status:', getResponse.status);
    console.log('Headers:', Object.fromEntries(getResponse.headers));
    const getText = await getResponse.text();
    console.log('Response:', getText.substring(0, 200));
    console.log('');

    // Test 2: POST request with dummy data
    console.log('Test 2: POST request');
    const postResponse = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: 'test data',
    });
    console.log('Status:', postResponse.status);
    const postText = await postResponse.text();
    console.log('Response:', postText.substring(0, 200));
    console.log('');

    console.log('✅ Worker is accessible!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Possible issues:');
    console.error('1. Worker not deployed');
    console.error('2. Wrong URL');
    console.error('3. Network connectivity issue');
    console.error('4. CORS issue (check worker logs)');
  }
}

testWorker();

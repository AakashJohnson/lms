import axios from 'axios';

async function testTutorChat() {
  const start = Date.now();
  const url = 'http://127.0.0.1:8000/v1/tutor/chat';
  console.log(`Sending direct POST request to ${url}...`);
  try {
    const res = await axios.post(url, {
      message: 'Hello, explain cooperative management in one sentence.',
      history: [],
      courseId: '6a213d7485fb6d4f3b36be0d',
      lessonId: '6a213d7485fb6d4f3b36be0f'
    }, { timeout: 30000 });
    console.log(`[SUCCESS] Responded in ${Date.now() - start}ms:`, JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error(`[FAILED] Failed in ${Date.now() - start}ms:`, err.response?.status, err.response?.data || err.message);
  }
}

testTutorChat();

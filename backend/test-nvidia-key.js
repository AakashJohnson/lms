import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function test() {
  const apiKey = process.env.NVIDIA_API_KEY;
  console.log('Using API Key:', apiKey?.substring(0, 10) + '...');
  
  try {
    const response = await axios.post(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        model: 'meta/llama-3.1-8b-instruct',
        messages: [{ role: 'user', content: 'Say hello in 3 words' }],
        max_tokens: 10,
        temperature: 0.1
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    console.log('NVIDIA API Response Success!');
    console.log('Response content:', response.data.choices[0].message.content);
  } catch (error) {
    console.error('NVIDIA API Error:', error.response?.status, error.response?.data || error.message);
  }
}

test();

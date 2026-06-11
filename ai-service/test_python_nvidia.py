import os
import httpx
from dotenv import load_dotenv

load_dotenv()

nvidia_api_key = os.getenv("NVIDIA_API_KEY")
nvidia_base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")

print(f"Key preview: {nvidia_api_key[:10]}...")
print(f"Base URL: {nvidia_base_url}")

async def test():
    payload = {
        "model": "meta/llama-3.1-8b-instruct",
        "messages": [{"role": "user", "content": "Say hello in 3 words"}],
        "temperature": 0.1,
        "max_tokens": 10,
    }
    
    headers = {
        "Authorization": f"Bearer {nvidia_api_key}",
        "Content-Type": "application/json",
    }
    
    try:
        print("Sending request using httpx...")
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{nvidia_base_url}/chat/completions",
                headers=headers,
                json=payload
            )
            print("Response status:", resp.status_code)
            print("Response text:", resp.text)
    except Exception as e:
        print("Error during request:", e)

import asyncio
asyncio.run(test())


import axios from 'axios';

async function testAI() {
    try {
        console.log("Testing Vector Search...");
        const vec = await axios.post('http://localhost:8000/v1/search/vector', {
            query: "how to manage",
            top_k: 3
        });
        console.log("Vector Results:", JSON.stringify(vec.data, null, 2));

        console.log("\nTesting RAG...");
        const rag = await axios.post('http://localhost:8000/v1/search/rag', {
            query: "What is leadership?",
            context: [
                { content: "Leadership is the art of motivating a group of people to act toward achieving a common goal.", metadata: { title: "Course 1" } }
            ]
        });
        console.log("RAG Answer:", rag.data.answer);
    } catch (err) {
        console.error("Test failed:", err.response?.data || err.message);
    }
}

testAI();

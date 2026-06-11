
import axios from 'axios';
async function test() {
    const res = await axios.post('http://localhost:8000/v1/search/vector', {
        query: "exam",
        threshold: 0.1
    });
    console.log(JSON.stringify(res.data, null, 2));
}
test();

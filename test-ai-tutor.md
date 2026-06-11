# AI Tutor Testing Guide

## Test Cases for Enhanced AI Tutor

### Test 1: Deep Explanation Request
**Question**: "Explain how React hooks work in detail"

**Expected Response Should Include**:
- Clear definition of hooks
- Why hooks were introduced
- How they work internally
- Multiple examples (useState, useEffect, etc.)
- Real-world use cases
- Best practices
- Common mistakes to avoid

---

### Test 2: Example Request
**Question**: "Show me examples of useEffect hook"

**Expected Response Should Include**:
- At least 3-4 different examples
- Explanation for each example
- When to use each pattern
- Code snippets (if applicable)
- Common use cases

---

### Test 3: Step-by-Step Guide
**Question**: "How to create a REST API step by step"

**Expected Response Should Include**:
- Numbered steps
- Explanation for each step
- Prerequisites mentioned
- Tools/technologies needed
- Best practices at each step

---

### Test 4: Comparison Question
**Question**: "What's the difference between SQL and NoSQL databases?"

**Expected Response Should Include**:
- Clear comparison
- Use cases for each
- Pros and cons
- Examples of each type
- When to choose which

---

### Test 5: Course Context Test
**Steps**:
1. Select an enrolled course
2. Ask: "Summarize the key concepts from this course"

**Expected Response Should Include**:
- Course-specific content
- Main topics covered
- Key takeaways
- Learning objectives

---

### Test 6: Document Upload Test
**Steps**:
1. Upload a PDF/DOC file
2. Ask: "Summarize this document in detail"

**Expected Response Should Include**:
- Comprehensive summary
- Key points from document
- Main sections covered
- Important details

---

### Test 7: Follow-up Question Test
**Conversation**:
1. First: "Explain JavaScript closures"
2. Then: "Give me a practical example"
3. Then: "How is this used in React?"

**Expected Behavior**:
- AI remembers context
- Builds on previous answers
- Provides relevant follow-up

---

### Test 8: Quick Action Test
**Steps**:
1. Click "Explain in Depth" button
2. Type a topic

**Expected Response**:
- Comprehensive explanation
- Multiple layers of understanding
- Examples and analogies

---

## Performance Benchmarks

### Response Time Targets:
- Simple questions: < 5 seconds
- Complex questions: < 10 seconds
- With document: < 15 seconds

### Quality Metrics:
- Answer length: 300-800 tokens
- Contains examples: Yes
- Uses analogies: Yes (when appropriate)
- Structured format: Yes
- Actionable insights: Yes

---

## Manual Testing Checklist

- [ ] AI Tutor page loads correctly
- [ ] Greeting message displays enhanced version
- [ ] Quick action buttons work
- [ ] Course selector dropdown works
- [ ] File upload works (PDF, DOC, TXT)
- [ ] Messages display properly
- [ ] Typing indicator shows during response
- [ ] Copy to clipboard works
- [ ] Conversation history maintained
- [ ] Error handling works (timeout, network error)
- [ ] Cache works for repeated questions
- [ ] Response quality is improved
- [ ] Answers are more detailed
- [ ] Examples are provided
- [ ] Step-by-step guides are clear

---

## API Testing

### Test AI Service Endpoint

**Endpoint**: `POST http://localhost:8000/v1/tutor/chat`

**Request Body**:
```json
{
  "message": "Explain React hooks in detail with examples",
  "courseId": null,
  "lessonId": null,
  "userRole": "student",
  "context": {
    "lessonContent": "",
    "attachmentContent": "",
    "attachmentName": "",
    "recentMessages": []
  }
}
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "message": "Detailed explanation with examples...",
    "sources": []
  },
  "meta": {
    "model": "meta/llama-3.1-70b-instruct",
    "tokens": {
      "prompt": 500,
      "completion": 600,
      "total": 1100
    }
  }
}
```

---

## Automated Test Script

```bash
# Test AI Service Health
curl http://localhost:8000/health

# Test Tutor Chat
curl -X POST http://localhost:8000/v1/tutor/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain JavaScript closures",
    "context": {}
  }'
```

---

## Regression Testing

Ensure these still work:
- [ ] Notes generation
- [ ] Flashcards generation
- [ ] Semantic search
- [ ] Other AI features

---

## Browser Testing

Test on:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile browsers

---

## Load Testing

Test with:
- [ ] 1 concurrent user
- [ ] 5 concurrent users
- [ ] 10 concurrent users
- [ ] Check response times
- [ ] Check error rates

---

## Success Criteria

✅ **Enhancement is successful if**:
1. Answers are 2-3x more detailed
2. Examples are provided consistently
3. Step-by-step guides are clear
4. Response time is acceptable
5. No regression in existing features
6. UI/UX improvements are visible
7. Students report better understanding

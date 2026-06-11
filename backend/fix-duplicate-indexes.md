# Fix Mongoose Duplicate Index Warnings

## Problem
You're getting warnings like:
```
[MONGOOSE] Warning: Duplicate schema index on {"slug":1} found
[MONGOOSE] Warning: Duplicate schema index on {"name":1} found
[MONGOOSE] Warning: Duplicate schema index on {"code":1} found
```

## Cause
You have both:
1. `index: true` in schema field definition
2. `schema.index()` method call

## Solution

### Find the duplicate indexes:

**Check these model files:**
- `backend/src/models/*.model.js`

**Look for patterns like this:**

```javascript
// ❌ WRONG - Duplicate index
const schema = new Schema({
  slug: { type: String, unique: true, index: true }, // index: true here
});
schema.index({ slug: 1 }); // AND index here = DUPLICATE!

// ✅ CORRECT - Choose one method
const schema = new Schema({
  slug: { type: String, unique: true }, // No index: true
});
schema.index({ slug: 1 }); // Only here

// OR

const schema = new Schema({
  slug: { type: String, unique: true, index: true }, // Only here
});
// No schema.index() call
```

### Common fields with duplicates:
- `slug`
- `name`
- `code`

### Fix steps:

1. **Search for duplicate indexes:**
```bash
cd backend/src/models
grep -r "index: true" .
grep -r "schema.index" .
```

2. **Remove duplicates:**
   - If field has `unique: true`, remove `index: true`
   - If you have `schema.index()`, remove `index: true` from field
   - Keep only ONE index definition per field

3. **Example fixes:**

**Department.model.js:**
```javascript
// Before
const departmentSchema = new Schema({
  name: { type: String, required: true, unique: true, index: true },
  code: { type: String, required: true, unique: true, index: true },
});
departmentSchema.index({ name: 1 });
departmentSchema.index({ code: 1 });

// After
const departmentSchema = new Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
});
departmentSchema.index({ name: 1 });
departmentSchema.index({ code: 1 });
```

**Course.model.js:**
```javascript
// Before
const courseSchema = new Schema({
  slug: { type: String, unique: true, index: true },
});
courseSchema.index({ slug: 1 });

// After
const courseSchema = new Schema({
  slug: { type: String, unique: true },
});
courseSchema.index({ slug: 1 });
```

## Quick Fix Command

Run this to find all duplicate indexes:
```bash
cd backend
grep -r "index: true" src/models/ | grep -E "(slug|name|code)"
```

Then manually remove `index: true` from those fields if they also have `schema.index()` calls.

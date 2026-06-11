# Design Document: Department and Batch Management System

## Overview

The Department and Batch Management System introduces a hierarchical organizational structure to the educational platform, replacing hardcoded batch strings with a dynamic, database-driven solution. The system enables administrators to create and manage departments (e.g., Computer Science, Mechanical Engineering), create batches within those departments (e.g., CS-2026-A, ME-2025-B), and assign students to specific batches. This creates a clear organizational hierarchy: **Organization → Department → Batch → Student**.

### Key Design Goals

1. **Scalability**: Support unlimited departments and batches without code changes
2. **Flexibility**: Allow courses to target specific departments and batches
3. **Data Integrity**: Enforce referential integrity with safety checks on deletions
4. **Usability**: Provide intuitive admin interfaces for bulk operations
5. **Performance**: Optimize queries with proper indexing and population strategies
6. **Maintainability**: Use consistent patterns across backend and frontend

### System Context

The system integrates with existing components:
- **User Management**: Extends user profiles with department and batch assignments
- **Course Management**: Enables courses to target specific departments and batches
- **Enrollment System**: Filters course visibility based on student batch assignments
- **Reporting**: Provides department and batch-level analytics

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  Admin UI Components          │  Trainer UI Components          │
│  - DepartmentManagement       │  - CreateCourse (updated)       │
│  - BatchManagement            │  - CourseList (updated)         │
│  - StudentBatchAssignment     │                                 │
│                               │  Student UI Components          │
│                               │  - MyCourses (filtered)         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  RESTful API Endpoints                                          │
│  - /api/v1/departments/*                                        │
│  - /api/v1/batches/*                                            │
│  - /api/v1/courses/* (updated)                                  │
│  - /api/v1/users/* (updated)                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Business Logic Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  Controllers                  │  Middleware                     │
│  - DepartmentController       │  - Authentication               │
│  - BatchController            │  - Authorization (role-based)   │
│  - CourseController (updated) │  - Validation                   │
│  - UserController (updated)   │  - Error Handling               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Data Access Layer                         │
├─────────────────────────────────────────────────────────────────┤
│  Mongoose Models                                                │
│  - Department (new)                                             │
│  - Batch (new)                                                  │
│  - User (updated: +department, +batch)                          │
│  - Course (updated: batches[], departments[])                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MongoDB Database                           │
├─────────────────────────────────────────────────────────────────┤
│  Collections: departments, batches, users, courses              │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Patterns

#### 1. Department Creation Flow
```
Admin UI → POST /api/v1/departments → DepartmentController.create()
  → Validate uniqueness (name, code)
  → Create Department document
  → Return created department
```

#### 2. Batch Creation Flow
```
Admin UI → POST /api/v1/batches → BatchController.create()
  → Validate department exists
  → Validate uniqueness (code)
  → Create Batch document
  → Return created batch with populated department
```

#### 3. Student Assignment Flow
```
Admin UI → POST /api/v1/batches/:id/assign → BatchController.assignStudents()
  → Validate batch exists and has capacity
  → Validate students exist
  → Update User.batch and User.department
  → Increment Batch.currentStudents
  → Return updated batch
```

#### 4. Course Creation with Batches Flow
```
Trainer UI → POST /api/v1/courses → CourseController.create()
  → Validate departments exist
  → Validate batches exist and belong to selected departments
  → Create Course with department[] and batch[] references
  → Return created course with populated references
```

#### 5. Course Filtering Flow
```
Student UI → GET /api/v1/courses?batch=<id> → CourseController.getCourses()
  → Query courses where batches includes student's batch
  → OR departments includes student's department
  → OR course is public (no batch/dept restrictions)
  → Return filtered course list
```

### Security Architecture

#### Role-Based Access Control (RBAC)

| Resource | Administrator | Trainer | Participant |
|----------|--------------|---------|-------------|
| Departments (Create/Update/Delete) | ✅ | ❌ | ❌ |
| Departments (Read) | ✅ | ✅ | ✅ (own only) |
| Batches (Create/Update/Delete) | ✅ | ❌ | ❌ |
| Batches (Read) | ✅ | ✅ | ✅ (own only) |
| Student Assignment | ✅ | ❌ | ❌ |
| Course Assignment to Batches | ✅ | ✅ | ❌ |

#### Authentication & Authorization Middleware

```javascript
// Protect all department/batch routes
router.use('/departments', protect);
router.use('/batches', protect);

// Admin-only operations
router.post('/departments', authorize('administrator'));
router.put('/departments/:id', authorize('administrator'));
router.delete('/departments/:id', authorize('administrator'));

// Trainers can view for course creation
router.get('/departments', authorize('administrator', 'trainer', 'participant'));
router.get('/batches', authorize('administrator', 'trainer', 'participant'));
```

## Components and Interfaces

### Backend Components

#### 1. Department Model
**Location**: `backend/src/models/Department.model.js`

**Responsibilities**:
- Define department schema with validation rules
- Provide virtual fields for computed properties (batchCount)
- Enforce unique constraints on name and code
- Support soft deletion via isActive flag

**Key Methods**:
- Schema validation (built-in Mongoose)
- Virtual: `batchCount` - counts associated batches

**Indexes**:
- `{ name: 1 }` - for search queries
- `{ code: 1 }` - for unique lookups
- `{ isActive: 1 }` - for filtering active departments

#### 2. Batch Model
**Location**: `backend/src/models/Batch.model.js`

**Responsibilities**:
- Define batch schema with department reference
- Validate year range (2020-2100)
- Track student capacity (maxStudents, currentStudents)
- Calculate availability (isFull, availableSeats)

**Key Methods**:
- Virtual: `isFull` - returns true if currentStudents >= maxStudents
- Virtual: `availableSeats` - returns remaining capacity

**Indexes**:
- `{ code: 1 }` - unique batch codes
- `{ department: 1, year: -1 }` - for department-year queries
- `{ department: 1, code: 1 }` - compound unique index
- `{ isActive: 1 }` - for filtering active batches

#### 3. Department Controller
**Location**: `backend/src/controllers/department.controller.js`

**Responsibilities**:
- Handle CRUD operations for departments
- Validate business rules (uniqueness, deletion safety)
- Populate related data (HOD, batch counts)
- Support pagination and search

**Key Functions**:
```javascript
createDepartment(req, res)      // POST /api/v1/departments
getDepartments(req, res)        // GET /api/v1/departments
getDepartment(req, res)         // GET /api/v1/departments/:id
updateDepartment(req, res)      // PUT /api/v1/departments/:id
deleteDepartment(req, res)      // DELETE /api/v1/departments/:id
getDepartmentBatches(req, res)  // GET /api/v1/departments/:id/batches
```

**Validation Rules**:
- Name: required, unique, max 100 chars
- Code: required, unique, uppercase, max 10 chars
- Description: optional, max 500 chars
- Deletion: prevent if batches exist

#### 4. Batch Controller
**Location**: `backend/src/controllers/batch.controller.js`

**Responsibilities**:
- Handle CRUD operations for batches
- Validate department references
- Manage student assignments with capacity checks
- Support filtering by department and year

**Key Functions**:
```javascript
createBatch(req, res)           // POST /api/v1/batches
getBatches(req, res)            // GET /api/v1/batches
getBatch(req, res)              // GET /api/v1/batches/:id
updateBatch(req, res)           // PUT /api/v1/batches/:id
deleteBatch(req, res)           // DELETE /api/v1/batches/:id
getBatchStudents(req, res)      // GET /api/v1/batches/:id/students
assignStudentsToBatch(req, res) // POST /api/v1/batches/:id/assign
removeStudentsFromBatch(req, res) // POST /api/v1/batches/:id/remove
```

**Validation Rules**:
- Name: required, max 100 chars
- Code: required, unique, uppercase, max 20 chars
- Department: required, must exist
- Year: required, 2020-2100
- MaxStudents: optional, min 1
- Assignment: check capacity, validate department match

### Frontend Components

#### 1. DepartmentManagement Component
**Location**: `src/app/components/admin/DepartmentManagement.tsx`

**Responsibilities**:
- Display department list with search and filters
- Provide create/edit/delete operations
- Show batch and student counts per department
- Handle form validation and error display

**State Management**:
```typescript
- departments: Department[]
- loading: boolean
- showModal: boolean
- editingDept: Department | null
- searchTerm: string
- formData: { name, code, description }
```

**Key Features**:
- Real-time search filtering
- Modal-based create/edit forms
- Confirmation dialogs for deletion
- Refresh button for data reload
- Statistics cards (total departments, etc.)

#### 2. BatchManagement Component
**Location**: `src/app/components/admin/BatchManagement.tsx`

**Responsibilities**:
- Display batch list grouped by department
- Provide create/edit/delete operations
- Show student counts and capacity status
- Filter by department, year, and active status

**State Management**:
```typescript
- batches: Batch[]
- departments: Department[]
- loading: boolean
- showModal: boolean
- editingBatch: Batch | null
- filters: { department, year, isActive }
- formData: { name, code, department, year, dates, maxStudents }
```

**Key Features**:
- Department dropdown for filtering
- Year filter (2020-2030)
- Capacity indicators (progress bars)
- Coordinator assignment
- Date range pickers

#### 3. StudentBatchAssignment Component
**Location**: `src/app/components/admin/StudentBatchAssignment.tsx`

**Responsibilities**:
- Display student list with batch assignments
- Support individual and bulk assignment
- Handle CSV import for bulk operations
- Move students between batches

**State Management**:
```typescript
- students: User[]
- departments: Department[]
- batches: Batch[]
- selectedStudents: string[]
- filters: { department, batch, unassigned }
- csvFile: File | null
- previewData: any[]
```

**Key Features**:
- Multi-select student rows
- Department and batch dropdowns
- CSV upload with validation
- Preview before bulk assignment
- Unassigned students filter

#### 4. Updated CreateCourse Component
**Location**: `src/app/components/course/CreateCourse.tsx`

**Changes Required**:
- Replace hardcoded BATCHES array with API call
- Add department multi-select in Step 2 (Pricing)
- Add batch multi-select filtered by selected departments
- Update form submission to send ObjectIds instead of strings

**New State**:
```typescript
- departments: Department[]
- availableBatches: Batch[]
- selectedDepartments: string[]
- selectedBatches: string[]
```

**Integration Points**:
```typescript
// Fetch departments on mount
useEffect(() => {
  getDepartments({ isActive: true }).then(res => setDepartments(res.data));
}, []);

// Fetch batches when departments change
useEffect(() => {
  if (selectedDepartments.length > 0) {
    getBatches({ 
      department: selectedDepartments.join(','),
      isActive: true 
    }).then(res => setAvailableBatches(res.data));
  }
}, [selectedDepartments]);
```

### API Interfaces

#### Department API

```typescript
// GET /api/v1/departments
interface GetDepartmentsParams {
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

interface GetDepartmentsResponse {
  success: boolean;
  data: Department[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// POST /api/v1/departments
interface CreateDepartmentRequest {
  name: string;
  code: string;
  description?: string;
  headOfDepartment?: string;
}

interface CreateDepartmentResponse {
  success: boolean;
  data: Department;
  message: string;
}
```

#### Batch API

```typescript
// GET /api/v1/batches
interface GetBatchesParams {
  department?: string;
  year?: number;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

interface GetBatchesResponse {
  success: boolean;
  data: Batch[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// POST /api/v1/batches/:id/assign
interface AssignStudentsRequest {
  studentIds: string[];
}

interface AssignStudentsResponse {
  success: boolean;
  data: {
    batch: Batch;
    assignedCount: number;
    failedAssignments: Array<{
      studentId: string;
      reason: string;
    }>;
  };
  message: string;
}
```

## Data Models

### Entity Relationship Diagram

```
┌─────────────────────┐
│    DEPARTMENT       │
├─────────────────────┤
│ _id: ObjectId (PK)  │
│ name: String        │
│ code: String (UK)   │
│ description: String │
│ headOfDepartment: → │──┐
│ isActive: Boolean   │  │
│ createdBy: →        │  │
│ createdAt: Date     │  │
│ updatedAt: Date     │  │
└─────────────────────┘  │
         │               │
         │ 1:N           │
         ▼               │
┌─────────────────────┐  │
│      BATCH          │  │
├─────────────────────┤  │
│ _id: ObjectId (PK)  │  │
│ name: String        │  │
│ code: String (UK)   │  │
│ department: → (FK)  │──┘
│ year: Number        │
│ startDate: Date     │
│ endDate: Date       │
│ maxStudents: Number │
│ currentStudents: #  │
│ coordinator: →      │──┐
│ isActive: Boolean   │  │
│ createdBy: →        │  │
│ createdAt: Date     │  │
│ updatedAt: Date     │  │
└─────────────────────┘  │
         │               │
         │ N:M           │
         ▼               │
┌─────────────────────┐  │
│      COURSE         │  │
├─────────────────────┤  │
│ _id: ObjectId (PK)  │  │
│ title: String       │  │
│ description: String │  │
│ category: String    │  │
│ trainer: → (FK)     │──┤
│ batches[]: → (FK)   │──┘
│ departments[]: →(FK)│──┐
│ sections[]          │  │
│ pricing             │  │
│ status: String      │  │
│ ...                 │  │
└─────────────────────┘  │
                         │
         ┌───────────────┘
         │
         ▼
┌─────────────────────┐
│       USER          │
├─────────────────────┤
│ _id: ObjectId (PK)  │
│ firstName: String   │
│ lastName: String    │
│ email: String (UK)  │
│ role: String        │
│ department: → (FK)  │──┐
│ batch: → (FK)       │──┤
│ organization: String│  │
│ isApproved: Boolean │  │
│ isActive: Boolean   │  │
│ ...                 │  │
└─────────────────────┘  │
                         │
         ┌───────────────┘
         │
         ▼
┌─────────────────────┐
│    ENROLLMENT       │
├─────────────────────┤
│ (embedded in User)  │
│ course: → (FK)      │
│ enrolledAt: Date    │
│ progress: Number    │
│ status: String      │
└─────────────────────┘
```

### Schema Definitions

#### Department Schema

```javascript
{
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 100
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 10
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  headOfDepartment: {
    type: ObjectId,
    ref: 'User',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  timestamps: true
}

// Virtuals
batchCount: Number (computed from Batch collection)
```

#### Batch Schema

```javascript
{
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 20
  },
  department: {
    type: ObjectId,
    ref: 'Department',
    required: true
  },
  year: {
    type: Number,
    required: true,
    min: 2020,
    max: 2100
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  maxStudents: {
    type: Number,
    default: null,
    min: 1
  },
  currentStudents: {
    type: Number,
    default: 0,
    min: 0
  },
  coordinator: {
    type: ObjectId,
    ref: 'User',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  timestamps: true
}

// Virtuals
isFull: Boolean (currentStudents >= maxStudents)
availableSeats: Number (maxStudents - currentStudents)
```

#### User Schema Updates

```javascript
// Added fields
{
  department: {
    type: ObjectId,
    ref: 'Department',
    default: null
  },
  batch: {
    type: ObjectId,
    ref: 'Batch',
    default: null
  }
}
```

#### Course Schema Updates

```javascript
// Changed from String[] to ObjectId[]
{
  batches: [{
    type: ObjectId,
    ref: 'Batch'
  }],
  departments: [{
    type: ObjectId,
    ref: 'Department'
  }],
  trainer: {
    type: ObjectId,
    ref: 'User'
  }
}
```

### Data Constraints and Business Rules

#### Department Constraints
1. **Uniqueness**: Name and code must be unique across all departments
2. **Deletion Safety**: Cannot delete department if batches exist
3. **Code Format**: Uppercase, alphanumeric, max 10 characters
4. **HOD Assignment**: Must reference valid User with trainer or administrator role

#### Batch Constraints
1. **Uniqueness**: Code must be unique across all batches
2. **Department Reference**: Must reference existing, active department
3. **Year Range**: Must be between 2020 and 2100
4. **Capacity**: currentStudents cannot exceed maxStudents
5. **Deletion Safety**: Cannot delete batch if students are assigned
6. **Date Validation**: endDate must be after startDate (if both provided)

#### Student Assignment Constraints
1. **Batch-Department Match**: Student's batch must belong to student's department
2. **Capacity Check**: Cannot assign students if batch is full
3. **Uniqueness**: Student can only be in one batch at a time
4. **Bulk Assignment**: All assignments in bulk operation must succeed or all fail (transaction)

#### Course Assignment Constraints
1. **Department Validation**: All referenced departments must exist
2. **Batch Validation**: All referenced batches must exist and be active
3. **Batch-Department Match**: All batches must belong to selected departments
4. **Trainer Assignment**: Trainer must be a valid User with trainer role

### Migration Strategy

#### Phase 1: Create New Collections
```javascript
// Run migration script to:
1. Create departments collection with default departments
2. Create batches collection from existing string batches
3. Update users collection with department and batch fields
4. Update courses collection with new batch/department references
```

#### Phase 2: Data Transformation
```javascript
// For each existing course with string batches:
1. Parse batch string (e.g., "Batch A - 2026")
2. Find or create corresponding Batch document
3. Update course.batches with Batch ObjectId
4. Preserve original data in backup collection
```

#### Phase 3: Validation
```javascript
// Verify migration:
1. All courses have valid batch references
2. All batches have valid department references
3. No orphaned records
4. Referential integrity maintained
```


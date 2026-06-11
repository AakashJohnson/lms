# Implementation Plan: Department and Batch Management System

## Overview

This implementation plan covers the complete development of the Department and Batch Management System, transforming the hardcoded batch strings into a dynamic, database-driven organizational hierarchy. The backend models, controllers, and routes are already implemented. This plan focuses on frontend UI components, integration with existing course management, data migration, and comprehensive testing.

**Technology Stack:**
- Backend: JavaScript (Node.js, Express, MongoDB/Mongoose)
- Frontend: TypeScript (React)
- Services: TypeScript interfaces already defined

**Implementation Status:**
- ✅ Backend models (Department, Batch, User updates, Course updates)
- ✅ Backend controllers and routes
- ✅ Frontend services (departmentService.ts, batchService.ts)
- ⏳ Frontend UI components (to be implemented)
- ⏳ Course creation integration (to be updated)
- ⏳ Migration scripts (to be created)

## Tasks

### 1. Backend Verification and Testing

- [x] 1.1 Verify backend API endpoints are functional
  - Test all department CRUD endpoints with Postman or similar tool
  - Test all batch CRUD endpoints
  - Test student assignment endpoints
  - Verify error handling and validation rules
  - Check authentication and authorization middleware
  - _Requirements: 1.1-1.10, 2.1-2.5, 3.1-3.11, 4.1-4.5, 5.1-5.10_

- [ ]* 1.2 Write integration tests for department endpoints
  - Test department creation with valid and invalid data
  - Test uniqueness constraints for name and code
  - Test deletion safety checks (prevent deletion with batches)
  - Test pagination and search functionality
  - _Requirements: 1.1-1.10, 2.1-2.5, 14.1-14.10_

- [ ]* 1.3 Write integration tests for batch endpoints
  - Test batch creation with valid and invalid data
  - Test department reference validation
  - Test capacity limits and student assignment
  - Test deletion safety checks (prevent deletion with students)
  - _Requirements: 3.1-3.11, 4.1-4.5, 5.1-5.10, 14.1-14.10_

### 2. Create Department Management UI Component

- [x] 2.1 Create DepartmentManagement component structure
  - Create file at `src/app/components/admin/DepartmentManagement.tsx`
  - Set up component state (departments, loading, showModal, editingDept, searchTerm, formData)
  - Import department service functions (getDepartments, createDepartment, updateDepartment, deleteDepartment)
  - Import required icons from lucide-react (Plus, Edit2, Trash2, Users, BookOpen, Search, RefreshCw)
  - _Requirements: 1.1-1.10, 9.1-9.7_

- [x] 2.2 Implement department list view with table
  - Create responsive table layout with columns: Department, Code, Batches, Students, Actions
  - Display department name, code, description
  - Show batch count and student count per department
  - Add loading state with spinner
  - Add empty state message when no departments exist
  - _Requirements: 1.6-1.10, 9.5-9.6_

- [x] 2.3 Implement search and filter functionality
  - Add search input field with real-time filtering
  - Filter departments by name or code
  - Add active status filter toggle
  - Update table display based on filters
  - _Requirements: 1.7-1.8_

- [x] 2.4 Implement create department modal
  - Create modal with form fields: name, code, description
  - Add form validation (required fields, max lengths)
  - Handle form submission with createDepartment service
  - Display success/error toast notifications
  - Close modal and refresh list on success
  - _Requirements: 1.1-1.5, 14.1-14.7_

- [x] 2.5 Implement edit department functionality
  - Add edit button for each department row
  - Pre-populate modal form with existing department data
  - Handle form submission with updateDepartment service
  - Display success/error toast notifications
  - Refresh list on success
  - _Requirements: 1.5, 14.1-14.7_

- [x] 2.6 Implement delete department with confirmation
  - Add delete button for each department row
  - Show confirmation dialog before deletion
  - Call deleteDepartment service
  - Handle error if department has batches (safety check)
  - Display appropriate error message
  - Refresh list on success
  - _Requirements: 2.1-2.5, 14.1-14.7_

- [x] 2.7 Add statistics cards and refresh functionality
  - Create statistics card showing total departments count
  - Add refresh button to reload department list
  - Implement auto-refresh on component mount
  - Add loading state during refresh
  - _Requirements: 1.6, 1.9-1.10_

- [ ]* 2.8 Write unit tests for DepartmentManagement component
  - Test component rendering with mock data
  - Test search and filter functionality
  - Test modal open/close behavior
  - Test form validation
  - Test API integration with mocked services
  - _Requirements: 1.1-1.10_

### 3. Create Batch Management UI Component

- [x] 3.1 Create BatchManagement component structure
  - Create file at `src/app/components/admin/BatchManagement.tsx`
  - Set up component state (batches, departments, loading, showModal, editingBatch, filters, formData)
  - Import batch and department service functions
  - Import required icons from lucide-react
  - _Requirements: 3.1-3.11, 9.1-9.7_

- [x] 3.2 Implement batch list view with department grouping
  - Create responsive table layout with columns: Batch Name, Code, Department, Year, Students, Capacity, Actions
  - Display batch details with populated department information
  - Show current students vs max students with progress bar
  - Calculate and display available seats
  - Add loading and empty states
  - _Requirements: 3.6-3.11, 9.5-9.7_

- [x] 3.3 Implement filter functionality for batches
  - Add department dropdown filter (fetch from department service)
  - Add year filter dropdown (2020-2030 range)
  - Add active status filter toggle
  - Update batch list based on selected filters
  - Clear filters functionality
  - _Requirements: 3.7-3.9_

- [x] 3.4 Implement create batch modal
  - Create modal with form fields: name, code, department (dropdown), year, startDate, endDate, maxStudents, coordinator
  - Add form validation (required fields, year range 2020-2100, date validation)
  - Fetch and populate department dropdown
  - Handle form submission with createBatch service
  - Display success/error toast notifications
  - Close modal and refresh list on success
  - _Requirements: 3.1-3.5, 14.1-14.7_

- [x] 3.5 Implement edit batch functionality
  - Add edit button for each batch row
  - Pre-populate modal form with existing batch data
  - Handle form submission with updateBatch service
  - Display success/error toast notifications
  - Refresh list on success
  - _Requirements: 3.5, 14.1-14.7_

- [x] 3.6 Implement delete batch with confirmation
  - Add delete button for each batch row
  - Show confirmation dialog before deletion
  - Call deleteBatch service
  - Handle error if batch has students (safety check)
  - Display appropriate error message
  - Refresh list on success
  - _Requirements: 4.1-4.5, 14.1-14.7_

- [x] 3.7 Add capacity indicators and statistics
  - Display capacity progress bars (currentStudents / maxStudents)
  - Show visual indicators for full batches
  - Add statistics cards (total batches, full batches, etc.)
  - Calculate and display total students across all batches
  - _Requirements: 3.10-3.11_

- [ ]* 3.8 Write unit tests for BatchManagement component
  - Test component rendering with mock data
  - Test filter functionality (department, year, active)
  - Test modal open/close behavior
  - Test form validation (year range, dates)
  - Test capacity calculations
  - Test API integration with mocked services
  - _Requirements: 3.1-3.11_

### 4. Create Student Batch Assignment UI Component

- [ ] 4.1 Create StudentBatchAssignment component structure
  - Create file at `src/app/components/admin/StudentBatchAssignment.tsx`
  - Set up component state (students, departments, batches, selectedStudents, filters, csvFile, previewData)
  - Import batch service functions (assignStudentsToBatch, removeStudentsFromBatch, getBatchStudents)
  - Import user service functions to fetch students
  - Import required icons from lucide-react
  - _Requirements: 5.1-5.10, 6.1-6.10, 9.1-9.7_

- [ ] 4.2 Implement student list view with selection
  - Create responsive table with columns: Select, Name, Email, Department, Batch, Actions
  - Add checkbox for individual student selection
  - Add "select all" checkbox in header
  - Display current department and batch assignments
  - Show unassigned students with visual indicator
  - Add loading and empty states
  - _Requirements: 5.1-5.10, 9.3-9.4_

- [ ] 4.3 Implement filter functionality for students
  - Add department dropdown filter
  - Add batch dropdown filter (filtered by selected department)
  - Add "unassigned only" toggle filter
  - Update student list based on selected filters
  - Clear filters functionality
  - _Requirements: 5.1-5.10, 9.1-9.7_

- [ ] 4.4 Implement individual student assignment
  - Add "Assign" button for each student row
  - Show assignment modal with department and batch dropdowns
  - Validate batch belongs to selected department
  - Check batch capacity before assignment
  - Call assignStudentsToBatch service
  - Display success/error toast notifications
  - Refresh list on success
  - _Requirements: 5.1-5.10, 14.1-14.10_

- [ ] 4.5 Implement bulk student assignment
  - Add bulk action toolbar when students are selected
  - Show selected count
  - Add "Assign to Batch" button
  - Show assignment modal with department and batch dropdowns
  - Validate all assignments before execution
  - Check batch capacity for bulk assignment
  - Call assignStudentsToBatch service with array of student IDs
  - Display success/error toast with assignment count
  - Refresh list on success
  - _Requirements: 5.6-5.10, 14.1-14.10_

- [ ] 4.6 Implement remove students from batch
  - Add "Remove from Batch" button for assigned students
  - Show confirmation dialog
  - Call removeStudentsFromBatch service
  - Update student list to show unassigned status
  - Display success/error toast notifications
  - _Requirements: 5.8-5.9_

- [ ] 4.7 Implement CSV bulk import functionality
  - Add CSV file upload button and input
  - Accept CSV format: email, departmentCode, batchCode
  - Parse CSV file and validate format
  - Validate all referenced departments exist
  - Validate all referenced batches exist
  - Validate all student emails correspond to existing users
  - Display validation errors without making assignments
  - _Requirements: 6.1-6.6, 14.1-14.10_

- [ ] 4.8 Implement CSV import preview and confirmation
  - Show preview table of parsed CSV data
  - Display validation status for each row (valid/invalid)
  - Show summary: total rows, valid rows, invalid rows
  - Add "Confirm Import" button (disabled if validation fails)
  - Execute bulk assignment on confirmation
  - Display progress indicator during import
  - Show final report: successful assignments, failed assignments
  - _Requirements: 6.7-6.10_

- [ ]* 4.9 Write unit tests for StudentBatchAssignment component
  - Test component rendering with mock data
  - Test student selection (individual and bulk)
  - Test filter functionality
  - Test assignment validation (department-batch match, capacity)
  - Test CSV parsing and validation
  - Test API integration with mocked services
  - _Requirements: 5.1-5.10, 6.1-6.10_

### 5. Update Course Creation Component

- [x] 5.1 Update CreateCourse component to fetch departments
  - Import getDepartments from departmentService
  - Add state for departments list
  - Fetch active departments on component mount
  - Handle loading and error states
  - _Requirements: 7.1-7.7, 8.1-8.6_

- [x] 5.2 Add department multi-select to Step 2 (Pricing)
  - Replace or add department selection UI in Step 2
  - Implement multi-select dropdown for departments
  - Update form state to store selected department IDs
  - Add validation to ensure at least one department is selected (if required)
  - _Requirements: 7.1-7.2_

- [x] 5.3 Update batch selection to use dynamic data
  - Remove hardcoded BATCHES array
  - Import getBatches from batchService
  - Add state for available batches
  - Fetch batches when departments are selected
  - Filter batches to show only those belonging to selected departments
  - _Requirements: 7.3-7.7_

- [x] 5.4 Implement filtered batch multi-select
  - Update batch selection UI to use fetched batch data
  - Display batch name, code, and department
  - Enable multi-select for batches
  - Update form state to store selected batch IDs (ObjectIds)
  - Add validation to ensure batches belong to selected departments
  - _Requirements: 7.3-7.7, 14.1-14.10_

- [x] 5.5 Update course submission to send ObjectIds
  - Modify form submission handler
  - Send department IDs as array of ObjectIds
  - Send batch IDs as array of ObjectIds
  - Remove any string-based batch handling
  - Handle API response and errors
  - _Requirements: 7.4-7.7_

- [ ]* 5.6 Write integration tests for updated CreateCourse
  - Test department fetching on mount
  - Test batch fetching when departments change
  - Test batch filtering by selected departments
  - Test form validation (department-batch match)
  - Test course creation with departments and batches
  - _Requirements: 7.1-7.7_

### 6. Update Course Listing and Filtering

- [ ] 6.1 Update MyCourses component to display department and batch info
  - Import department and batch services
  - Update course card to display department names
  - Update course card to display batch names
  - Handle courses with no department/batch (public courses)
  - _Requirements: 8.1-8.6_

- [ ] 6.2 Add department filter to course catalog
  - Add department dropdown filter
  - Fetch departments for filter options
  - Update course query to filter by department
  - Display filtered results
  - _Requirements: 8.1-8.2_

- [ ] 6.3 Add batch filter to course catalog
  - Add batch dropdown filter
  - Fetch batches for filter options (filtered by selected department)
  - Update course query to filter by batch
  - Display filtered results
  - _Requirements: 8.1-8.2_

- [ ] 6.4 Implement student-specific course filtering
  - Fetch current student's department and batch from profile
  - Automatically filter courses to show student's department courses
  - Automatically filter courses to show student's batch courses
  - Include public courses (no department/batch restrictions)
  - Add visual indicator for course relevance (your batch, your dept, public)
  - _Requirements: 8.3-8.6_

- [ ]* 6.5 Write integration tests for course filtering
  - Test department filter functionality
  - Test batch filter functionality
  - Test student-specific filtering logic
  - Test public course visibility
  - Test course card display with department/batch info
  - _Requirements: 8.1-8.6_

### 7. Integrate Admin Components into Navigation

- [x] 7.1 Update App.tsx to import admin components
  - Import DepartmentManagement component
  - Import BatchManagement component
  - Import StudentBatchAssignment component
  - Add route cases in renderContent function for 'departments', 'batches', 'student-assignment'
  - _Requirements: 9.1-9.7_

- [x] 7.2 Update Sidebar navigation for admin users
  - Add "Departments" navigation item (admin only)
  - Add "Batches" navigation item (admin only)
  - Add "Student Assignment" navigation item (admin only)
  - Import required icons (Building2, Users, UserPlus from lucide-react)
  - Ensure navigation items are only visible to administrator role
  - _Requirements: 9.1-9.2_

- [ ]* 7.3 Test navigation and access control
  - Verify admin users can access all three new pages
  - Verify trainers cannot access admin pages
  - Verify students cannot access admin pages
  - Test navigation between pages
  - Test page state persistence
  - _Requirements: 9.1-9.7_

### 8. Create Data Migration Scripts

- [ ] 8.1 Create seed data script for departments
  - Create file at `backend/seeders/departments-batches.seed.js`
  - Define default departments (Computer Science, Mechanical Engineering, Civil Engineering, Electrical Engineering)
  - Create department documents with codes (CS, ME, CE, EE)
  - Add descriptions for each department
  - Set isActive to true
  - Store createdBy as system admin
  - _Requirements: 10.1-10.6, 11.1-11.8_

- [ ] 8.2 Create seed data script for batches
  - In the same seed file, define batches for each department
  - Create batches for years 2025 and 2026
  - Use naming convention: "Batch A - 2026", "Batch B - 2026", etc.
  - Use code convention: "CS-2026-A", "CS-2026-B", etc.
  - Set maxStudents to reasonable defaults (e.g., 50)
  - Link batches to their respective departments
  - Set isActive to true
  - _Requirements: 10.1-10.6, 11.1-11.8_

- [ ] 8.3 Create migration script for existing courses
  - Create file at `backend/migrations/migrate-course-batches.js`
  - Find all courses with string-based batches array
  - Parse each batch string (e.g., "Batch A - 2026")
  - Find or create corresponding Batch document
  - Update course.batches to reference Batch ObjectIds
  - Preserve original data in backup collection
  - Log migration progress and results
  - _Requirements: 10.1-10.6_

- [ ] 8.4 Create migration script for trainer field in courses
  - In the same migration file, handle trainer field conversion
  - Find courses with string-based trainer field
  - Convert trainer strings to User ObjectId references
  - Validate trainer users exist
  - Update course.trainer to ObjectId reference
  - Log conversion results
  - _Requirements: 10.1-10.6_

- [ ] 8.5 Run and verify migration scripts
  - Execute seed data script to create departments and batches
  - Verify departments collection has correct data
  - Verify batches collection has correct data
  - Execute course migration script
  - Verify all courses have ObjectId references for batches
  - Verify no data loss occurred
  - Check referential integrity
  - _Requirements: 10.1-10.6_

- [ ]* 8.6 Write tests for migration scripts
  - Test seed data creation
  - Test course batch migration logic
  - Test trainer field migration logic
  - Test error handling for invalid data
  - Test rollback functionality
  - _Requirements: 10.1-10.6_

### 9. Checkpoint - Verify Core Functionality

- [ ] 9.1 End-to-end testing of department management
  - Create a new department via UI
  - Edit department details
  - View department list with search and filters
  - Attempt to delete department with batches (should fail)
  - Delete department without batches (should succeed)
  - Verify all operations reflect in database
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9.2 End-to-end testing of batch management
  - Create a new batch via UI
  - Edit batch details
  - View batch list with filters (department, year)
  - Check capacity indicators
  - Attempt to delete batch with students (should fail)
  - Delete batch without students (should succeed)
  - Verify all operations reflect in database
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9.3 End-to-end testing of student assignment
  - Assign individual student to department and batch
  - Perform bulk assignment of multiple students
  - Test CSV import with valid data
  - Test CSV import with invalid data (should show errors)
  - Remove students from batch
  - Move students between batches
  - Verify capacity limits are enforced
  - Ensure all tests pass, ask the user if questions arise.

### 10. Implement Advanced Features

- [ ] 10.1 Add HOD (Head of Department) assignment functionality
  - Add HOD selection dropdown in department create/edit modal
  - Fetch users with trainer or administrator role
  - Update department with headOfDepartment reference
  - Display HOD information in department list
  - Populate HOD details (name, email) when retrieving departments
  - _Requirements: 13.1-13.8_

- [ ] 10.2 Add Coordinator assignment functionality
  - Add coordinator selection dropdown in batch create/edit modal
  - Fetch users with trainer or administrator role
  - Update batch with coordinator reference
  - Display coordinator information in batch list
  - Populate coordinator details (name, email) when retrieving batches
  - _Requirements: 13.1-13.8_

- [ ] 10.3 Implement hierarchical data retrieval
  - Add "View Batches" button in department list
  - Create modal or expandable section to show department's batches
  - Fetch batches using getDepartmentBatches endpoint
  - Display batch details with student counts
  - Add "View Students" button in batch list
  - Create modal to show batch's students
  - Fetch students using getBatchStudents endpoint
  - Display student details (name, email, enrollment status)
  - _Requirements: 12.1-12.5_

- [ ] 10.4 Add status management (activate/deactivate)
  - Add toggle switch for department active status
  - Add toggle switch for batch active status
  - Update department/batch isActive field via API
  - Filter lists to show only active items by default
  - Add "Show Inactive" toggle to display deactivated items
  - Ensure deactivated items appear in historical reports
  - _Requirements: 11.1-11.8_

- [ ]* 10.5 Write tests for advanced features
  - Test HOD assignment and display
  - Test coordinator assignment and display
  - Test hierarchical data retrieval (dept → batches → students)
  - Test status management (activate/deactivate)
  - Test filtering by active status
  - _Requirements: 11.1-11.8, 12.1-12.5, 13.1-13.8_

### 11. Performance Optimization and Polish

- [ ] 11.1 Optimize API queries with proper population
  - Review all API endpoints for N+1 query issues
  - Add .populate() for department, batch, and user references
  - Use .select() to limit populated fields
  - Add indexes for frequently queried fields
  - Test query performance with large datasets
  - _Requirements: 12.1-12.5_

- [ ] 11.2 Implement pagination for large lists
  - Add pagination controls to department list
  - Add pagination controls to batch list
  - Add pagination controls to student list
  - Update API calls to include page and limit parameters
  - Display page numbers and navigation buttons
  - Show total count and current page info
  - _Requirements: 1.6, 3.6_

- [ ] 11.3 Add loading states and error handling
  - Ensure all API calls have loading indicators
  - Add skeleton loaders for tables during data fetch
  - Implement error boundaries for component errors
  - Display user-friendly error messages
  - Add retry functionality for failed requests
  - Log errors for debugging
  - _Requirements: 14.1-14.10_

- [ ] 11.4 Improve UI/UX with animations and transitions
  - Add smooth transitions for modal open/close
  - Add hover effects for interactive elements
  - Add loading animations for buttons during submission
  - Add success animations for completed actions
  - Ensure responsive design for mobile devices
  - Test accessibility (keyboard navigation, screen readers)

- [ ] 11.5 Add audit trail display
  - Display creation timestamp for departments and batches
  - Display last update timestamp
  - Show creator information (name, email)
  - Add "Last Modified" column to tables
  - Format timestamps in user-friendly format
  - _Requirements: 15.1-15.8_

### 12. Documentation and Training

- [ ] 12.1 Create user documentation for admin features
  - Write guide for department management
  - Write guide for batch management
  - Write guide for student assignment (individual and bulk)
  - Write guide for CSV import format and process
  - Include screenshots and examples
  - Document common error scenarios and solutions

- [ ] 12.2 Create API documentation
  - Document all department endpoints with request/response examples
  - Document all batch endpoints with request/response examples
  - Document authentication and authorization requirements
  - Document error codes and messages
  - Provide Postman collection or OpenAPI spec

- [ ] 12.3 Update existing documentation
  - Update course creation documentation to reflect new batch selection
  - Update user management documentation to include department/batch fields
  - Update system architecture documentation
  - Update database schema documentation

### 13. Final Testing and Deployment Preparation

- [ ] 13.1 Comprehensive integration testing
  - Test complete workflow: create dept → create batch → assign students → create course → student enrollment
  - Test edge cases: full batches, invalid references, concurrent updates
  - Test error scenarios: network failures, validation errors, permission errors
  - Test with different user roles (admin, trainer, student)
  - Verify data consistency across all operations
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13.2 Performance testing with realistic data
  - Seed database with realistic data volumes (100+ departments, 500+ batches, 10000+ students)
  - Test page load times for all components
  - Test API response times under load
  - Identify and fix performance bottlenecks
  - Optimize database queries if needed

- [ ] 13.3 Security audit
  - Verify authentication on all endpoints
  - Verify authorization (role-based access control)
  - Test for SQL injection vulnerabilities (if applicable)
  - Test for XSS vulnerabilities in UI
  - Verify input validation on all forms
  - Check for sensitive data exposure in API responses

- [ ] 13.4 Browser compatibility testing
  - Test on Chrome, Firefox, Safari, Edge
  - Test on mobile browsers (iOS Safari, Chrome Mobile)
  - Verify responsive design on different screen sizes
  - Fix any browser-specific issues

- [ ] 13.5 Prepare deployment checklist
  - Create database backup before migration
  - Document rollback procedure
  - Prepare migration scripts for production
  - Create deployment runbook
  - Schedule maintenance window if needed
  - Notify stakeholders of new features

### 14. Final Checkpoint - Production Readiness

- [ ] 14.1 Final review and sign-off
  - Review all implemented features against requirements
  - Verify all acceptance criteria are met
  - Conduct user acceptance testing with stakeholders
  - Address any final feedback or issues
  - Obtain approval for production deployment
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Backend models, controllers, and routes are already implemented and tested
- Frontend services (departmentService.ts, batchService.ts) are already created with TypeScript interfaces
- Focus is on UI components, integration, migration, and testing
- Checkpoints ensure incremental validation and user feedback
- The implementation follows the existing codebase patterns and conventions
- All components use the existing design system and UI libraries
- CSV import format: `email,departmentCode,batchCode` (header row required)

## Success Criteria

- ✅ Admins can create, edit, and delete departments and batches via UI
- ✅ Admins can assign students to departments and batches (individual and bulk)
- ✅ Trainers can create courses with dynamic department and batch selection
- ✅ Students see courses filtered by their department and batch
- ✅ All existing course data is migrated to new system without data loss
- ✅ System enforces referential integrity and capacity limits
- ✅ All operations are properly authenticated and authorized
- ✅ UI is responsive, accessible, and user-friendly
- ✅ System performs well with realistic data volumes
- ✅ Comprehensive documentation is available for users and developers

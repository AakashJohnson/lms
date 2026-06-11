# Requirements Document

## Introduction

The Department and Batch Management System enables administrators to create and manage a hierarchical organizational structure for an educational platform. Departments form the top level of the hierarchy, with batches nested within departments. Students are assigned to specific batches, creating a clear mapping that facilitates course enrollment and organizational management. This system replaces the current hardcoded batch strings with a dynamic, scalable solution.

## Glossary

- **Admin**: A user with administrator role who has full control over department, batch, and student assignment operations
- **Department**: An organizational unit representing an academic department (e.g., Computer Science, Mechanical Engineering)
- **Batch**: A unique group of students within a department, typically associated with a specific year or cohort
- **Student**: A user with participant role who is enrolled in courses and assigned to a batch
- **Trainer**: A user with trainer role who creates and manages courses
- **Course**: An educational offering that can be assigned to specific departments and batches
- **System**: The Department and Batch Management System
- **Enrollment**: The process of assigning students to courses based on their batch and department
- **HOD**: Head of Department - a user designated as the leader of a department
- **Coordinator**: A user designated as the coordinator for a specific batch

## Requirements

### Requirement 1: Department Creation and Management

**User Story:** As an Admin, I want to create and manage departments, so that I can organize the educational institution's structure.

#### Acceptance Criteria

1. THE System SHALL allow Admins to create a new Department with name, code, and optional description
2. THE System SHALL enforce unique Department names across the platform
3. THE System SHALL enforce unique Department codes across the platform
4. WHEN a Department is created, THE System SHALL store the creating Admin's identifier
5. THE System SHALL allow Admins to update Department name, code, and description
6. THE System SHALL allow Admins to view a list of all Departments with pagination support
7. THE System SHALL allow Admins to search Departments by name or code
8. THE System SHALL allow Admins to filter Departments by active status
9. THE System SHALL display the count of batches associated with each Department
10. THE System SHALL display the count of students associated with each Department

### Requirement 2: Department Deletion with Safety Checks

**User Story:** As an Admin, I want to safely delete departments, so that I can maintain a clean organizational structure without losing critical data.

#### Acceptance Criteria

1. WHEN an Admin attempts to delete a Department, THE System SHALL check if any Batches are associated with it
2. IF a Department has associated Batches, THEN THE System SHALL prevent deletion and return an error message
3. WHEN a Department has no associated Batches, THE System SHALL allow deletion
4. WHEN a Department is deleted, THE System SHALL remove all references to it from the database
5. THE System SHALL require Admin confirmation before deleting a Department

### Requirement 3: Batch Creation and Management

**User Story:** As an Admin, I want to create and manage batches within departments, so that I can organize students into cohorts.

#### Acceptance Criteria

1. THE System SHALL allow Admins to create a new Batch with name, code, department reference, year, and optional start date, end date, and maximum students
2. THE System SHALL enforce unique Batch codes across the platform
3. WHEN a Batch is created, THE System SHALL require a valid Department reference
4. WHEN a Batch is created, THE System SHALL store the creating Admin's identifier
5. THE System SHALL allow Admins to update Batch name, code, year, dates, maximum students, and coordinator
6. THE System SHALL allow Admins to view a list of all Batches with pagination support
7. THE System SHALL allow Admins to filter Batches by Department
8. THE System SHALL allow Admins to filter Batches by year
9. THE System SHALL allow Admins to filter Batches by active status
10. THE System SHALL display the current student count for each Batch
11. THE System SHALL calculate and display available seats for each Batch based on maximum students and current students

### Requirement 4: Batch Deletion with Safety Checks

**User Story:** As an Admin, I want to safely delete batches, so that I can maintain accurate batch records without affecting enrolled students.

#### Acceptance Criteria

1. WHEN an Admin attempts to delete a Batch, THE System SHALL check if any Students are assigned to it
2. IF a Batch has assigned Students, THEN THE System SHALL prevent deletion and return an error message
3. WHEN a Batch has no assigned Students, THE System SHALL allow deletion
4. WHEN a Batch is deleted, THE System SHALL remove all references to it from Courses
5. THE System SHALL require Admin confirmation before deleting a Batch

### Requirement 5: Student Assignment to Department and Batch

**User Story:** As an Admin, I want to assign students to departments and batches, so that students can be organized and enrolled in appropriate courses.

#### Acceptance Criteria

1. THE System SHALL allow Admins to assign a Student to a Department
2. THE System SHALL allow Admins to assign a Student to a Batch
3. WHEN assigning a Student to a Batch, THE System SHALL verify the Batch belongs to the Student's Department
4. WHEN assigning Students to a Batch, THE System SHALL check if the Batch has reached maximum capacity
5. IF a Batch is at maximum capacity, THEN THE System SHALL prevent assignment and return an error message
6. THE System SHALL allow Admins to assign multiple Students to a Batch in a single operation
7. THE System SHALL increment the Batch's current student count when Students are assigned
8. THE System SHALL allow Admins to remove Students from a Batch
9. WHEN Students are removed from a Batch, THE System SHALL decrement the Batch's current student count
10. THE System SHALL allow Admins to move Students between Batches within the same Department

### Requirement 6: Bulk Student Assignment via CSV Import

**User Story:** As an Admin, I want to import student assignments from a CSV file, so that I can efficiently assign large numbers of students to departments and batches.

#### Acceptance Criteria

1. THE System SHALL accept CSV files with columns for student email, department code, and batch code
2. WHEN a CSV file is uploaded, THE System SHALL validate the file format
3. WHEN a CSV file is uploaded, THE System SHALL validate that all referenced Departments exist
4. WHEN a CSV file is uploaded, THE System SHALL validate that all referenced Batches exist
5. WHEN a CSV file is uploaded, THE System SHALL validate that all student emails correspond to existing users
6. IF validation fails for any row, THEN THE System SHALL report all validation errors without making any assignments
7. WHEN validation succeeds, THE System SHALL display a preview of assignments before execution
8. THE System SHALL require Admin confirmation before executing bulk assignments
9. WHEN bulk assignments are executed, THE System SHALL update all Student records with their Department and Batch assignments
10. WHEN bulk assignments complete, THE System SHALL report the number of successful assignments

### Requirement 7: Course Assignment to Departments and Batches

**User Story:** As a Trainer, I want to assign courses to specific departments and batches, so that the right students can access the right courses.

#### Acceptance Criteria

1. THE System SHALL allow Trainers to select one or more Departments when creating a Course
2. THE System SHALL allow Trainers to select one or more Batches when creating a Course
3. WHEN Departments are selected, THE System SHALL filter available Batches to show only those belonging to selected Departments
4. THE System SHALL store Department references as an array of Department identifiers in the Course
5. THE System SHALL store Batch references as an array of Batch identifiers in the Course
6. THE System SHALL allow Trainers to update Department and Batch assignments for existing Courses
7. WHEN a Course is retrieved, THE System SHALL populate Department and Batch details including name and code

### Requirement 8: Course Filtering by Department and Batch

**User Story:** As a Student, I want to see courses relevant to my department and batch, so that I can find and enroll in appropriate courses.

#### Acceptance Criteria

1. THE System SHALL allow filtering the course catalog by Department
2. THE System SHALL allow filtering the course catalog by Batch
3. WHEN a Student views the course catalog, THE System SHALL display courses assigned to their Department
4. WHEN a Student views the course catalog, THE System SHALL display courses assigned to their Batch
5. WHEN a Student views the course catalog, THE System SHALL display courses marked as available to all Departments and Batches
6. THE System SHALL display Department and Batch information on each Course card in the catalog

### Requirement 9: Department and Batch Viewing Permissions

**User Story:** As a user, I want to view department and batch information appropriate to my role, so that I can access relevant organizational data.

#### Acceptance Criteria

1. THE System SHALL allow Admins to view all Departments and Batches
2. THE System SHALL allow Trainers to view all Departments and Batches for course creation purposes
3. THE System SHALL allow Students to view their own assigned Department and Batch
4. THE System SHALL prevent Students from viewing other Students' Department and Batch assignments
5. WHEN a Department is retrieved, THE System SHALL include the count of associated Batches
6. WHEN a Department is retrieved, THE System SHALL include the count of assigned Students
7. WHEN a Batch is retrieved, THE System SHALL include the list of assigned Students with their basic information

### Requirement 10: Data Migration from Hardcoded Batches

**User Story:** As an Admin, I want existing course batch data to be migrated to the new system, so that historical data is preserved and the system can operate seamlessly.

#### Acceptance Criteria

1. THE System SHALL provide a migration script that converts existing string-based batch data to Batch documents
2. WHEN the migration script runs, THE System SHALL create a default Department for unmapped batches
3. WHEN the migration script runs, THE System SHALL create Batch documents for each unique batch string found in existing Courses
4. WHEN the migration script runs, THE System SHALL update all Course documents to reference the new Batch identifiers
5. WHEN the migration script completes, THE System SHALL report the number of Departments created, Batches created, and Courses updated
6. THE System SHALL preserve all existing Course data during migration

### Requirement 11: Department and Batch Status Management

**User Story:** As an Admin, I want to activate or deactivate departments and batches, so that I can control which organizational units are currently in use without deleting historical data.

#### Acceptance Criteria

1. THE System SHALL store an active status flag for each Department
2. THE System SHALL store an active status flag for each Batch
3. THE System SHALL allow Admins to set a Department's active status to true or false
4. THE System SHALL allow Admins to set a Batch's active status to true or false
5. WHEN a Department is deactivated, THE System SHALL continue to display it in historical reports
6. WHEN a Batch is deactivated, THE System SHALL continue to display it in historical reports
7. WHEN filtering Departments or Batches, THE System SHALL allow filtering by active status
8. THE System SHALL default new Departments and Batches to active status

### Requirement 12: Hierarchical Data Retrieval

**User Story:** As an Admin, I want to view departments with their associated batches, so that I can understand the organizational hierarchy.

#### Acceptance Criteria

1. THE System SHALL provide an endpoint to retrieve all Batches belonging to a specific Department
2. WHEN retrieving Batches for a Department, THE System SHALL include Batch name, code, year, student count, and capacity information
3. THE System SHALL provide an endpoint to retrieve all Students assigned to a specific Batch
4. WHEN retrieving Students for a Batch, THE System SHALL include Student name, email, and enrollment status
5. THE System SHALL support nested population of Department → Batch → Student relationships in a single query

### Requirement 13: Coordinator and HOD Assignment

**User Story:** As an Admin, I want to assign coordinators to batches and heads of department to departments, so that there is clear leadership and responsibility.

#### Acceptance Criteria

1. THE System SHALL allow Admins to assign a user as Head of Department for a Department
2. THE System SHALL allow Admins to assign a user as Coordinator for a Batch
3. WHEN a HOD is assigned, THE System SHALL store the user's identifier in the Department
4. WHEN a Coordinator is assigned, THE System SHALL store the user's identifier in the Batch
5. THE System SHALL allow Admins to update or remove HOD assignments
6. THE System SHALL allow Admins to update or remove Coordinator assignments
7. WHEN retrieving Department details, THE System SHALL populate HOD information including name and email
8. WHEN retrieving Batch details, THE System SHALL populate Coordinator information including name and email

### Requirement 14: Validation and Error Handling

**User Story:** As a user, I want clear error messages when operations fail, so that I can understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN a Department name already exists, THE System SHALL return an error message indicating the name must be unique
2. WHEN a Department code already exists, THE System SHALL return an error message indicating the code must be unique
3. WHEN a Batch code already exists, THE System SHALL return an error message indicating the code must be unique
4. WHEN creating a Batch with an invalid Department reference, THE System SHALL return an error message indicating the Department does not exist
5. WHEN assigning a Student to a non-existent Batch, THE System SHALL return an error message indicating the Batch does not exist
6. WHEN assigning a Student to a Batch in a different Department, THE System SHALL return an error message indicating the Department mismatch
7. WHEN required fields are missing, THE System SHALL return an error message listing all missing fields
8. THE System SHALL return HTTP status code 400 for validation errors
9. THE System SHALL return HTTP status code 404 for not found errors
10. THE System SHALL return HTTP status code 403 for permission errors

### Requirement 15: Audit Trail and Timestamps

**User Story:** As an Admin, I want to track when departments and batches were created and modified, so that I can maintain an audit trail.

#### Acceptance Criteria

1. WHEN a Department is created, THE System SHALL record the creation timestamp
2. WHEN a Department is updated, THE System SHALL record the last update timestamp
3. WHEN a Batch is created, THE System SHALL record the creation timestamp
4. WHEN a Batch is updated, THE System SHALL record the last update timestamp
5. THE System SHALL store the identifier of the Admin who created each Department
6. THE System SHALL store the identifier of the Admin who created each Batch
7. WHEN retrieving Department or Batch details, THE System SHALL include creation and update timestamps
8. WHEN retrieving Department or Batch details, THE System SHALL include creator information

## Notes

- The system replaces the current hardcoded batch array `['Batch A - 2026', 'Batch B - 2026', 'Batch C - 2025', 'Batch D - 2025']` with a dynamic database-driven approach
- All existing planning documents (DEPARTMENT_BATCH_MANAGEMENT_PLAN.md, DEPARTMENT_BATCH_FLOW_DIAGRAM.md, DEPARTMENT_BATCH_IMPLEMENTATION_STATUS.md) should be referenced during implementation
- Backend models, controllers, and services have already been created according to the implementation status document
- Frontend services (departmentService.ts and batchService.ts) have been created with TypeScript interfaces
- The implementation will require creating admin UI components for department management, batch management, and student assignment
- Course creation UI (CreateCourse.tsx) will need to be updated to use the new dynamic batch selection
- A migration strategy is required to convert existing string-based batches to the new system

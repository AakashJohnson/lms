/**
 * Comprehensive API Test Script for Department and Batch Management
 * 
 * This script tests all CRUD operations for departments and batches,
 * including validation, error handling, and authorization.
 */

import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';
let authToken = '';
let testDepartmentId = '';
let testBatchId = '';
let testStudentId = '';

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logSection(message) {
  log(`\n${'='.repeat(60)}`, 'bold');
  log(`${message}`, 'bold');
  log(`${'='.repeat(60)}`, 'bold');
}

// Helper function to make authenticated requests
async function apiRequest(method, endpoint, data = null, expectError = false) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    if (expectError) {
      return { 
        success: false, 
        error: error.response?.data || error.message,
        status: error.response?.status
      };
    }
    throw error;
  }
}

// Test 1: Login as Administrator
async function testLogin() {
  logSection('TEST 1: Authentication');
  
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      emailOrMobile: 'admin@ncui.in',
      password: 'Admin@123'
    });

    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      logSuccess('Admin login successful');
      logInfo(`Token: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      logError('Login failed: No token received');
      return false;
    }
  } catch (error) {
    logError(`Login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 2: Create Department
async function testCreateDepartment() {
  logSection('TEST 2: Create Department');

  // Test 2.1: Create valid department
  try {
    const timestamp = Date.now();
    const departmentData = {
      name: `Test Department ${timestamp}`,
      code: `TEST${timestamp.toString().slice(-4)}`,
      description: 'Department of Computer Science and Engineering'
    };

    const result = await apiRequest('POST', '/departments', departmentData);
    
    if (result.success && result.data.data) {
      testDepartmentId = result.data.data._id;
      logSuccess('Department created successfully');
      logInfo(`Department ID: ${testDepartmentId}`);
      logInfo(`Name: ${result.data.data.name}`);
      logInfo(`Code: ${result.data.data.code}`);
    } else {
      logError('Department creation failed');
    }
  } catch (error) {
    logError(`Department creation failed: ${error.response?.data?.message || error.message}`);
  }

  // Test 2.2: Test duplicate name validation
  try {
    const duplicateData = {
      name: 'Computer Science',
      code: 'CS2',
      description: 'Duplicate name test'
    };

    const result = await apiRequest('POST', '/departments', duplicateData, true);
    
    if (!result.success && result.status === 400) {
      logSuccess('Duplicate name validation working correctly');
    } else {
      logWarning('Duplicate name validation may not be working');
    }
  } catch (error) {
    logError(`Duplicate validation test failed: ${error.message}`);
  }

  // Test 2.3: Test duplicate code validation
  try {
    const duplicateData = {
      name: 'Computer Science 2',
      code: 'CS',
      description: 'Duplicate code test'
    };

    const result = await apiRequest('POST', '/departments', duplicateData, true);
    
    if (!result.success && result.status === 400) {
      logSuccess('Duplicate code validation working correctly');
    } else {
      logWarning('Duplicate code validation may not be working');
    }
  } catch (error) {
    logError(`Duplicate code validation test failed: ${error.message}`);
  }

  // Test 2.4: Test missing required fields
  try {
    const invalidData = {
      description: 'Missing name and code'
    };

    const result = await apiRequest('POST', '/departments', invalidData, true);
    
    if (!result.success && result.status === 400) {
      logSuccess('Required field validation working correctly');
    } else {
      logWarning('Required field validation may not be working');
    }
  } catch (error) {
    logError(`Required field validation test failed: ${error.message}`);
  }
}

// Test 3: Get Departments
async function testGetDepartments() {
  logSection('TEST 3: Get Departments');

  // Test 3.1: Get all departments
  try {
    const result = await apiRequest('GET', '/departments');
    
    if (result.success && result.data.data) {
      logSuccess(`Retrieved ${result.data.data.length} department(s)`);
      logInfo(`Pagination: Page ${result.data.pagination?.page || 1} of ${result.data.pagination?.pages || 1}`);
    } else {
      logError('Failed to retrieve departments');
    }
  } catch (error) {
    logError(`Get departments failed: ${error.response?.data?.message || error.message}`);
  }

  // Test 3.2: Search departments
  try {
    const result = await apiRequest('GET', '/departments?search=Computer');
    
    if (result.success && result.data.data) {
      logSuccess(`Search found ${result.data.data.length} department(s)`);
    } else {
      logError('Department search failed');
    }
  } catch (error) {
    logError(`Department search failed: ${error.message}`);
  }

  // Test 3.3: Filter by active status
  try {
    const result = await apiRequest('GET', '/departments?isActive=true');
    
    if (result.success && result.data.data) {
      logSuccess(`Active filter returned ${result.data.data.length} department(s)`);
    } else {
      logError('Active filter failed');
    }
  } catch (error) {
    logError(`Active filter failed: ${error.message}`);
  }
}

// Test 4: Get Single Department
async function testGetDepartment() {
  logSection('TEST 4: Get Single Department');

  try {
    const result = await apiRequest('GET', `/departments/${testDepartmentId}`);
    
    if (result.success && result.data.data) {
      logSuccess('Retrieved department details');
      logInfo(`Name: ${result.data.data.name}`);
      logInfo(`Code: ${result.data.data.code}`);
      logInfo(`Batch Count: ${result.data.data.batchCount || 0}`);
    } else {
      logError('Failed to retrieve department details');
    }
  } catch (error) {
    logError(`Get department failed: ${error.response?.data?.message || error.message}`);
  }

  // Test invalid ID
  try {
    const result = await apiRequest('GET', '/departments/invalid-id', null, true);
    
    if (!result.success) {
      logSuccess('Invalid ID handling working correctly');
    } else {
      logWarning('Invalid ID handling may not be working');
    }
  } catch (error) {
    logError(`Invalid ID test failed: ${error.message}`);
  }
}

// Test 5: Update Department
async function testUpdateDepartment() {
  logSection('TEST 5: Update Department');

  try {
    const updateData = {
      description: 'Updated: Department of Computer Science and Engineering with AI focus'
    };

    const result = await apiRequest('PUT', `/departments/${testDepartmentId}`, updateData);
    
    if (result.success && result.data.data) {
      logSuccess('Department updated successfully');
      logInfo(`New description: ${result.data.data.description}`);
    } else {
      logError('Department update failed');
    }
  } catch (error) {
    logError(`Department update failed: ${error.response?.data?.message || error.message}`);
  }
}

// Test 6: Create Batch
async function testCreateBatch() {
  logSection('TEST 6: Create Batch');

  // Test 6.1: Create valid batch
  try {
    const timestamp = Date.now();
    const batchData = {
      name: `Test Batch ${timestamp}`,
      code: `TB-${timestamp.toString().slice(-6)}`,
      department: testDepartmentId,
      year: 2026,
      maxStudents: 50,
      startDate: '2026-01-01',
      endDate: '2026-12-31'
    };

    const result = await apiRequest('POST', '/batches', batchData);
    
    if (result.success && result.data.data) {
      testBatchId = result.data.data._id;
      logSuccess('Batch created successfully');
      logInfo(`Batch ID: ${testBatchId}`);
      logInfo(`Name: ${result.data.data.name}`);
      logInfo(`Code: ${result.data.data.code}`);
      logInfo(`Max Students: ${result.data.data.maxStudents}`);
    } else {
      logError('Batch creation failed');
    }
  } catch (error) {
    logError(`Batch creation failed: ${error.response?.data?.message || error.message}`);
  }

  // Test 6.2: Test invalid department reference
  try {
    const invalidData = {
      name: 'Invalid Batch',
      code: 'INV-2026',
      department: '507f1f77bcf86cd799439011', // Non-existent ID
      year: 2026
    };

    const result = await apiRequest('POST', '/batches', invalidData, true);
    
    if (!result.success && result.status === 404) {
      logSuccess('Invalid department reference validation working');
    } else {
      logWarning('Invalid department reference validation may not be working');
    }
  } catch (error) {
    logError(`Invalid department test failed: ${error.message}`);
  }

  // Test 6.3: Test year range validation
  try {
    const invalidData = {
      name: 'Invalid Year Batch',
      code: 'CS-1999-A',
      department: testDepartmentId,
      year: 1999 // Below minimum
    };

    const result = await apiRequest('POST', '/batches', invalidData, true);
    
    if (!result.success && result.status === 400) {
      logSuccess('Year range validation working correctly');
    } else {
      logWarning('Year range validation may not be working');
    }
  } catch (error) {
    logError(`Year range validation test failed: ${error.message}`);
  }
}

// Test 7: Get Batches
async function testGetBatches() {
  logSection('TEST 7: Get Batches');

  // Test 7.1: Get all batches
  try {
    const result = await apiRequest('GET', '/batches');
    
    if (result.success && result.data.data) {
      logSuccess(`Retrieved ${result.data.data.length} batch(es)`);
    } else {
      logError('Failed to retrieve batches');
    }
  } catch (error) {
    logError(`Get batches failed: ${error.response?.data?.message || error.message}`);
  }

  // Test 7.2: Filter by department
  try {
    const result = await apiRequest('GET', `/batches?department=${testDepartmentId}`);
    
    if (result.success && result.data.data) {
      logSuccess(`Department filter returned ${result.data.data.length} batch(es)`);
    } else {
      logError('Department filter failed');
    }
  } catch (error) {
    logError(`Department filter failed: ${error.message}`);
  }

  // Test 7.3: Filter by year
  try {
    const result = await apiRequest('GET', '/batches?year=2026');
    
    if (result.success && result.data.data) {
      logSuccess(`Year filter returned ${result.data.data.length} batch(es)`);
    } else {
      logError('Year filter failed');
    }
  } catch (error) {
    logError(`Year filter failed: ${error.message}`);
  }
}

// Test 8: Get Single Batch
async function testGetBatch() {
  logSection('TEST 8: Get Single Batch');

  try {
    const result = await apiRequest('GET', `/batches/${testBatchId}`);
    
    if (result.success && result.data.data) {
      logSuccess('Retrieved batch details');
      logInfo(`Name: ${result.data.data.name}`);
      logInfo(`Code: ${result.data.data.code}`);
      logInfo(`Department: ${result.data.data.department?.name || 'N/A'}`);
      logInfo(`Current Students: ${result.data.data.currentStudents}`);
      logInfo(`Max Students: ${result.data.data.maxStudents}`);
      logInfo(`Available Seats: ${result.data.data.availableSeats}`);
      logInfo(`Is Full: ${result.data.data.isFull}`);
    } else {
      logError('Failed to retrieve batch details');
    }
  } catch (error) {
    logError(`Get batch failed: ${error.response?.data?.message || error.message}`);
  }
}

// Test 9: Update Batch
async function testUpdateBatch() {
  logSection('TEST 9: Update Batch');

  try {
    const updateData = {
      maxStudents: 60
    };

    const result = await apiRequest('PUT', `/batches/${testBatchId}`, updateData);
    
    if (result.success && result.data.data) {
      logSuccess('Batch updated successfully');
      logInfo(`New max students: ${result.data.data.maxStudents}`);
    } else {
      logError('Batch update failed');
    }
  } catch (error) {
    logError(`Batch update failed: ${error.response?.data?.message || error.message}`);
  }
}

// Test 10: Get Department Batches
async function testGetDepartmentBatches() {
  logSection('TEST 10: Get Department Batches');

  try {
    const result = await apiRequest('GET', `/departments/${testDepartmentId}/batches`);
    
    if (result.success && result.data.data) {
      logSuccess(`Retrieved ${result.data.data.length} batch(es) for department`);
    } else {
      logError('Failed to retrieve department batches');
    }
  } catch (error) {
    logError(`Get department batches failed: ${error.response?.data?.message || error.message}`);
  }
}

// Test 11: Student Assignment (requires a student user)
async function testStudentAssignment() {
  logSection('TEST 11: Student Assignment');

  // First, try to get a student user
  try {
    const usersResult = await apiRequest('GET', '/users?role=participant&limit=1');
    
    if (usersResult.success && usersResult.data.data && usersResult.data.data.length > 0) {
      testStudentId = usersResult.data.data[0]._id;
      logInfo(`Found student: ${usersResult.data.data[0].email}`);

      // Test assignment
      const assignData = {
        studentIds: [testStudentId]
      };

      const result = await apiRequest('POST', `/batches/${testBatchId}/assign`, assignData);
      
      if (result.success) {
        logSuccess('Student assigned to batch successfully');
        logInfo(`Assigned count: ${result.data.data?.assignedCount || 1}`);
      } else {
        logError('Student assignment failed');
      }
    } else {
      logWarning('No student users found to test assignment');
    }
  } catch (error) {
    logError(`Student assignment test failed: ${error.response?.data?.message || error.message}`);
  }
}

// Test 12: Get Batch Students
async function testGetBatchStudents() {
  logSection('TEST 12: Get Batch Students');

  try {
    const result = await apiRequest('GET', `/batches/${testBatchId}/students`);
    
    if (result.success && result.data.data) {
      logSuccess(`Retrieved ${result.data.data.length} student(s) in batch`);
      if (result.data.data.length > 0) {
        logInfo(`First student: ${result.data.data[0].firstName} ${result.data.data[0].lastName}`);
      }
    } else {
      logError('Failed to retrieve batch students');
    }
  } catch (error) {
    logError(`Get batch students failed: ${error.response?.data?.message || error.message}`);
  }
}

// Test 13: Remove Student from Batch
async function testRemoveStudent() {
  logSection('TEST 13: Remove Student from Batch');

  if (!testStudentId) {
    logWarning('No student ID available, skipping remove test');
    return;
  }

  try {
    const removeData = {
      studentIds: [testStudentId]
    };

    const result = await apiRequest('POST', `/batches/${testBatchId}/remove`, removeData);
    
    if (result.success) {
      logSuccess('Student removed from batch successfully');
    } else {
      logError('Student removal failed');
    }
  } catch (error) {
    logError(`Student removal failed: ${error.response?.data?.message || error.message}`);
  }
}

// Test 14: Delete Batch (Safety Check)
async function testDeleteBatch() {
  logSection('TEST 14: Delete Batch');

  try {
    const result = await apiRequest('DELETE', `/batches/${testBatchId}`);
    
    if (result.success) {
      logSuccess('Batch deleted successfully');
    } else {
      logError('Batch deletion failed');
    }
  } catch (error) {
    logError(`Batch deletion failed: ${error.response?.data?.message || error.message}`);
  }
}

// Test 15: Delete Department (Safety Check)
async function testDeleteDepartment() {
  logSection('TEST 15: Delete Department');

  try {
    const result = await apiRequest('DELETE', `/departments/${testDepartmentId}`);
    
    if (result.success) {
      logSuccess('Department deleted successfully');
    } else {
      logError('Department deletion failed (may have batches)');
    }
  } catch (error) {
    // Expected to fail if batches exist
    if (error.response?.status === 400) {
      logSuccess('Department deletion safety check working (has batches)');
    } else {
      logError(`Department deletion failed: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Test 16: Authorization Tests
async function testAuthorization() {
  logSection('TEST 16: Authorization Tests');

  // Save admin token
  const adminToken = authToken;

  // Try to login as student
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      emailOrMobile: 'student@ncui.in',
      password: 'Student@123'
    });

    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      logInfo('Logged in as student');

      // Try to create department (should fail)
      const departmentData = {
        name: 'Unauthorized Department',
        code: 'UNAUTH',
        description: 'Should not be created'
      };

      const result = await apiRequest('POST', '/departments', departmentData, true);
      
      if (!result.success && result.status === 403) {
        logSuccess('Authorization check working: Student cannot create department');
      } else {
        logWarning('Authorization may not be working correctly');
      }

      // Restore admin token
      authToken = adminToken;
    }
  } catch (error) {
    logError(`Authorization test failed: ${error.message}`);
    authToken = adminToken; // Restore admin token
  }
}

// Main test runner
async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'bold');
  log('║  Department & Batch Management API Test Suite             ║', 'bold');
  log('╚════════════════════════════════════════════════════════════╝', 'bold');

  const startTime = Date.now();

  // Run all tests in sequence
  const loginSuccess = await testLogin();
  
  if (!loginSuccess) {
    logError('Cannot proceed without authentication');
    return;
  }

  await testCreateDepartment();
  await testGetDepartments();
  await testGetDepartment();
  await testUpdateDepartment();
  await testCreateBatch();
  await testGetBatches();
  await testGetBatch();
  await testUpdateBatch();
  await testGetDepartmentBatches();
  await testStudentAssignment();
  await testGetBatchStudents();
  await testRemoveStudent();
  await testDeleteBatch();
  await testDeleteDepartment();
  await testAuthorization();

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  logSection('TEST SUMMARY');
  logSuccess(`All tests completed in ${duration} seconds`);
  log('\n✨ Test suite finished!\n', 'green');
}

// Run the tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});

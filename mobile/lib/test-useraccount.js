 // test-useraccount.js

process.env.EXPO_PUBLIC_FIREBASE_API_KEY = "test-api-key";
process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = "test-auth-domain";
process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = "test-project-id";
process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = "test-storage-bucket";
process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = "test-messaging-sender-id";
process.env.EXPO_PUBLIC_FIREBASE_APP_ID = "test-app-id";

// Import the module (you might need to adjust the path)
const userAccountModule = require('./useraccount.ts'); 
const { UserAccountService, UserAccountNotFoundError, PTLicenseValidationError } = userAccountModule;

// Test data
const TEST_PHYSIO = {
  name: "Test Physio",
  email: `test.physio.${Date.now()}@example.com`,
  password: "password123",
  licenseNumber: "ON-123456", // This should exist in your ptLicenses collection
  birthday: "1980-01-15"
};

const TEST_PATIENT = {
  name: "Test Patient",
  email: `test.patient.${Date.now()}@example.com`,
  password: "password123",
  inviteCode: "TESTINVITE123", // This should exist in your inviteCodes collection
  birthday: "1990-05-20"
};

async function runTests() {
  console.log("=== UserAccountService Test Suite ===\n");
  
  const service = new UserAccountService();
  let physio = null;
  let patient = null;
  
  try {
    // Test 1: Initialize System
    console.log("Test 1: System Initialization");
    console.log("------------------------------");
    try {
      await service.initializeSystem();
      console.log("✓ System initialized successfully\n");
    } catch (error) {
      console.log(`✗ System initialization failed: ${error.message}\n`);
    }
    
    // Test 2: License Validation
    console.log("Test 2: License Validation");
    console.log("--------------------------");
    try {
      const licenseData = await service.validateLicense("ON-123456");
      console.log(`✓ License validated: ${licenseData.licenseNumber}`);
      console.log(`  Province: ${licenseData.province}`);
      console.log(`  Status: ${licenseData.status}\n`);
    } catch (error) {
      console.log(`✗ License validation failed: ${error.message}\n`);
    }
    
    // Test 3: Check if license is registered
    console.log("Test 3: Check License Registration");
    console.log("-----------------------------------");
    try {
      const isRegistered = await service.isLicenseAlreadyRegistered("ON-123456");
      console.log(`✓ License is ${isRegistered ? 'already registered' : 'available for registration'}\n`);
    } catch (error) {
      console.log(`✗ License check failed: ${error.message}\n`);
    }
    
    // Test 4: Register Physiotherapist
    console.log("Test 4: Register Physiotherapist");
    console.log("--------------------------------");
    try {
      physio = await service.registerPhysio(TEST_PHYSIO);
      console.log(`✓ Physio registered successfully:`);
      console.log(`  Name: ${physio.name}`);
      console.log(`  Email: ${physio.email}`);
      console.log(`  UID: ${physio.uid}`);
      console.log(`  acc_id: ${physio.acc_id}`);
      console.log(`  License: ${physio.licenseNumber}\n`);
    } catch (error) {
      console.log(`✗ Physio registration failed: ${error.message}\n`);
      // Skip dependent tests if physio registration fails
      console.log("Skipping dependent tests...\n");
      return;
    }
    
    // Test 5: Login Physiotherapist
    console.log("Test 5: Login Physiotherapist");
    console.log("-----------------------------");
    try {
      const loggedInPhysio = await service.login(TEST_PHYSIO.email, TEST_PHYSIO.password);
      console.log(`✓ Physio login successful:`);
      console.log(`  Name: ${loggedInPhysio.name}`);
      console.log(`  Email: ${loggedInPhysio.email}\n`);
    } catch (error) {
      console.log(`✗ Physio login failed: ${error.message}\n`);
    }
    
    // Test 6: Get User by Email
    console.log("Test 6: Get User by Email");
    console.log("--------------------------");
    try {
      const foundPhysio = await service.getUserByEmail(TEST_PHYSIO.email);
      if (foundPhysio) {
        console.log(`✓ User found by email:`);
        console.log(`  Name: ${foundPhysio.name}`);
        console.log(`  Role: ${foundPhysio.role}\n`);
      } else {
        console.log("✗ User not found by email\n");
      }
    } catch (error) {
      console.log(`✗ Get user by email failed: ${error.message}\n`);
    }
    
    // Test 7: Get User by acc_id
    console.log("Test 7: Get User by acc_id");
    console.log("---------------------------");
    try {
      const foundPhysioById = await service.getUserByAccId(physio.acc_id);
      if (foundPhysioById) {
        console.log(`✓ User found by acc_id ${physio.acc_id}:`);
        console.log(`  Name: ${foundPhysioById.name}`);
        console.log(`  Email: ${foundPhysioById.email}\n`);
      } else {
        console.log(`✗ User not found by acc_id ${physio.acc_id}\n`);
      }
    } catch (error) {
      console.log(`✗ Get user by acc_id failed: ${error.message}\n`);
    }
    
    // Test 8: Update User
    console.log("Test 8: Update User");
    console.log("--------------------");
    try {
      const updatedPhysio = {
        ...physio,
        name: "Updated Test Physio",
        birthday: "1980-01-16"
      };
      
      const updateResult = await service.updateUser(updatedPhysio);
      if (updateResult) {
        console.log("✓ User updated successfully");
        
        // Verify the update
        const verifiedPhysio = await service.getUserByAccId(physio.acc_id);
        console.log(`  New name: ${verifiedPhysio.name}`);
        console.log(`  New birthday: ${verifiedPhysio.birthday}\n`);
      } else {
        console.log("✗ User update failed\n");
      }
    } catch (error) {
      console.log(`✗ Update user failed: ${error.message}\n`);
    }
    
    // Test 9: Check if email exists
    console.log("Test 9: Check Email Exists");
    console.log("---------------------------");
    try {
      const emailExists = await service.emailExists(TEST_PHYSIO.email);
      console.log(`✓ Email ${TEST_PHYSIO.email} ${emailExists ? 'exists' : 'does not exist'}\n`);
    } catch (error) {
      console.log(`✗ Email check failed: ${error.message}\n`);
    }
    
    // Test 10: Get Patients by Physio (should be empty initially)
    console.log("Test 10: Get Patients by Physio");
    console.log("--------------------------------");
    try {
      const patients = await service.getPatientsByPhysio(physio.uid);
      console.log(`✓ Found ${patients.length} patients for physio ${physio.name}\n`);
    } catch (error) {
      console.log(`✗ Get patients by physio failed: ${error.message}\n`);
    }
    
    // Test 11: Register Patient (requires valid invite code)
    console.log("Test 11: Register Patient");
    console.log("--------------------------");
    console.log("Note: This test requires a valid invite code in the inviteCodes collection");
    console.log(`Using invite code: ${TEST_PATIENT.inviteCode}\n`);
    
    try {
      patient = await service.registerPatient(TEST_PATIENT);
      console.log(`✓ Patient registered successfully:`);
      console.log(`  Name: ${patient.name}`);
      console.log(`  Email: ${patient.email}`);
      console.log(`  UID: ${patient.uid}`);
      console.log(`  acc_id: ${patient.acc_id}`);
      console.log(`  Physio ID: ${patient.physioId}\n`);
    } catch (error) {
      console.log(`✗ Patient registration failed: ${error.message}\n`);
      console.log("Skipping patient-related tests...\n");
    }
    
    if (patient) {
      // Test 12: Login Patient
      console.log("Test 12: Login Patient");
      console.log("-----------------------");
      try {
        const loggedInPatient = await service.login(TEST_PATIENT.email, TEST_PATIENT.password);
        console.log(`✓ Patient login successful:`);
        console.log(`  Name: ${loggedInPatient.name}`);
        console.log(`  Email: ${loggedInPatient.email}\n`);
      } catch (error) {
        console.log(`✗ Patient login failed: ${error.message}\n`);
      }
      
      // Test 13: Validate Credentials
      console.log("Test 13: Validate Credentials");
      console.log("------------------------------");
      try {
        const valid = await service.validateCredentials(TEST_PATIENT.email, TEST_PATIENT.password);
        console.log(`✓ Credentials are ${valid ? 'valid' : 'invalid'}\n`);
      } catch (error) {
        console.log(`✗ Validate credentials failed: ${error.message}\n`);
      }
      
      // Test 14: Username/Password Match
      console.log("Test 14: Username/Password Match");
      console.log("---------------------------------");
      try {
        const match = await service.usernamePwMatch(TEST_PATIENT.email, TEST_PATIENT.password);
        console.log(`✓ Username/password ${match ? 'match' : 'do not match'}\n`);
      } catch (error) {
        console.log(`✗ Username/password match failed: ${error.message}\n`);
      }
      
      // Test 15: Authenticate User
      console.log("Test 15: Authenticate User");
      console.log("---------------------------");
      try {
        const authUser = await service.authenticateUser(TEST_PATIENT.email, TEST_PATIENT.password);
        if (authUser) {
          console.log(`✓ User authenticated:`);
          console.log(`  Name: ${authUser.name}`);
          console.log(`  Email: ${authUser.email}\n`);
        } else {
          console.log("✗ Authentication failed\n");
        }
      } catch (error) {
        console.log(`✗ Authenticate user failed: ${error.message}\n`);
      }
      
      // Test 16: Get updated Patients by Physio
      console.log("Test 16: Get Patients by Physio (after registration)");
      console.log("-----------------------------------------------------");
      try {
        const patients = await service.getPatientsByPhysio(physio.uid);
        console.log(`✓ Found ${patients.length} patients for physio ${physio.name}`);
        patients.forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.name} (${p.email})`);
        });
        console.log();
      } catch (error) {
        console.log(`✗ Get patients by physio failed: ${error.message}\n`);
      }
      
      // Test 17: PT Account Delete (Physio deleting their patient)
      console.log("Test 17: PT Account Delete");
      console.log("---------------------------");
      try {
        await service.PTaccountDelete(TEST_PHYSIO.email, TEST_PATIENT.name, TEST_PATIENT.email);
        console.log(`✓ Physio successfully deleted patient\n`);
        
        // Verify patient was deleted
        const deletedPatient = await service.getUserByEmail(TEST_PATIENT.email);
        if (deletedPatient && deletedPatient.deleted) {
          console.log(`✓ Patient marked as deleted in database\n`);
        } else {
          console.log(`✗ Patient not properly marked as deleted\n`);
        }
      } catch (error) {
        console.log(`✗ PT account delete failed: ${error.message}\n`);
      }
    }
    
    // Test 18: Search Users by Name
    console.log("Test 18: Search Users by Name");
    console.log("------------------------------");
    try {
      const users = await service.getUsersByName("Test");
      console.log(`✓ Found ${users.length} users with 'Test' in name`);
      users.forEach((user, i) => {
        console.log(`  ${i + 1}. ${user.name} (${user.email}) - ${user.role}`);
      });
      console.log();
    } catch (error) {
      console.log(`✗ Search users by name failed: ${error.message}\n`);
    }
    
    // Test 19: Get All Users
    console.log("Test 19: Get All Users");
    console.log("-----------------------");
    try {
      const allUsers = await service.getAllUsers();
      console.log(`✓ Found ${allUsers.length} total users in system\n`);
    } catch (error) {
      console.log(`✗ Get all users failed: ${error.message}\n`);
    }
    
    // Test 20: Get User Database Info
    console.log("Test 20: Get User Database Info");
    console.log("--------------------------------");
    try {
      const userInfo = await service.getUserdbInfo("Test Physio");
      console.log(`✓ Found user info for 'Test Physio':`);
      console.log(`  Physios: ${userInfo.physios.length}`);
      console.log(`  Patients: ${userInfo.patients.length}\n`);
    } catch (error) {
      console.log(`✗ Get user database info failed: ${error.message}\n`);
    }
    
    // Test 21: Error Handling Tests
    console.log("Test 21: Error Handling");
    console.log("------------------------");
    
    // Test invalid login
    console.log("Testing invalid login...");
    try {
      await service.login("nonexistent@example.com", "wrongpassword");
      console.log("✗ Should have thrown an error for invalid login\n");
    } catch (error) {
      console.log(`✓ Correctly threw error: ${error.name} - ${error.message}\n`);
    }
    
    // Test duplicate registration
    console.log("Testing duplicate email registration...");
    try {
      await service.registerPhysio({
        ...TEST_PHYSIO,
        email: TEST_PHYSIO.email, // Same email
        licenseNumber: "ON-654321" // Different license
      });
      console.log("✗ Should have thrown an error for duplicate email\n");
    } catch (error) {
      console.log(`✓ Correctly threw error: ${error.message}\n`);
    }
    
    // Test PT account delete with wrong physio
    console.log("Testing PT account delete with unauthorized physio...");
    if (patient) {
      try {
        await service.PTaccountDelete("wrong.physio@example.com", TEST_PATIENT.name, TEST_PATIENT.email);
        console.log("✗ Should have thrown an error for unauthorized delete\n");
      } catch (error) {
        console.log(`✓ Correctly threw error: ${error.message}\n`);
      }
    }
    
    // Cleanup Test 22: Delete test users
    console.log("Test 22: Cleanup - Delete Test Users");
    console.log("-------------------------------------");
    
    // Delete physio if created
    if (physio) {
      try {
        const deleted = await service.deleteUserByAccId(physio.acc_id);
        if (deleted) {
          console.log(`✓ Test physio deleted successfully\n`);
        } else {
          console.log(`✗ Failed to delete test physio\n`);
        }
      } catch (error) {
        console.log(`✗ Delete physio failed: ${error.message}\n`);
      }
    }
    
    // Delete patient if created and not already deleted
    if (patient) {
      try {
        const patientCheck = await service.getUserByEmail(TEST_PATIENT.email);
        if (patientCheck && !patientCheck.deleted) {
          const deleted = await service.deleteUserByAccId(patient.acc_id);
          if (deleted) {
            console.log(`✓ Test patient deleted successfully\n`);
          } else {
            console.log(`✗ Failed to delete test patient\n`);
          }
        } else {
          console.log(`✓ Test patient already deleted\n`);
        }
      } catch (error) {
        console.log(`✗ Delete patient failed: ${error.message}\n`);
      }
    }
    
    console.log("=== Test Suite Complete ===");
    
  } catch (error) {
    console.error(`Unhandled error in test suite: ${error.message}`);
    console.error(error.stack);
  }
}

// Run the tests
runTests().catch(console.error);
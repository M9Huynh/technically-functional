"""
Unit Tests for Account Creation Module - MIS Section 5.1

Tests all functions, exceptions, and edge cases as specified in the MIS.
Uses Python's built-in unittest module (no external dependencies).
"""
import unittest
import sys
import os

# Add the current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from account_creation import (
    AccountCreationModule,
    UserAccountP,
    UserAccountPT,
    FieldEmptyError,
    UserNotFoundError,
    InputFormatInvalidError,
    AccountAlreadyExistsError,
    IncorrectCredsError,
    InviteCodeExpiredError,
)


class TestAccExists(unittest.TestCase):
    """Tests for the acc_exists() exported access program."""

    def setUp(self):
        """Create a fresh AccountCreationModule instance for each test."""
        self.module = AccountCreationModule()

    def test_returns_false_for_new_user(self):
        """acc_exists returns False when no matching account exists."""
        self.assertFalse(self.module.acc_exists("John Doe", "19900101"))

    def test_returns_true_for_existing_user(self):
        """acc_exists returns True when account with name+birthday exists."""
        self.module.account_create("John Doe", "P", "19900101", "INV001", "john@test.com", "password123")
        self.assertTrue(self.module.acc_exists("John Doe", "19900101"))

    def test_returns_false_for_same_name_different_birthday(self):
        """acc_exists returns False when name matches but birthday differs."""
        self.module.account_create("John Doe", "P", "19900101", "INV001", "john@test.com", "password123")
        self.assertFalse(self.module.acc_exists("John Doe", "19900102"))

    def test_returns_false_for_different_name_same_birthday(self):
        """acc_exists returns False when birthday matches but name differs."""
        self.module.account_create("John Doe", "P", "19900101", "INV001", "john@test.com", "password123")
        self.assertFalse(self.module.acc_exists("Jane Doe", "19900101"))

    def test_raises_field_empty_error_on_empty_name(self):
        """acc_exists raises FieldEmptyError when name is empty."""
        with self.assertRaises(FieldEmptyError):
            self.module.acc_exists("", "19900101")

    def test_raises_field_empty_error_on_whitespace_name(self):
        """acc_exists raises FieldEmptyError when name is only whitespace."""
        with self.assertRaises(FieldEmptyError):
            self.module.acc_exists("   ", "19900101")

    def test_raises_field_empty_error_on_empty_birthday(self):
        """acc_exists raises FieldEmptyError when birthday is empty."""
        with self.assertRaises(FieldEmptyError):
            self.module.acc_exists("John Doe", "")

    def test_raises_field_empty_error_on_whitespace_birthday(self):
        """acc_exists raises FieldEmptyError when birthday is only whitespace."""
        with self.assertRaises(FieldEmptyError):
            self.module.acc_exists("John Doe", "   ")


class TestAccountCreatePatient(unittest.TestCase):
    """Tests for account_create() with patient role."""

    def setUp(self):
        self.module = AccountCreationModule()

    def test_creates_patient_account_successfully(self):
        """account_create successfully creates a patient account."""
        account = self.module.account_create(
            name="Jane Doe",
            role="P",
            birthday="19950515",
            credential="INV001",
            email="jane@test.com",
            password="pass123"
        )
        self.assertIsInstance(account, UserAccountP)
        self.assertEqual(account.role, 'P')
        self.assertEqual(account.name, "Jane Doe")
        self.assertEqual(account.birthday, "19950515")
        self.assertEqual(account.email, "jane@test.com")
        self.assertIsNotNone(account.acc_id)

    def test_patient_stored_in_database(self):
        """Created patient account is stored in database."""
        self.module.account_create(
            name="Jane Doe",
            role="P",
            birthday="19950515",
            credential="INV001",
            email="jane@test.com",
            password="pass123"
        )
        self.assertTrue(self.module.acc_exists("Jane Doe", "19950515"))

    def test_email_normalized_to_lowercase(self):
        """Email is normalized to lowercase."""
        account = self.module.account_create(
            name="Jane Doe",
            role="P",
            birthday="19950515",
            credential="INV001",
            email="Jane.Doe@TEST.com",
            password="pass123"
        )
        self.assertEqual(account.email, "jane.doe@test.com")

    def test_invite_code_marked_as_used(self):
        """Invite code is marked as used after account creation."""
        self.module.account_create(
            name="Jane Doe",
            role="P",
            birthday="19950515",
            credential="INV001",
            email="jane@test.com",
            password="pass123"
        )
        with self.assertRaises(InviteCodeExpiredError):
            self.module.account_create(
                name="Bob Smith",
                role="P",
                birthday="19850101",
                credential="INV001",
                email="bob@test.com",
                password="pass123"
            )


class TestAccountCreatePhysio(unittest.TestCase):
    """Tests for account_create() with physiotherapist role."""

    def setUp(self):
        self.module = AccountCreationModule()

    def test_creates_physio_account_successfully(self):
        """account_create successfully creates a physiotherapist account."""
        account = self.module.account_create(
            name="Dr. Smith",
            role="PT",
            birthday="19800101",
            credential="ON-123456",
            email="dr@clinic.com",
            password="secure123"
        )
        self.assertIsInstance(account, UserAccountPT)
        self.assertEqual(account.role, 'PT')
        self.assertEqual(account.name, "Dr. Smith")
        self.assertEqual(account.birthday, "19800101")
        self.assertEqual(account.email, "dr@clinic.com")

    def test_physio_stored_in_database(self):
        """Created physiotherapist account is stored in database."""
        self.module.account_create(
            name="Dr. Smith",
            role="PT",
            birthday="19800101",
            credential="ON-123456",
            email="dr@clinic.com",
            password="secure123"
        )
        self.assertTrue(self.module.acc_exists("Dr. Smith", "19800101"))

    def test_license_can_be_reused(self):
        """License number can be used by multiple physiotherapists."""
        self.module.account_create(
            name="Dr. Smith",
            role="PT",
            birthday="19800101",
            credential="ON-123456",
            email="dr@clinic.com",
            password="secure123"
        )
        account2 = self.module.account_create(
            name="Dr. Jones",
            role="PT",
            birthday="19750515",
            credential="ON-123456",
            email="jones@clinic.com",
            password="secure456"
        )
        self.assertEqual(account2.name, "Dr. Jones")


class TestAccountCreateValidation(unittest.TestCase):
    """Tests for account_create() validation and error handling."""

    def setUp(self):
        self.module = AccountCreationModule()

    def test_raises_on_empty_name(self):
        """account_create raises FieldEmptyError on empty name."""
        with self.assertRaises(FieldEmptyError):
            self.module.account_create("", "P", "19900101", "INV001", "test@test.com", "pass123")

    def test_raises_on_empty_birthday(self):
        """account_create raises FieldEmptyError on empty birthday."""
        with self.assertRaises(FieldEmptyError):
            self.module.account_create("John", "P", "", "INV001", "test@test.com", "pass123")

    def test_raises_on_empty_credential(self):
        """account_create raises FieldEmptyError on empty credential."""
        with self.assertRaises(FieldEmptyError):
            self.module.account_create("John", "P", "19900101", "", "test@test.com", "pass123")

    def test_raises_on_empty_email(self):
        """account_create raises FieldEmptyError on empty email."""
        with self.assertRaises(FieldEmptyError):
            self.module.account_create("John", "P", "19900101", "INV001", "", "pass123")

    def test_raises_on_empty_password(self):
        """account_create raises FieldEmptyError on empty password."""
        with self.assertRaises(FieldEmptyError):
            self.module.account_create("John", "P", "19900101", "INV001", "test@test.com", "")

    def test_raises_on_invalid_role(self):
        """account_create raises InputFormatInvalidError on invalid role."""
        with self.assertRaises(InputFormatInvalidError):
            self.module.account_create("John", "X", "19900101", "INV001", "test@test.com", "pass123")

    def test_raises_on_invalid_email_format(self):
        """account_create raises InputFormatInvalidError on invalid email."""
        with self.assertRaises(InputFormatInvalidError):
            self.module.account_create("John", "P", "19900101", "INV001", "not-an-email", "pass123")

    def test_raises_on_short_password(self):
        """account_create raises InputFormatInvalidError on password < 6 chars."""
        with self.assertRaises(InputFormatInvalidError):
            self.module.account_create("John", "P", "19900101", "INV001", "test@test.com", "12345")

    def test_raises_on_invalid_birthday_format(self):
        """account_create raises InputFormatInvalidError on invalid birthday format."""
        with self.assertRaises(InputFormatInvalidError):
            self.module.account_create("John", "P", "1990-01-01", "INV001", "test@test.com", "pass123")

    def test_raises_on_duplicate_account(self):
        """account_create raises AccountAlreadyExistsError on duplicate."""
        self.module.account_create("John Doe", "P", "19900101", "INV001", "john@test.com", "password123")
        with self.assertRaises(AccountAlreadyExistsError):
            self.module.account_create("John Doe", "P", "19900101", "INV002", "john2@test.com", "password456")

    def test_raises_on_invalid_license_format(self):
        """account_create raises InputFormatInvalidError on invalid license format."""
        with self.assertRaises(InputFormatInvalidError):
            self.module.account_create("Dr. Bad", "PT", "19800101", "INVALID", "bad@clinic.com", "pass123")

    def test_raises_on_unknown_license(self):
        """account_create raises IncorrectCredsError on unknown license."""
        with self.assertRaises(IncorrectCredsError):
            self.module.account_create("Dr. Bad", "PT", "19800101", "XX-000000", "bad@clinic.com", "pass123")

    def test_raises_on_invalid_invite_code(self):
        """account_create raises InviteCodeExpiredError on invalid invite code."""
        with self.assertRaises(InviteCodeExpiredError):
            self.module.account_create("John", "P", "19900101", "INVALID", "test@test.com", "pass123")


class TestSetUserInfo(unittest.TestCase):
    """Tests for set_user_info() local function."""

    def setUp(self):
        self.module = AccountCreationModule()

    def test_stores_user_account(self):
        """set_user_info stores a user account in database."""
        account = UserAccountP(
            acc_id="test-123",
            name="Test User",
            role="P",
            birthday="19900101",
            email="test@test.com",
            password="pass123"
        )
        self.module.set_user_info(account)
        self.assertEqual(len(self.module.db._users), 1)
        self.assertEqual(self.module.db._users[0].acc_id, "test-123")

    def test_raises_on_duplicate_acc_id(self):
        """set_user_info raises AccountAlreadyExistsError on duplicate ID."""
        account1 = UserAccountP(
            acc_id="test-123",
            name="User 1",
            role="P",
            birthday="19900101",
            email="user1@test.com",
            password="pass123"
        )
        account2 = UserAccountP(
            acc_id="test-123",
            name="User 2",
            role="P",
            birthday="19900102",
            email="user2@test.com",
            password="pass456"
        )
        self.module.set_user_info(account1)
        with self.assertRaises(AccountAlreadyExistsError):
            self.module.set_user_info(account2)


class TestStateInvariants(unittest.TestCase):
    """Tests for MIS state invariants."""

    def setUp(self):
        self.module = AccountCreationModule()

    def test_no_account_no_acc_id(self):
        """If no account, no acc_id exists."""
        self.assertEqual(len(self.module.db._users), 0)

    def test_account_exists_all_fields_non_empty(self):
        """If account exists, all fields are non-empty."""
        account = self.module.account_create(
            name="John Doe",
            role="P",
            birthday="19900101",
            credential="INV001",
            email="john@test.com",
            password="pass123"
        )
        self.assertNotEqual(account.acc_id, "")
        self.assertNotEqual(account.name, "")
        self.assertNotEqual(account.role, "")
        self.assertNotEqual(account.email, "")
        self.assertNotEqual(account.birthday, "")


class TestIntegration(unittest.TestCase):
    """Integration tests for complete workflows."""

    def setUp(self):
        self.module = AccountCreationModule()

    def test_multiple_patients_different_codes(self):
        """Multiple patients can be created with different invite codes."""
        patient1 = self.module.account_create(
            name="Patient One",
            role="P",
            birthday="19900101",
            credential="INV001",
            email="p1@test.com",
            password="pass123"
        )
        patient2 = self.module.account_create(
            name="Patient Two",
            role="P",
            birthday="19900202",
            credential="INV002",
            email="p2@test.com",
            password="pass456"
        )
        self.assertEqual(len(self.module.db._users), 2)
        self.assertNotEqual(patient1.acc_id, patient2.acc_id)

    def test_mixed_patient_and_physio(self):
        """Both patient and physiotherapist can be created."""
        patient = self.module.account_create(
            name="Patient",
            role="P",
            birthday="19900101",
            credential="INV001",
            email="patient@test.com",
            password="pass123"
        )
        physio = self.module.account_create(
            name="Physio",
            role="PT",
            birthday="19800101",
            credential="ON-123456",
            email="physio@clinic.com",
            password="pass456"
        )
        self.assertIsInstance(patient, UserAccountP)
        self.assertIsInstance(physio, UserAccountPT)
        self.assertEqual(len(self.module.db._users), 2)

    def test_same_name_different_birthday_allowed(self):
        """Users with same name but different birthdays can both exist."""
        self.module.account_create(
            name="John Doe",
            role="P",
            birthday="19900101",
            credential="INV001",
            email="john1@test.com",
            password="pass123"
        )
        account2 = self.module.account_create(
            name="John Doe",
            role="P",
            birthday="19900102",
            credential="INV002",
            email="john2@test.com",
            password="pass456"
        )
        self.assertEqual(account2.name, "John Doe")
        self.assertEqual(len(self.module.db._users), 2)


if __name__ == "__main__":
    unittest.main(verbosity=2)

"""
Account Creation Module - MIS Section 5.1

Enables creation of user accounts in the database.
Stores essential information for other modules.

This module implements the Account Creation Module specification from the
Module Interface Specification (MIS) document, Section 5.1.
"""
from dataclasses import dataclass
from typing import Literal, Union, List
import re
import uuid


# ============================================================
# CUSTOM EXCEPTIONS (per MIS specification)
# ============================================================

class FieldEmptyError(Exception):
    """Raised when a required field is empty."""
    pass


class UserNotFoundError(Exception):
    """Raised when a user query fails."""
    pass


class InputFormatInvalidError(Exception):
    """Raised when input format is invalid (email, password, date)."""
    pass


class AccountAlreadyExistsError(Exception):
    """Raised when attempting to create a duplicate account."""
    pass


class IncorrectCredsError(Exception):
    """Raised when license number is invalid."""
    pass


class InviteCodeExpiredError(Exception):
    """Raised when invite code is invalid or already used."""
    pass


# ============================================================
# DATA STRUCTURES (per MIS lines 297-300)
# ============================================================

@dataclass
class UserAccountP:
    """
    Patient account structure.

    Attributes:
        acc_id: Unique account identifier
        name: User's full name
        role: Account role (always 'P' for patient)
        birthday: Birthday in YYYYMMDD format
        email: User's email address
        password: User's password
    """
    acc_id: str
    name: str
    role: Literal['P'] = 'P'
    birthday: str = ""
    email: str = ""
    password: str = ""


@dataclass
class UserAccountPT:
    """
    Physiotherapist account structure.

    Attributes:
        acc_id: Unique account identifier
        name: User's full name
        role: Account role (always 'PT' for physiotherapist)
        birthday: Birthday in YYYYMMDD format
        email: User's email address
        password: User's password
    """
    acc_id: str
    name: str
    role: Literal['PT'] = 'PT'
    birthday: str = ""
    email: str = ""
    password: str = ""


# Type alias for either account type
UserAccount = Union[UserAccountP, UserAccountPT]


# ============================================================
# DATABASE SIMULATION (per MIS assumption about hardcoded values)
# ============================================================

class UserDatabase:
    """
    Simulated database for user accounts.

    Per MIS assumption: Valid license numbers and invite codes are
    hardcoded for feasibility of implementation.
    """

    def __init__(self):
        self._users: List[UserAccount] = []
        self._valid_licenses: List[str] = ["ON-123456", "ON-654321"]
        self._valid_invite_codes: List[str] = ["INV001", "INV002"]
        self._used_invite_codes: List[str] = []


# ============================================================
# ACCOUNT CREATION MODULE
# ============================================================

class AccountCreationModule:
    """
    Account Creation Module - MIS Section 5.1

    Enables creation of user accounts in the database.
    Uses an in-memory database for demonstration (per MIS note about
    hardcoded invite codes and license numbers for feasibility).

    State Variables:
        db: UserDatabase instance containing user accounts and valid credentials

    State Invariants:
        - If no account exists, no acc_id exists in database
        - If account exists, all fields (name, role, email, dob) are non-empty

    Assumptions:
        - Users with the same name have different birthdays
    """

    def __init__(self):
        """Initialize the module with an empty database."""
        self.db = UserDatabase()

    # ========================================================
    # EXPORTED ACCESS PROGRAMS
    # ========================================================

    def acc_exists(self, name: str, birthday: str) -> bool:
        """
        Check if account already exists in user database.

        Per MIS: If account does not exist, implies names are different
        OR if same name, birthdays are different.

        Args:
            name: User's name
            birthday: User's birthday (YYYYMMDD format)

        Returns:
            bool: True if account exists (acc_double = True), False otherwise

        Raises:
            FieldEmptyError: If name or birthday is empty
        """
        # Validate inputs
        if not name or not name.strip():
            raise FieldEmptyError("Name field is empty")
        if not birthday or not birthday.strip():
            raise FieldEmptyError("Birthday field is empty")

        # Search database for matching name AND birthday
        name_clean = name.strip()
        birthday_clean = birthday.strip()

        for user in self.db._users:
            if user.name == name_clean and user.birthday == birthday_clean:
                return True  # Account exists (acc_double = True)

        return False  # No matching account

    # ========================================================
    # LOCAL FUNCTIONS
    # ========================================================

    def account_create(
        self,
        name: str,
        role: Literal['P', 'PT'],
        birthday: str,
        credential: str,  # license_no for PT, invite_code for P
        email: str,
        password: str
    ) -> UserAccount:
        """
        Create a new user account.

        Args:
            name: User's full name
            role: 'P' for patient, 'PT' for physiotherapist
            birthday: Birthday in YYYYMMDD format
            credential: License number (PT) or invite code (P)
            email: User's email address
            password: User's password

        Returns:
            UserAccountP or UserAccountPT instance

        Raises:
            FieldEmptyError: Missing required field
            InputFormatInvalidError: Invalid email/password/date format
            AccountAlreadyExistsError: Account with name+birthday exists
            IncorrectCredsError: Invalid license number
            InviteCodeExpiredError: Invalid or used invite code
        """
        # 1. Validate required fields
        self._validate_required_fields(name, role, birthday, credential, email, password)

        # 2. Validate input formats
        self._validate_formats(email, password, birthday)

        # 3. Check if account already exists
        if self.acc_exists(name, birthday):
            raise AccountAlreadyExistsError(
                f"Account with name '{name}' and birthday '{birthday}' already exists"
            )

        # 4. Validate credentials based on role
        if role == 'PT':
            self._validate_license(credential)
        else:
            self._validate_invite_code(credential)

        # 5. Generate new account ID
        new_acc_id = str(uuid.uuid4())

        # 6. Create account object
        if role == 'PT':
            account = UserAccountPT(
                acc_id=new_acc_id,
                name=name.strip(),
                role='PT',
                birthday=birthday,
                email=email.lower().strip(),
                password=password  # In production, would be hashed
            )
        else:
            account = UserAccountP(
                acc_id=new_acc_id,
                name=name.strip(),
                role='P',
                birthday=birthday,
                email=email.lower().strip(),
                password=password
            )

        # 7. Store in database
        self.set_user_info(account)

        return account

    def set_user_info(self, account: UserAccount) -> None:
        """
        Store user information in database.

        Args:
            account: UserAccountP or UserAccountPT instance

        Raises:
            AccountAlreadyExistsError: If acc_id already exists
        """
        # Check if account ID already exists
        for existing in self.db._users:
            if existing.acc_id == account.acc_id:
                raise AccountAlreadyExistsError(
                    f"Account with ID '{account.acc_id}' already exists"
                )

        # Add to database
        self.db._users.append(account)

    # ========================================================
    # VALIDATION HELPERS
    # ========================================================

    def _validate_required_fields(
        self,
        name: str,
        role: str,
        birthday: str,
        credential: str,
        email: str,
        password: str
    ) -> None:
        """
        Validate all required fields are non-empty.

        Raises:
            FieldEmptyError: If any required field is empty
            InputFormatInvalidError: If role is invalid
        """
        if not name or not name.strip():
            raise FieldEmptyError("Name is required")
        if not role or role not in ('P', 'PT'):
            raise InputFormatInvalidError("Role must be 'P' or 'PT'")
        if not birthday:
            raise FieldEmptyError("Birthday is required")
        if not credential:
            raise FieldEmptyError("License number or invite code is required")
        if not email:
            raise FieldEmptyError("Email is required")
        if not password:
            raise FieldEmptyError("Password is required")

    def _validate_formats(self, email: str, password: str, birthday: str) -> None:
        """
        Validate input formats.

        Raises:
            InputFormatInvalidError: If any format is invalid
        """
        # Email format
        email_pattern = r'^[\w\.-]+@[\w\.-]+\.\w+$'
        if not re.match(email_pattern, email):
            raise InputFormatInvalidError("Invalid email format")

        # Password minimum length
        if len(password) < 6:
            raise InputFormatInvalidError("Password must be at least 6 characters")

        # Birthday format (YYYYMMDD)
        if not re.match(r'^\d{8}$', birthday):
            raise InputFormatInvalidError("Birthday must be in YYYYMMDD format")

    def _validate_license(self, license_no: str) -> None:
        """
        Validate physiotherapist license number.

        Args:
            license_no: License number in XX-NNNNNN format

        Raises:
            InputFormatInvalidError: If license format is invalid
            IncorrectCredsError: If license number not in registry
        """
        # Format: XX-NNNNNN (e.g., ON-123456)
        if not re.match(r'^[A-Z]{2}-\d{6}$', license_no.upper()):
            raise InputFormatInvalidError("License format must be XX-NNNNNN")
        if license_no.upper() not in self.db._valid_licenses:
            raise IncorrectCredsError("License number not found in registry")

    def _validate_invite_code(self, invite_code: str) -> None:
        """
        Validate patient invite code.

        Args:
            invite_code: Invite code string

        Raises:
            InviteCodeExpiredError: If code is invalid or already used
        """
        code = invite_code.upper().strip()
        if code not in self.db._valid_invite_codes:
            raise InviteCodeExpiredError("Invalid invite code")
        if code in self.db._used_invite_codes:
            raise InviteCodeExpiredError("Invite code has already been used")
        # Mark as used
        self.db._used_invite_codes.append(code)


# ============================================================
# MODULE EXPORTS
# ============================================================

__all__ = [
    # Exceptions
    'FieldEmptyError',
    'UserNotFoundError',
    'InputFormatInvalidError',
    'AccountAlreadyExistsError',
    'IncorrectCredsError',
    'InviteCodeExpiredError',
    # Data classes
    'UserAccountP',
    'UserAccountPT',
    'UserAccount',
    # Database
    'UserDatabase',
    # Main module
    'AccountCreationModule',
]

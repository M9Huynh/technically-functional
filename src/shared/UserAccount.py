
# Module for user account data manipulation in Firestore using UserData dataclass

import firebase_admin
from firebase_admin import credentials, firestore
from typing import Optional, List
from datetime import datetime, date
import json
import os
import random

# Import UserData from UserData.py
from UserData import UserData

# Custom Exceptions
class UserNotFoundError(Exception):
    """Raised when a user is not found in the database"""
    pass

class DownloadError(Exception):
    """Raised when there's an error downloading data"""
    pass

class FieldEmptyError(Exception):
    """Raised when required fields are empty"""
    pass

class LoginMatchError(Exception):
    """Raised when username/password don't match"""
    pass

class FirebaseInitializationError(Exception):
    """Raised when Firebase fails to initialize"""
    pass

class NoAvailableIDError(Exception):
    """Raised when no more unique IDs are available"""
    pass

class UserAccount:
    
    def __init__(self, service_account_key_path: Optional[str] = None):
        """
        Initialize Firestore connection
        
        Args:
            service_account_key_path: Path to Firebase service account key JSON file.
        """
        # Try to find the service account key file
        if service_account_key_path is None:
            service_account_key_path = self._find_service_account_key()
        
        try:
            # Check if file exists
            if not os.path.exists(service_account_key_path):
                raise FileNotFoundError(
                    f"Service account key file not found at: {service_account_key_path}"
                )
            
            print(f"Loading Firebase credentials from: {service_account_key_path}")
            
            # Initialize Firebase app if not already initialized
            if not firebase_admin._apps:
                cred = credentials.Certificate(service_account_key_path)
                firebase_admin.initialize_app(cred)
            
            self.db = firestore.client()
            self.users_collection = "users"  # Firestore collection name for users
            self.id_pool_collection = "id_pool"  # Collection for available IDs
            self.id_pool_doc = "available_ids"  # Document storing available IDs
            
            print("Firebase Firestore initialized successfully")
            
            # Initialize the ID pool if it doesn't exist
            self._initialize_id_pool()
            
        except FileNotFoundError as e:
            print(f"ERROR: {e}")
            raise FirebaseInitializationError(f"Could not find service account key file: {e}")
        except Exception as e:
            print(f"Error initializing Firebase: {e}")
            raise FirebaseInitializationError(f"Failed to initialize Firebase: {e}")
    
    # Trying to find the service account key file in common locations
    def _find_service_account_key(self) -> str:

        possible_paths = [
            "serviceAccountKey.json",
            os.path.join(os.path.dirname(__file__), "serviceAccountKey.json"),
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                return path
        
        raise FileNotFoundError(
            "serviceAccountKey.json not found. "
            "Please specify the full path when initializing UserAccount."
        )
    
    # Initialize the pool of available 5-digit IDs (10000-99999)
    # Only runs once when the pool doesn't exist
    def _initialize_id_pool(self) -> None:
        try:
            doc_ref = self.db.collection(self.id_pool_collection).document(self.id_pool_doc)
            doc = doc_ref.get()
            
            if not doc.exists:
                # Create initial pool with all 5-digit IDs (10000-99999)
                all_ids = list(range(10000, 100000))  # 90000 possible IDs
                
                # Store in chunks to avoid Firestore document size limits
                # Each chunk will have 1000 IDs
                chunk_size = 1000
                chunks = [all_ids[i:i + chunk_size] for i in range(0, len(all_ids), chunk_size)]
                
                # Store chunk information
                pool_data = {
                    "total_ids": len(all_ids),
                    "available_chunks": len(chunks),
                    "chunk_size": chunk_size,
                    "last_updated": firestore.SERVER_TIMESTAMP
                }
                
                # Store first chunk in main document
                pool_data["current_chunk"] = chunks[0]
                doc_ref.set(pool_data)
                
                # Store remaining chunks in subcollection
                for i, chunk in enumerate(chunks[1:], start=1):
                    chunk_ref = doc_ref.collection("chunks").document(f"chunk_{i}")
                    chunk_ref.set({"ids": chunk})
                
                print(f"Initialized ID pool with {len(all_ids)} available IDs")
            else:
                print("ID pool already exists")
                
        except Exception as e:
            print(f"Error initializing ID pool: {e}")


    # Get current list of available IDs (to be used as acc_id) from the pool
    def _get_available_ids(self) -> List[int]:
        try:
            doc_ref = self.db.collection(self.id_pool_collection).document(self.id_pool_doc)
            doc = doc_ref.get()
            
            if not doc.exists:
                return []
            
            data = doc.to_dict()
            available_ids = data.get("current_chunk", [])
            
            # If current chunk is empty, get next chunk
            if not available_ids:
                chunk_count = data.get("available_chunks", 0)
                current_chunk_index = 0
                
                # Find and load next non-empty chunk
                for i in range(1, chunk_count):
                    chunk_ref = doc_ref.collection("chunks").document(f"chunk_{i}")
                    chunk_doc = chunk_ref.get()
                    if chunk_doc.exists:
                        chunk_data = chunk_doc.to_dict()
                        chunk_ids = chunk_data.get("ids", [])
                        if chunk_ids:
                            # Update main document with new chunk
                            update_data = {
                                "current_chunk": chunk_ids,
                                "available_chunks": chunk_count - 1,
                                "last_updated": firestore.SERVER_TIMESTAMP
                            }
                            doc_ref.update(update_data)
                            
                            # Delete the chunk we just used
                            chunk_ref.delete()
                            
                            available_ids = chunk_ids
                            break
                
                # If still no IDs, regenerate the pool
                # This probably won't happen for users <100
                if not available_ids:
                    print("Warning: ID pool exhausted, regenerating...")
                    self._regenerate_id_pool()
                    return self._get_available_ids()
            
            return available_ids
            
        except Exception as e:
            print(f"Error getting available IDs: {e}")
            return []
    
    # Regenerate the ID pool by finding all used IDs and creating a new pool
    def _regenerate_id_pool(self) -> None:
        try:
            # Get all currently used IDs
            used_ids = set()
            users = self.get_all_users()
            for user in users:
                used_ids.add(user.acc_id)
            
            # Create new pool excluding used IDs
            all_possible_ids = set(range(10000, 100000))
            available_ids = list(all_possible_ids - used_ids)
            
            if not available_ids:
                raise NoAvailableIDError("No more unique 5-digit IDs available")
            
            # Store in chunks
            chunk_size = 1000
            chunks = [available_ids[i:i + chunk_size] for i in range(0, len(available_ids), chunk_size)]
            
            doc_ref = self.db.collection(self.id_pool_collection).document(self.id_pool_doc)
            
            # Update main document
            pool_data = {
                "total_ids": len(available_ids),
                "available_chunks": len(chunks),
                "chunk_size": chunk_size,
                "current_chunk": chunks[0] if chunks else [],
                "last_updated": firestore.SERVER_TIMESTAMP
            }
            doc_ref.set(pool_data)
            
            # Clear old chunks and add new ones
            chunks_collection = doc_ref.collection("chunks")
            
            # Delete all existing chunks
            docs = chunks_collection.stream()
            for doc in docs:
                doc.reference.delete()
            
            # Add new chunks
            for i, chunk in enumerate(chunks[1:], start=1):
                chunk_ref = chunks_collection.document(f"chunk_{i}")
                chunk_ref.set({"ids": chunk})
            
            print(f"Regenerated ID pool with {len(available_ids)} available IDs")
            
        except Exception as e:
            print(f"Error regenerating ID pool: {e}")
            raise
    # Retrieve random ID from pool of available IDs
    def _get_random_available_id(self) -> int:
        try:
            available_ids = self._get_available_ids()
            
            if not available_ids:
                raise NoAvailableIDError("No available IDs in pool")
            
            # Pick a random ID from available ones
            random_id = random.choice(available_ids)
            
            # Remove it from the pool
            self._remove_id_from_pool(random_id)
            
            return random_id
            
        except Exception as e:
            print(f"Error getting random ID: {e}")
            raise
    # Remove an ID from the available pool
    def _remove_id_from_pool(self, acc_id: int) -> None:
        try:
            doc_ref = self.db.collection(self.id_pool_collection).document(self.id_pool_doc)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                current_chunk = data.get("current_chunk", [])
                
                if acc_id in current_chunk:
                    # Remove from current chunk
                    current_chunk.remove(acc_id)
                    
                    # Update document
                    update_data = {
                        "current_chunk": current_chunk,
                        "total_ids": data.get("total_ids", 0) - 1,
                        "last_updated": firestore.SERVER_TIMESTAMP
                    }
                    doc_ref.update(update_data)
                    
                    print(f"Removed ID {acc_id} from pool")
                else:
                    # Check other chunks
                    found = False
                    chunks_collection = doc_ref.collection("chunks")
                    chunks = chunks_collection.stream()
                    
                    for chunk_doc in chunks:
                        chunk_data = chunk_doc.to_dict()
                        chunk_ids = chunk_data.get("ids", [])
                        
                        if acc_id in chunk_ids:
                            chunk_ids.remove(acc_id)
                            chunk_doc.reference.update({"ids": chunk_ids})
                            found = True
                            
                            # Update total count
                            doc_ref.update({
                                "total_ids": firestore.Increment(-1),
                                "last_updated": firestore.SERVER_TIMESTAMP
                            })
                            break
                    
                    if not found:
                        print(f"Warning: ID {acc_id} not found in pool")
            
        except Exception as e:
            print(f"Error removing ID from pool: {e}")
    
    # Return an ID to the available pool (when user is deleted)
    def _return_id_to_pool(self, acc_id: int) -> None:
        try:
            # Check if ID is already in use
            existing_user = self.get_user_by_acc_id(acc_id)
            if existing_user:
                print(f"Warning: ID {acc_id} is still in use, not returning to pool")
                return
            
            # Add to current chunk
            doc_ref = self.db.collection(self.id_pool_collection).document(self.id_pool_doc)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                current_chunk = data.get("current_chunk", [])
                
                # Add to current chunk if not already there
                if acc_id not in current_chunk:
                    current_chunk.append(acc_id)
                    
                    # Update document
                    update_data = {
                        "current_chunk": current_chunk,
                        "total_ids": firestore.Increment(1),
                        "last_updated": firestore.SERVER_TIMESTAMP
                    }
                    doc_ref.update(update_data)
                    
                    print(f"Returned ID {acc_id} to pool")
                else:
                    print(f"Warning: ID {acc_id} already in pool")
            else:
                print("Error: ID pool document not found")
                
        except Exception as e:
            print(f"Error returning ID to pool: {e}")
    
    # DATA CONVERSION FUNCTIONS BELOW
    
    # Convert Firestore document to UserData object
    def firestore_to_userdata(self, doc) -> UserData:
        try:
            data = doc.to_dict()
            
            # Get acc_id from document data or use document ID as fallback
            acc_id = data.get('acc_id', 0)
            if not acc_id:
                # Try to parse document ID as integer
                try:
                    acc_id = int(doc.id)
                except ValueError:
                    acc_id = 0
            
            # Handle birthday conversion
            birthday = data.get('birthday')
            birthday_date = date.today()
            
            if birthday:
                if hasattr(birthday, 'date'):
                    birthday_date = birthday.date()
                elif isinstance(birthday, str):
                    try:
                        birthday_date = date.fromisoformat(birthday)
                    except ValueError:
                        for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y']:
                            try:
                                birthday_date = datetime.strptime(birthday, fmt).date()
                                break
                            except ValueError:
                                continue
                elif isinstance(birthday, date):
                    birthday_date = birthday
            
            # Ensure role is valid
            role = data.get('role', 'patient')
            if role not in ['patient', 'physio']:
                role = 'patient'
            
            return UserData(
                acc_id=acc_id,
                email=data.get('email', ''),
                password=data.get('password', ''),
                name=data.get('name', ''),
                birthday=birthday_date,
                role=role
            )
            
        except Exception as e:
            print(f"Error converting Firestore document to UserData: {e}")
            return UserData(
                acc_id=0,
                email="",
                password="",
                name="",
                birthday=date.today(),
                role='patient'
            )
    
    # Convert UserData object to Firestore-compatible dictionary
    def userdata_to_firestore_dict(self, user_data: UserData) -> dict:
        firestore_dict = user_data.to_dict()
        
        # Ensure acc_id is included
        firestore_dict['acc_id'] = user_data.acc_id
        
        if 'birthday' in firestore_dict and isinstance(firestore_dict['birthday'], date):
            firestore_dict['birthday'] = firestore_dict['birthday'].isoformat()
        
        return firestore_dict
    
    # CREATE UPDATE DELETE FUNCTIONS 
    # to be deleted once Vais' code syncs with UserData use
    # TODO: add acc_id check to check for collisions?

    # Create a new user with unique acc_id
    def create_user(self, user_data: UserData) -> tuple:
        """
        Args:
            user_data: UserData object (acc_id will be ignored and generated)
            
        Returns:
            tuple: (acc_id, firestore_document_id)
        """
        if not user_data.email or not user_data.password or not user_data.name:
            raise FieldEmptyError("Email, password, and name fields cannot be empty")
        
        try:
            # Check if email already exists
            if self.user_exists(user_data.email):
                raise ValueError(f"User with email {user_data.email} already exists")
            
            # Generate unique acc_id
            acc_id = self._get_random_available_id()
            
            # Create user with generated acc_id
            user_with_id = UserData(
                acc_id=acc_id,
                email=user_data.email,
                password=user_data.password,
                name=user_data.name,
                birthday=user_data.birthday,
                role=user_data.role
            )
            
            # Convert to Firestore format
            firestore_data = self.userdata_to_firestore_dict(user_with_id)
            
            # TODO
            # Add timestamps - needed?
            firestore_data['created_at'] = firestore.SERVER_TIMESTAMP
            firestore_data['updated_at'] = firestore.SERVER_TIMESTAMP
            
            # Create user document
            doc_ref = self.db.collection(self.users_collection).add(firestore_data)
            firestore_id = doc_ref[1].id
            
            print(f"User created successfully with acc_id: {acc_id} and Firestore ID: {firestore_id}")
            return acc_id, firestore_id
            
        except Exception as e:
            print(f"Error creating user: {e}")
            # Return ID to pool if creation failed
            if 'acc_id' in locals():
                self._return_id_to_pool(acc_id)
            raise
    
    # Retrieve a user by acc_id
    def get_user_by_acc_id(self, acc_id: int) -> Optional[UserData]:
        try:
            users_ref = self.db.collection(self.users_collection)
            query = users_ref.where('acc_id', '==', acc_id).limit(1)
            docs = list(query.stream())
            
            if not docs:
                return None
            
            return self.firestore_to_userdata(docs[0])
            
        except Exception as e:
            print(f"Error retrieving user by acc_id: {e}")
            return None
    
    # Retrieve a user by email address
    def get_user_by_email(self, email: str) -> Optional[UserData]:

        try:
            users_ref = self.db.collection(self.users_collection)
            query = users_ref.where('email', '==', email).limit(1)
            docs = list(query.stream())
            
            if not docs:
                return None
            
            return self.firestore_to_userdata(docs[0])
            
        except Exception as e:
            print(f"Error retrieving user by email: {e}")
            return None
    
    # Retrieve a user by Firestore document ID
    def get_user_by_id(self, user_id: str) -> Optional[UserData]:
        try:
            doc_ref = self.db.collection(self.users_collection).document(user_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                return None
            
            return self.firestore_to_userdata(doc)
            
        except Exception as e:
            print(f"Error retrieving user by ID: {e}")
            return None
    
    # Update an existing user
    def update_user(self, user_data: UserData) -> bool:
        try:
            if not user_data.acc_id:
                raise ValueError("UserData must have a valid acc_id for update")
            
            # Find the user by acc_id
            users_ref = self.db.collection(self.users_collection)
            query = users_ref.where('acc_id', '==', user_data.acc_id).limit(1)
            docs = list(query.stream())
            
            if not docs:
                raise UserNotFoundError(f"No user found with acc_id: {user_data.acc_id}")
            
            # Update the document
            update_data = self.userdata_to_firestore_dict(user_data)
            update_data['updated_at'] = firestore.SERVER_TIMESTAMP
            
            docs[0].reference.update(update_data)
            
            print(f"User with acc_id {user_data.acc_id} updated successfully")
            return True
            
        except Exception as e:
            print(f"Error updating user: {e}")
            return False
    
    # Delete a user by acc_id and return ID to pool
    def delete_user_by_acc_id(self, acc_id: int) -> bool:
        try:
            # Find the user by acc_id
            users_ref = self.db.collection(self.users_collection)
            query = users_ref.where('acc_id', '==', acc_id).limit(1)
            docs = list(query.stream())
            
            if not docs:
                raise UserNotFoundError(f"No user found with acc_id: {acc_id}")
            
            # Delete the document
            docs[0].reference.delete()
            
            # Return ID to pool
            self._return_id_to_pool(acc_id)
            
            print(f"User with acc_id {acc_id} deleted successfully")
            return True
            
        except UserNotFoundError:
            raise
        except Exception as e:
            print(f"Error deleting user: {e}")
            return False
    
    # Delete a user by email and return ID to pool
    def delete_user_by_email(self, email: str) -> bool:
        try:
            user_data = self.get_user_by_email(email)
            if not user_data:
                raise UserNotFoundError(f"No user found with email: {email}")
            
            return self.delete_user_by_acc_id(user_data.acc_id)
            
        except UserNotFoundError:
            raise
        except Exception as e:
            print(f"Error deleting user by email: {e}")
            return False
    
    # QUERY FUNCTIONS
    
    # Retrieve user(s) by name
    def get_users_by_name(self, name: str) -> List[UserData]:
        try:
            users_ref = self.db.collection(self.users_collection)
            query = users_ref.where('name', '==', name)
            docs = query.stream()
            
            users = []
            for doc in docs:
                users.append(self.firestore_to_userdata(doc))
            
            return users
            
        except Exception as e:
            print(f"Error retrieving users by name: {e}")
            return []
    
    # Retrieve users by role
    def get_users_by_role(self, role: str) -> List[UserData]:
        try:
            users_ref = self.db.collection(self.users_collection)
            query = users_ref.where('role', '==', role)
            docs = query.stream()
            
            users = []
            for doc in docs:
                users.append(self.firestore_to_userdata(doc))
            
            return users
            
        except Exception as e:
            print(f"Error retrieving users by role: {e}")
            return []
    
    #Retrieve all users
    def get_all_users(self) -> List[UserData]:
        try:
            users_ref = self.db.collection(self.users_collection)
            docs = users_ref.stream()
            
            users = []
            for doc in docs:
                users.append(self.firestore_to_userdata(doc))
            
            return users
            
        except Exception as e:
            print(f"Error retrieving all users: {e}")
            return []
    
    # ========== SPECIFIED ACCESS ROUTINES ==========
    
    # Retrieves user account information from the user table
    def get_userdb_info(self, name: str, birthday: Optional[str] = None) -> tuple:
        try:
            users_ref = self.db.collection(self.users_collection)
            query = users_ref.where('name', '==', name)
            
            if birthday:
                query = query.where('birthday', '==', birthday)
            
            docs = query.stream()
            
            user_accounts = []
            for doc in docs:
                user_accounts.append(self.firestore_to_userdata(doc))
            
            if not user_accounts:
                raise UserNotFoundError(f"No user found with name: {name}")
            
            patients = []
            physios = []
            
            for user_data in user_accounts:
                if user_data.role == 'patient':
                    patients.append(user_data)
                elif user_data.role == 'physio':
                    physios.append(user_data)
            
            return patients, physios
            
        except UserNotFoundError:
            raise
        except Exception as e:
            print(f"Error retrieving user info: {e}")
            raise DownloadError(f"Failed to download user data: {e}")
    
    # Allows PT to delete a patient account from the system
    def PTaccount_delete(self, name: str, email: str) -> None:
        if not name or not email:
            raise FieldEmptyError("Name and email fields cannot be empty")
        
        try:
            # Find user by name and email
            users_ref = self.db.collection(self.users_collection)
            query = users_ref.where('name', '==', name).where('email', '==', email)
            docs = list(query.stream())
            
            if not docs:
                raise UserNotFoundError(f"No user found with name '{name}' and email '{email}'")
            
            for doc in docs:
                # Get acc_id before deleting
                data = doc.to_dict()
                acc_id = data.get('acc_id')
                
                # Delete the document
                doc.reference.delete()
                
                # Return ID to pool
                if acc_id:
                    self._return_id_to_pool(acc_id)
                
                print(f"Successfully deleted user: {name} ({email}) with acc_id: {acc_id}")
                
        except UserNotFoundError:
            raise
        except Exception as e:
            print(f"Error deleting user account: {e}")
            raise
    
    # Verifies if username and password match for authentication
    def username_pw_match(self, email: str, password: str) -> bool:
        try:
            user_data = self.get_user_by_email(email)
            
            if not user_data:
                raise LoginMatchError("Invalid email or password")
            
            if user_data.password == password:
                print(f"Successful login for user: {email}")
                return True
            else:
                raise LoginMatchError("Invalid email or password")
            
        except LoginMatchError:
            raise
        except Exception as e:
            print(f"Error during login verification: {e}")
            raise LoginMatchError("Authentication failed")
        
    # Authenticate user and return UserData if successful
    def authenticate_user(self, email: str, password: str) -> Optional[UserData]:
        try:
            if self.username_pw_match(email, password):
                return self.get_user_by_email(email)
            return None
        except LoginMatchError:
            return None
    
    # ADDITIONAL USEFUL FUNCTIONS
    
    # Check if a user with given email exists
    def user_exists(self, email: str) -> bool:
        return self.get_user_by_email(email) is not None
    
    # Count users by role
    def count_users_by_role(self, role: str) -> int:
        users = self.get_users_by_role(role)
        return len(users)
    
    # Get status of the ID pool
    def get_pool_status(self) -> dict:
        try:
            doc_ref = self.db.collection(self.id_pool_collection).document(self.id_pool_doc)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                return {
                    "total_available": data.get("total_ids", 0),
                    "current_chunk_size": len(data.get("current_chunk", [])),
                    "available_chunks": data.get("available_chunks", 0),
                    "last_updated": data.get("last_updated")
                }
            return {"error": "Pool document not found"}
            
        except Exception as e:
            print(f"Error getting pool status: {e}")
            return {"error": str(e)}
    
    def test_connection(self) -> bool:
        """
        Test the Firestore connection
        """
        try:
            users_ref = self.db.collection(self.users_collection)
            docs = list(users_ref.limit(1).stream())
            print("Firestore connection test successful!")
            return True
        except Exception as e:
            print(f"Firestore connection test failed: {e}")
            return False

# TEST CODE 
if __name__ == "__main__":
    print("Testing UserAccount class with unique acc_id system...")
    
    try:
        # Initialize
        user_account = UserAccount()
        print("✓ UserAccount initialized successfully")
        
        # Test connection
        if user_account.test_connection():
            print("✓ Firestore connection working")
        else:
            print("✗ Firestore connection failed")
            exit(1)
        
        # Check pool status
        pool_status = user_account.get_pool_status()
        print(f"✓ ID Pool Status: {pool_status.get('total_available', 0)} IDs available")
        
        # Test email for cleanup
        test_email = "test_acc_id@example.com"
        
        # Clean up any existing test user first
        if user_account.user_exists(test_email):
            print(f"Found existing test user {test_email}, deleting...")
            if user_account.delete_user_by_email(test_email):
                print(f"✓ Deleted existing test user")
            else:
                print(f"✗ Failed to delete existing test user")
        
        # Create a test user (acc_id will be auto-generated)
        test_user = UserData(
            acc_id=0,  # Will be ignored and generated
            email=test_email,
            password="testpassword123",
            name="Test AccID User",
            birthday=date(1995, 5, 15),
            role='patient'
        )
        
        # Create user and get the generated acc_id
        print(f"\nCreating test user: {test_user.email}")
        acc_id, firestore_id = user_account.create_user(test_user)
        print(f"✓ Created test user with acc_id: {acc_id} and Firestore ID: {firestore_id}")
        
        # Verify acc_id is 5 digits
        if 10000 <= acc_id <= 99999:
            print(f"✓ acc_id {acc_id} is valid 5-digit number")
        else:
            print(f"✗ acc_id {acc_id} is not a valid 5-digit number")
        
        # Test retrieval by acc_id
        retrieved_user = user_account.get_user_by_acc_id(acc_id)
        if retrieved_user and retrieved_user.email == test_email:
            print(f"✓ Retrieved user by acc_id {acc_id}: {retrieved_user.name}")
        else:
            print("✗ Failed to retrieve user by acc_id")
        
        # Test retrieval by email
        retrieved_by_email = user_account.get_user_by_email(test_email)
        if retrieved_by_email and retrieved_by_email.acc_id == acc_id:
            print(f"✓ Retrieved user by email: {retrieved_by_email.name}")
        else:
            print("✗ Failed to retrieve user by email")
        
        # Test authentication
        try:
            if user_account.username_pw_match(test_email, "testpassword123"):
                print("✓ Authentication successful")
            else:
                print("✗ Authentication failed")
        except LoginMatchError as e:
            print(f"✗ Authentication error: {e}")
        
        # Check pool status after creation
        pool_status_after = user_account.get_pool_status()
        print(f"✓ ID Pool after creation: {pool_status_after.get('total_available', 0)} IDs available")
        
        # Clean up
        print(f"\nCleaning up - deleting test user: {test_email}")
        if user_account.delete_user_by_email(test_email):
            print("✓ Test user deleted successfully")
            
            # Verify deletion
            if not user_account.user_exists(test_email):
                print("✓ User confirmed deleted from database")
            else:
                print("✗ User still exists after deletion")
            
            # Check pool status after deletion (should have +1 ID)
            pool_status_final = user_account.get_pool_status()
            print(f"✓ Final ID Pool: {pool_status_final.get('total_available', 0)} IDs available")
        else:
            print("✗ Failed to delete test user")
        
        # Create multiple test users to demonstrate uniqueness
        print("\n" + "="*50)
        print("Testing multiple user creation...")
        test_users = []
        for i in range(3):
            user = UserData(
                acc_id=0,
                email=f"multi_test_{i}@example.com",
                password=f"password{i}",
                name=f"Multi Test User {i}",
                birthday=date(1990 + i, 1, 1),
                role='patient'
            )
            
            # Clean up if exists
            if user_account.user_exists(user.email):
                user_account.delete_user_by_email(user.email)
            
            acc_id, _ = user_account.create_user(user)
            test_users.append((user.email, acc_id))
            print(f"  Created user {user.email} with acc_id: {acc_id}")
        
        # Verify all acc_ids are unique
        acc_ids = [acc_id for _, acc_id in test_users]
        if len(set(acc_ids)) == len(acc_ids):
            print("✓ All generated acc_ids are unique")
        else:
            print("✗ Duplicate acc_ids generated!")
        
        # Clean up test users
        print("\nCleaning up test users...")
        for email, acc_id in test_users:
            if user_account.delete_user_by_email(email):
                print(f"  Deleted {email} (acc_id: {acc_id})")
        
        print("\n" + "="*50)
        print("ALL TESTS COMPLETED SUCCESSFULLY!")
        print("="*50)
        
    except FirebaseInitializationError as e:
        print(f"\n✗ Firebase initialization failed: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure serviceAccountKey.json is in the same directory")
        print("2. Check if the file has proper permissions")
        
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Create user - acc_id is auto-generated
    user_account = UserAccount()
    test_user = UserData(
        acc_id=0,  # Ignored, will be generated
        email="user@example.com",
        password="pass123",
        name="John Doe",
        birthday=date(1990, 1, 1),
        role='patient'
)

# Create returns (acc_id, firestore_id)
    acc_id, firestore_id = user_account.create_user(test_user)
    print(f"User created with acc_id: {acc_id}")  # e.g., 54231

# Find by acc_id
    user = user_account.get_user_by_acc_id(acc_id)

# Delete returns acc_id to pool
    user_account.delete_user_by_acc_id(acc_id)
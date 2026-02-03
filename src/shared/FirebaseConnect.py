# shared/FirebaseConnect.py
import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
import json

# starting fb connection
# get absolute path to service account key
current_dir = os.path.dirname(os.path.abspath(__file__))
key_file_path = os.path.join(current_dir, 'serviceAccountKey.json')

# print(f"Current directory: {current_dir}")
# print(f"Looking for: {key_file_path}")

# Check if file exists
if not os.path.exists(key_file_path):
    print(f"File not found")
    print(f"   Current files: {os.listdir(current_dir)}")
    db = None
    auth_client = None
else:
    # print(f"File found: {key_file_path}")
    
    # JSON check
    try:
        with open(key_file_path, 'r') as f:
            key_data = json.load(f)
        print(f"Yes: {key_data.get('project_id', 'Unknown')}")
        
        # Check for required fields (serviceAccountKey)
        required = ['project_id', 'private_key', 'client_email']
        missing = [field for field in required if field not in key_data]
        if missing:
            print(f"Missing required fields: {missing}")
            db = None
            auth_client = None
        else:
            print("All required fields present")
            
            # Initialize Firebase
            try:
                if not firebase_admin._apps:
                    #print("Initializing Firebase Admin SDK")
                    cred = credentials.Certificate(key_file_path)
                    firebase_admin.initialize_app(cred)
                #    print(" Firebase Admin SDK initialized")
                
                # Get Firestore database
                db = firestore.client()
                auth_client = auth
                
                # print("Firestore database connected")
                # print("Auth client initialized")
                '''
                # Test connection with a simple operation
                print("Testing connection")
                test_ref = db.collection('_connection_test').document('test')
                test_ref.set({'test': True, 'timestamp': firestore.SERVER_TIMESTAMP})
                test_ref.delete()
                print("Connection test successful")
                '''
            except Exception as e:
                print(f"Firebase initialization failed: {e}")
                import traceback
                traceback.print_exc()
                db = None
                auth_client = None
                
    except json.JSONDecodeError as e:
        print(f"Invalid JSON in service account key: {e}")
        db = None
        auth_client = None
    except Exception as e:
        print(f"Error reading file: {e}")
        db = None
        auth_client = None

# Create FirebaseConnection class
class FirebaseConnection:
    def __init__(self):
        self._db = db
        self._auth = auth_client
    
    def get_db(self):
        if self._db is None:
            raise RuntimeError(
                "Firebase not initialized.\n"
                f"Check that 'serviceAccountKey.json' exists in: {current_dir}\n"
                "and contains valid Firebase credentials."
            )
        return self._db
    
    def get_auth(self):
        if self._auth is None:
            raise RuntimeError("Firebase Auth not initialized")
        return self._auth
    
    def get_collection(self, collection_name):
        return self.get_db().collection(collection_name)
    
    def get_document(self, collection_name, document_id):
        return self.get_db().collection(collection_name).document(document_id)
    
    def __repr__(self):
        status = "CONNECTED" if self._db else "DISCONNECTED"
        return f"FirebaseConnection(status={status})"

# Create and export the connection instance
firebase_conn = FirebaseConnection()
print(f"FirebaseConnection instance created: {firebase_conn}")

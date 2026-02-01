
import os
import sys
import firebase_admin 

print("\n firebase connection test")
print("_" * 60)

# Check current directory
#print(f"📁 Working directory: {os.getcwd()}")
#print(f"📄 Files here: {os.listdir('.')}")


#print("Successful import")

try:
    # Import FirebaseConnect
    from FirebaseConnect import firebase_conn
    
    #print(f"Import successful")
    print(f"\nfirebase_conn object: {firebase_conn}")
    
    # Trying to get database
    print(f"\ngetting db")
    print(f"\n")
    try:
        db = firebase_conn.get_db()
        print(f"Db: {db}")
        
        # Test Firestore operations
        print(f"\nTesting Firestore operations")
        
        # 1. Create a test collection/document
        test_ref = db.collection('test_collection').document('test_document')
        
        # 2. Write data
        test_data = {
            'message': 'Hi from firebase',
            'timestamp': firebase_admin.firestore.SERVER_TIMESTAMP,
            'test': True
        }
        test_ref.set(test_data)
        print("Data written successfully")
        
        # 3. Read data back
        doc = test_ref.get()
        if doc.exists:
            print(f"Data retrieved: {doc.to_dict()}")
        else:
            print("No document not found after writing")
        
        # 4. Clean up
        test_ref.delete()
        
    except Exception as e:
        print(f"Error getting/using database: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        
except ImportError as e:
    print(f"Import error: {e}")
    
except Exception as e:
    print(f"Unexpected error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
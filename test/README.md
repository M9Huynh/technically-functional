# Automated Tests

## Account Creation Module Tests

### Requirements
- Python 3.8+
- No external dependencies (uses built-in `unittest`)

### Running Tests

From the project root directory:

```bash
# Run all tests with verbose output
python3 src/shared/test_account_creation.py

# Or run from the shared directory
cd src/shared
python3 test_account_creation.py
```

### Test Coverage

The test suite covers:
- `acc_exists()` - exported access program
- `account_create()` - patient and physiotherapist creation
- `set_user_info()` - database storage
- Input validation (empty fields, invalid formats)
- Exception handling (all 6 custom exceptions)
- State invariants from MIS specification
- Integration workflows

### Expected Output

All 35 tests should pass:

```
test_returns_false_for_new_user (test_account_creation.TestAccExists) ... ok
test_returns_true_for_existing_user (test_account_creation.TestAccExists) ... ok
...
----------------------------------------------------------------------
Ran 35 tests in 0.001s

OK
```

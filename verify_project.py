import os
import sys

def main():
    print("============================================================")
    print("   ALGORITHMIC TRADING PLATFORM - PROJECT VERIFICATION")
    print("============================================================")

    directories_to_check = [
        "backend/app",
        "backend/app/api",
        "backend/app/models",
        "backend/app/schemas",
        "backend/app/services",
        "frontend/src",
        "frontend/src/app"
    ]

    files_to_check = [
        "docker-compose.yml",
        "backend/requirements.txt",
        "backend/app/main.py",
        "frontend/package.json"
    ]

    dependencies_to_check = [
        "fastapi",
        "uvicorn",
        "sqlalchemy",
        "psycopg2-binary",
        "pydantic",
        "yfinance",
        "backtrader",
        "passlib"
    ]

    passed = True

    print("\n[1] Checking Directories:")
    for directory in directories_to_check:
        if os.path.isdir(directory):
            print(f"  [PASS] {directory}")
        else:
            print(f"  [FAIL] {directory} is missing")

    print("\n[2] Checking Files:")
    for file in files_to_check:
        if os.path.isfile(file):
            print(f"  [PASS] {file}")
        else:
            print(f"  [FAIL] {file} is missing")

    print("\n[3] Checking Backend Dependencies (requirements.txt):")
    req_path = "backend/requirements.txt"
    if os.path.isfile(req_path):
        with open(req_path, "r") as f:
            content = f.read()
            for dep in dependencies_to_check:
                if dep in content:
                    print(f"  [PASS] {dep} found")
                else:
                    print(f"  [FAIL] {dep} missing in requirements")
                    passed = False
    else:
        print("  [FAIL] Cannot check dependencies, requirements.txt missing.")
        passed = False

    print("\n============================================================")
    if passed:
        print("VERIFICATION COMPLETED: ALL CHECKS PASSED.")
        return 0
    else:
        print("VERIFICATION COMPLETED: SOME CHECKS FAILED.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

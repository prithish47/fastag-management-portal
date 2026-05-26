import os
import sys
import subprocess

def run_script(script_name):
    print(f"\n>>> Running {script_name}...")
    try:
        # Run script using current Python interpreter
        result = subprocess.run([sys.executable, script_name], check=True, capture_output=True, text=True)
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error executing {script_name}:")
        print(e.stderr)
        print(e.stdout)
        # We don't raise here to allow subsequent migration steps that might be independent to run
        # but let's raise if it's the base tables creation
        if script_name == "create_new_tables.py":
            raise e

def main():
    print("=" * 60)
    print("RUNNING ALL DATABASE MIGRATIONS & SEEDING")
    print("=" * 60)

    # Change working directory to backend root directory
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)

    # List of migration scripts in correct sequence
    scripts = [
        "create_new_tables.py",
        "run_migrations.py",
        "run_migrations_phase2.py",
        "run_migrations_support.py",
        "run_migrations_support_v2.py",
        "run_migrations_toll_crossing.py",
        "run_migrations_phase3.py",
        "run_migrations_phase4.py",
        "run_migrations_phase5.py",
        "run_migrations_audit_logs.py",
        "run_migrations_admin.py",
        "run_migrations_integrity.py",
    ]

    for script in scripts:
        if os.path.exists(script):
            run_script(script)
        else:
            print(f"[WARNING] Script {script} not found, skipping.")

    print("=" * 60)
    print("ALL MIGRATIONS COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    main()

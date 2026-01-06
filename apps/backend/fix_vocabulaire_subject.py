#!/usr/bin/env python3
"""
Script to fix "Vocabulaire" subject name in JSON files to match database title "Vocabulaire / Lexique"
Safe to run - creates backups before modifying files
"""

import json
import os
import shutil
from pathlib import Path

def fix_vocabulaire_subject(directory):
    """
    Update all JSON files with subject "Vocabulaire" to "Vocabulaire / Lexique"
    
    Args:
        directory: Path to directory containing JSON files
    """
    directory = Path(directory)
    
    if not directory.exists():
        print(f"❌ Error: Directory not found: {directory}")
        return
    
    # Find all JSON files
    json_files = list(directory.glob("*.json"))
    
    if not json_files:
        print(f"❌ No JSON files found in {directory}")
        return
    
    print(f"\n🔍 Found {len(json_files)} JSON files in {directory}")
    print("=" * 80)
    
    # Statistics
    files_modified = 0
    files_checked = 0
    errors = []
    
    # Create backup directory
    backup_dir = directory / "backups"
    backup_dir.mkdir(exist_ok=True)
    print(f"📁 Backup directory: {backup_dir}")
    print("=" * 80 + "\n")
    
    for json_file in sorted(json_files):
        files_checked += 1
        file_name = json_file.name
        
        try:
            # Read the JSON file
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Check if it has "Vocabulaire" as subject
            if data.get('subject') == 'Vocabulaire':
                print(f"[{files_checked}/{len(json_files)}] 🔧 Fixing: {file_name}")
                
                # Create backup
                backup_path = backup_dir / file_name
                shutil.copy2(json_file, backup_path)
                print(f"  ✓ Backup created: {backup_path.name}")
                
                # Update the subject
                data['subject'] = 'Vocabulaire / Lexique'
                
                # Write back to file
                with open(json_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                
                print(f"  ✓ Updated subject: 'Vocabulaire' → 'Vocabulaire / Lexique'")
                files_modified += 1
                
            else:
                print(f"[{files_checked}/{len(json_files)}] ⊘ Skipping: {file_name} (subject: {data.get('subject', 'N/A')})")
        
        except json.JSONDecodeError as e:
            error_msg = f"JSON decode error in {file_name}: {e}"
            print(f"  ❌ {error_msg}")
            errors.append(error_msg)
        
        except Exception as e:
            error_msg = f"Error processing {file_name}: {e}"
            print(f"  ❌ {error_msg}")
            errors.append(error_msg)
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 SUMMARY")
    print("=" * 80)
    print(f"Total files checked:   {files_checked}")
    print(f"Files modified:        {files_modified}")
    print(f"Files with errors:     {len(errors)}")
    print(f"Backups created in:    {backup_dir}")
    print("=" * 80)
    
    if files_modified > 0:
        print(f"\n✅ Successfully updated {files_modified} file(s)!")
        print(f"📁 Original files backed up to: {backup_dir}")
        print("\n🚀 You can now run:")
        print(f"   python manage.py bulk_import_activities {directory} --skip-duplicates")
    else:
        print("\n⚠️  No files needed modification (no 'Vocabulaire' subject found)")
    
    if errors:
        print(f"\n⚠️  ERRORS ({len(errors)}):")
        for error in errors:
            print(f"  • {error}")
    
    print()


def restore_from_backup(directory):
    """
    Restore files from backup (in case something went wrong)
    
    Args:
        directory: Path to directory containing JSON files
    """
    directory = Path(directory)
    backup_dir = directory / "backups"
    
    if not backup_dir.exists():
        print(f"❌ Backup directory not found: {backup_dir}")
        return
    
    backup_files = list(backup_dir.glob("*.json"))
    
    if not backup_files:
        print(f"❌ No backup files found in {backup_dir}")
        return
    
    print(f"\n🔄 Restoring {len(backup_files)} file(s) from backup...")
    print("=" * 80)
    
    restored = 0
    for backup_file in backup_files:
        try:
            target_file = directory / backup_file.name
            shutil.copy2(backup_file, target_file)
            print(f"  ✓ Restored: {backup_file.name}")
            restored += 1
        except Exception as e:
            print(f"  ❌ Failed to restore {backup_file.name}: {e}")
    
    print("=" * 80)
    print(f"✅ Restored {restored} file(s) from backup!")
    print()


if __name__ == "__main__":
    import sys
    
    print("\n" + "=" * 80)
    print("🔧 Vocabulaire Subject Name Fixer")
    print("=" * 80)
    print("This script will update 'Vocabulaire' → 'Vocabulaire / Lexique' in JSON files")
    print("Backups will be created automatically before any changes")
    print("=" * 80 + "\n")
    
    # Check command line arguments
    if len(sys.argv) < 2:
        print("Usage:")
        print("  Fix files:     python fix_vocabulaire_subject.py <directory>")
        print("  Restore files: python fix_vocabulaire_subject.py <directory> --restore")
        print()
        print("Example:")
        print("  python fix_vocabulaire_subject.py data/activities")
        print()
        sys.exit(1)
    
    directory = sys.argv[1]
    
    # Check for restore flag
    if len(sys.argv) > 2 and sys.argv[2] == '--restore':
        restore_from_backup(directory)
    else:
        fix_vocabulaire_subject(directory)

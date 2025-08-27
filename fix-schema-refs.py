#!/usr/bin/env python3
"""
Fix remaining schema reference indentation issues.
"""

import os
import re
import glob

def fix_schema_ref_indentation(filepath):
    """Fix schema $ref indentation issues."""
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Pattern to fix $ref at wrong indentation under schema
    # Looking for patterns like:
    # schema:
    # $ref: ...
    # Should be:
    # schema:
    #   $ref: ...
    pattern = r'(\s+schema:\s*\n)\s*(\$ref:.*)'
    replacement = r'\1          \2'
    
    fixed_content = re.sub(pattern, replacement, content)
    
    # Only write if content changed
    if fixed_content != content:
        with open(filepath, 'w') as f:
            f.write(fixed_content)
        print(f"Fixed schema $ref indentation: {filepath}")
        return True
    return False

def main():
    """Main function to fix schema $ref indentation issues."""
    yaml_files = glob.glob('backend/openapi/paths/**/*.yaml', recursive=True)
    
    total_fixed = 0
    for filepath in yaml_files:
        if fix_schema_ref_indentation(filepath):
            total_fixed += 1
    
    print(f"\nFixed {total_fixed} files total.")

if __name__ == '__main__':
    main()

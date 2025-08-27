#!/usr/bin/env python3

import os
import re
import glob

def fix_yaml_schema_indentation(file_path):
    """Fix YAML schema indentation in OpenAPI spec files."""
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Pattern 1: application/json with incorrectly indented schema
    # Match: application/json:\n    schema: (note extra spaces)
    # Fix: application/json:\n  schema:
    pattern1 = r'(application/json:\s*\n)(\s+)(\s+)(schema:)'
    content = re.sub(pattern1, r'\1\2\4', content, flags=re.MULTILINE)
    
    # Pattern 2: Fix schema content that's over-indented
    lines = content.split('\n')
    fixed_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Look for application/json lines
        if 'application/json:' in line:
            base_indent = len(line) - len(line.lstrip())
            fixed_lines.append(line)
            i += 1
            
            # Process the next few lines to fix schema indentation
            while i < len(lines):
                next_line = lines[i]
                
                # Empty lines - just keep them
                if not next_line.strip():
                    fixed_lines.append(next_line)
                    i += 1
                    continue
                
                next_indent = len(next_line) - len(next_line.lstrip())
                next_content = next_line.strip()
                
                # If we've moved to a line at or less indented than application/json, stop processing
                if next_indent <= base_indent:
                    break
                
                # Fix "schema:" line - should be 2 spaces more than application/json
                if next_content == 'schema:':
                    correct_indent = base_indent + 2
                    fixed_lines.append(' ' * correct_indent + 'schema:')
                    i += 1
                    continue
                
                # Fix schema content lines (type:, properties:, allOf:, $ref:, etc.)
                schema_keywords = ['type:', 'properties:', 'allOf:', '$ref:', 'items:', 'format:', 
                                 'description:', 'required:', 'enum:', 'example:', 'minimum:', 'maximum:']
                list_items = ['- $ref:', '- type:', '- properties:', '- allOf:']
                
                # Check if this is a schema content line that needs fixing
                if any(next_content.startswith(keyword) for keyword in schema_keywords + list_items):
                    # This should be 4 spaces more than application/json (2 for schema + 2 for content)
                    correct_indent = base_indent + 4
                    fixed_lines.append(' ' * correct_indent + next_content)
                    i += 1
                    continue
                
                # For other content, check if it looks like it belongs to schema and needs fixing
                if next_indent > base_indent + 4:
                    # This might be over-indented schema content
                    # Count how many levels over-indented it is and reduce by 2
                    excess_indent = next_indent - (base_indent + 4)
                    if excess_indent >= 2:
                        new_indent = next_indent - 2
                        fixed_lines.append(' ' * new_indent + next_content)
                        i += 1
                        continue
                
                # Default: keep the line as-is
                fixed_lines.append(next_line)
                i += 1
        else:
            fixed_lines.append(line)
            i += 1
    
    content = '\n'.join(fixed_lines)
    
    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"Fixed schema indentation in: {file_path}")
        return True
    else:
        return False

def main():
    # Find all YAML files in the paths directory
    yaml_files = glob.glob('/home/vboxuser/studio/backend/openapi/paths/**/*.yaml', recursive=True)
    
    total_fixed = 0
    for file_path in sorted(yaml_files):
        print(f"Processing: {file_path}")
        if fix_yaml_schema_indentation(file_path):
            total_fixed += 1
    
    print(f"\n=== Summary ===")
    print(f"Processed {len(yaml_files)} files")
    print(f"Fixed {total_fixed} files")

if __name__ == '__main__':
    main()

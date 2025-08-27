#!/usr/bin/env python3

import os
import re
import glob

def fix_yaml_schema_indentation(file_path):
    """Fix YAML schema indentation in OpenAPI spec files."""
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    original_content = content
    
    # Pattern to match incorrectly indented schema under application/json
    # This matches:
    #   application/json:
    #       schema:  (with extra spaces before schema)
    #   allOf:       (or direct schema content with extra indentation)
    
    # Fix pattern 1: Extra indented "schema:" line
    pattern1 = r'(\s+application/json:\s*\n)(\s+)(\s+)(schema:)'
    replacement1 = r'\1\2\4'
    content = re.sub(pattern1, replacement1, content, flags=re.MULTILINE)
    
    # Fix pattern 2: Schema content (like allOf) with extra indentation
    # Look for application/json followed by over-indented schema content
    pattern2 = r'(\s+application/json:\s*\n\s+schema:\s*\n)(\s+)(\s+)(allOf:|type:|properties:|\$ref:)'
    replacement2 = r'\1\2\4'
    content = re.sub(pattern2, replacement2, content, flags=re.MULTILINE)
    
    # Fix nested content within allOf, type, properties that's over-indented
    lines = content.split('\n')
    fixed_lines = []
    in_schema_block = False
    schema_base_indent = 0
    
    for i, line in enumerate(lines):
        # Track when we're in a schema block
        if 'application/json:' in line:
            in_schema_block = True
            schema_base_indent = len(line) - len(line.lstrip())
            fixed_lines.append(line)
            continue
        
        if in_schema_block and line.strip() == '':
            fixed_lines.append(line)
            continue
            
        if in_schema_block:
            current_indent = len(line) - len(line.lstrip())
            
            # If we hit a line that's at or less indented than the application/json line,
            # we're out of the schema block
            if line.strip() and current_indent <= schema_base_indent:
                in_schema_block = False
                fixed_lines.append(line)
                continue
            
            # Check if this line is "schema:" and fix its indentation
            if line.strip() == 'schema:':
                correct_indent = schema_base_indent + 2
                fixed_lines.append(' ' * correct_indent + 'schema:')
                continue
                
            # Check if this line starts with schema content keywords and fix indentation
            schema_keywords = ['allOf:', 'type:', 'properties:', '$ref:', '- $ref:', '- type:']
            line_content = line.strip()
            
            if any(line_content.startswith(keyword) for keyword in schema_keywords):
                # This should be indented relative to "schema:"
                correct_indent = schema_base_indent + 4
                fixed_lines.append(' ' * correct_indent + line_content)
                continue
        
        fixed_lines.append(line)
    
    content = '\n'.join(fixed_lines)
    
    if content != original_content:
        with open(file_path, 'w') as f:
            f.write(content)
        print(f"Fixed schema indentation in: {file_path}")
        return True
    else:
        print(f"No changes needed in: {file_path}")
        return False

def main():
    # Find all YAML files in the config directory
    config_files = glob.glob('/home/vboxuser/studio/backend/openapi/paths/config/*.yaml')
    
    total_fixed = 0
    for file_path in sorted(config_files):
        print(f"\nProcessing: {file_path}")
        if fix_yaml_schema_indentation(file_path):
            total_fixed += 1
    
    print(f"\n=== Summary ===")
    print(f"Processed {len(config_files)} files")
    print(f"Fixed {total_fixed} files")

if __name__ == '__main__':
    main()

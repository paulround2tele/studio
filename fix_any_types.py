#!/usr/bin/env python3
"""
Fix remaining 'any' types by replacing with 'unknown'
"""
import re
import os
import glob

def fix_any_types_in_file(filepath):
    """Replace common 'any' type patterns with 'unknown'"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Replace Record<string, any> with Record<string, unknown>
        content = re.sub(r'Record<([^,>]+),\s*any>', r'Record<\1, unknown>', content)
        
        # Replace Array<any> and any[] with Array<unknown> and unknown[]
        content = re.sub(r'Array<any>', 'Array<unknown>', content)
        content = re.sub(r':\s*any\[\]', ': unknown[]', content)
        
        # Replace function parameters: (param: any) => with (param: unknown) =>
        content = re.sub(r'\(([^:)]+):\s*any\)\s*=>', r'(\1: unknown) =>', content)
        
        # Replace standalone : any with : unknown
        content = re.sub(r':\s*any(?![a-zA-Z_])', ': unknown', content)
        
        # Replace as any with as unknown
        content = re.sub(r'\bas\s+any\b', 'as unknown', content)
        
        # Replace Map/WeakMap with any
        content = re.sub(r'WeakMap<any,\s*any,?\s*any>', 'WeakMap<object, unknown, unknown>', content)
        content = re.sub(r'Map<any,\s*any>', 'Map<unknown, unknown>', content)
        
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    # Target directories
    patterns = [
        'src/**/*.ts',
        'src/**/*.tsx',
        'src/**/*.js',
    ]
    
    fixed = 0
    for pattern in patterns:
        for filepath in glob.glob(pattern, recursive=True):
            # Skip node_modules
            if 'node_modules' in filepath:
                continue
            if fix_any_types_in_file(filepath):
                fixed += 1
                print(f"Fixed: {filepath}")
    
    print(f"\nFixed {fixed} files")

if __name__ == '__main__':
    main()

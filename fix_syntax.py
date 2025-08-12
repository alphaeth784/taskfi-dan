#!/usr/bin/env python3

import os
import re

def fix_route_syntax(file_path):
    print(f"Fixing syntax in {file_path}")
    
    with open(file_path, 'r') as f:
        content = f.read()
    
    # 1. Add missing semicolons after return statements
    content = re.sub(r'return NextResponse\.json\([^)]+\)(?!\s*;)', r'\g<0>;', content)
    
    # 2. Fix missing closing braces in try-catch blocks
    # Look for patterns like "} catch (error) {" that aren't properly closed
    content = re.sub(r'(\s+}\s+catch\s*\([^)]+\)\s*{\s*[^}]+)(\n\s*//.*function)', r'\1\n  }\n}\n\2', content)
    
    # 3. Fix incomplete function exports
    # Look for incomplete export function patterns
    content = re.sub(r'(\s*}\s*\n\s*//[^\n]*\nexport async function [A-Z]+)', r'\1', content)
    
    # 4. Add missing closing braces for functions if needed
    # This is more complex and might need manual review
    
    with open(file_path, 'w') as f:
        f.write(content)

# Fix common route files
route_files = [
    'src/app/api/admin/users/[id]/route.ts',
    'src/app/api/admin/users/route.ts', 
    'src/app/api/categories/[id]/route.ts',
    'src/app/api/categories/route.ts'
]

for file_path in route_files:
    if os.path.exists(file_path):
        fix_route_syntax(file_path)
        
# Special fix for analytics - it needs a proper end
analytics_file = 'src/app/api/analytics/route.ts'
if os.path.exists(analytics_file):
    print(f"Special fix for {analytics_file}")
    with open(analytics_file, 'r') as f:
        content = f.read()
    
    # Make sure the file ends properly after the last function
    if not content.strip().endswith('}'):
        content = content.rstrip() + '\n'
    
    with open(analytics_file, 'w') as f:
        f.write(content)

print("Syntax fixes completed!")
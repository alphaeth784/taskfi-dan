#!/usr/bin/env python3
"""
Fix Malformed Syntax Created by Previous Script
Specifically targets the broken patterns created by the previous syntax fixer
"""

import os
import re
from pathlib import Path

def fix_broken_return_statements(file_path):
    """Fix the specific malformed return statements created by previous script"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        fixes = []
        
        # Pattern 1: return NextResponse.json(..., return NextResponse.json({...}, {status: XXX});
        # This should become: return NextResponse.json({...}, {status: XXX});
        pattern1 = r'return\s+NextResponse\.json\(\s*\{\s*error:\s*[\'"][^\'"]*[\'"]\s*\},\s*return\s+NextResponse\.json\(\s*\{\s*error:\s*[\'"][^\'"]*[\'"]\s*\},\s*\{\s*status:\s*\d+\s*\}\s*\)\s*;'
        
        def fix_doubled_return(match):
            # Extract status code
            status_match = re.search(r'status:\s*(\d+)', match.group(0))
            status = status_match.group(1) if status_match else '500'
            fixes.append(f"Fixed doubled return statement with status {status}")
            return f'return NextResponse.json({{ error: "Internal server error" }}, {{ status: {status} }});'
        
        content = re.sub(pattern1, fix_doubled_return, content)
        
        # Pattern 2: Lines that are just "return NextResponse.json({ error: "..." }, { status: XXX });" 
        # following incomplete return statements
        lines = content.split('\n')
        new_lines = []
        i = 0
        
        while i < len(lines):
            line = lines[i]
            
            # Check for malformed return pattern
            if 'return NextResponse.json({ error: "Internal server error" }' in line and i > 0:
                # Check if previous lines have incomplete return
                prev_context = '\n'.join(lines[max(0, i-3):i])
                
                if 'return NextResponse.json(' in prev_context and '{ error:' in prev_context:
                    # This is likely a malformed continuation - replace previous incomplete return
                    j = i - 1
                    while j >= 0 and 'return NextResponse.json(' not in lines[j]:
                        j -= 1
                    
                    if j >= 0:
                        # Extract status from current line
                        status_match = re.search(r'status:\s*(\d+)', line)
                        status = status_match.group(1) if status_match else '500'
                        
                        # Remove all lines from j to i-1 and replace with clean return
                        while len(new_lines) > j:
                            new_lines.pop()
                        
                        # Add proper indentation
                        indent = '    '  # Standard 4-space indent
                        new_lines.append(f'{indent}return NextResponse.json({{ error: "Internal server error" }}, {{ status: {status} }});')
                        fixes.append(f"Consolidated malformed return statement at line {i+1}")
                        i += 1
                        continue
            
            new_lines.append(line)
            i += 1
        
        content = '\n'.join(new_lines)
        
        # Pattern 3: Fix argument expression expected errors - remove extra function calls
        # Look for return NextResponse.json( followed by return NextResponse.json on same line
        content = re.sub(
            r'return\s+NextResponse\.json\([^)]+\)\s*;?\s*return\s+NextResponse\.json\([^)]+\)\s*;',
            lambda m: re.search(r'return\s+NextResponse\.json\([^)]+\)\s*;', m.group(0)).group(0),
            content
        )
        
        # Write back if changes were made
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Fixed malformed syntax in: {file_path}")
            for fix in fixes:
                print(f"   - {fix}")
            return True
        else:
            print(f"⚪ No malformed syntax found in: {file_path}")
            return False
        
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return False

def main():
    base_path = Path("/project/workspace/alphaeth784/taskfi-dan/src/app/api")
    
    # Get all TypeScript files
    ts_files = list(base_path.rglob("*.ts"))
    
    print(f"Fixing malformed syntax in {len(ts_files)} TypeScript files...")
    print("-" * 60)
    
    fixed_count = 0
    for ts_file in ts_files:
        if fix_broken_return_statements(ts_file):
            fixed_count += 1
    
    print("-" * 60)
    print(f"Fixed malformed syntax in {fixed_count} files")

if __name__ == "__main__":
    main()
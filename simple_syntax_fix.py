#!/usr/bin/env python3
"""
Simple TypeScript Syntax Fixer
Fixes the specific syntax issues found in the codebase
"""

import os
import re
from pathlib import Path

def fix_file_syntax_issues(file_path):
    """Fix specific syntax issues in a file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        fixes = []
        
        # Fix 1: { status: XXX }; should be { status: XXX }
        pattern1 = r'(\{\s*status:\s*\d+\s*)\};'
        content = re.sub(pattern1, r'\1}', content)
        if re.search(pattern1, original_content):
            fixes.append("Fixed semicolon in status object")
        
        # Fix 2: Remove orphaned ); lines that follow NextResponse.json calls
        lines = content.split('\n')
        new_lines = []
        i = 0
        
        while i < len(lines):
            line = lines[i]
            
            # If this line is just ");", check if previous lines form a complete NextResponse.json call
            if line.strip() == ');' and i > 0:
                # Look back to see if we have a complete NextResponse.json structure
                j = i - 1
                found_return = False
                brace_count = 0
                
                while j >= 0:
                    if 'return NextResponse.json(' in lines[j]:
                        found_return = True
                        break
                    if '{' in lines[j]:
                        brace_count += lines[j].count('{')
                    if '}' in lines[j]:
                        brace_count -= lines[j].count('}')
                    j -= 1
                
                # If we found a complete return statement, this ); is probably orphaned
                if found_return and brace_count == 0:
                    fixes.append(f"Removed orphaned '); at line {i+1}")
                    i += 1
                    continue
            
            new_lines.append(line)
            i += 1
        
        content = '\n'.join(new_lines)
        
        # Fix 3: Add missing semicolon to complete return statements
        # Pattern: return NextResponse.json(...)\n  } catch
        content = re.sub(r'(return NextResponse\.json\([^;]+\))\s*\n(\s*\}\s*catch)', r'\1;\n\2', content, flags=re.MULTILINE)
        
        # Fix 4: Fix incomplete return statements - lines that just have { status: XXX }
        lines = content.split('\n')
        new_lines = []
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            
            # If line is just { status: XXX }, convert to proper return statement
            if re.match(r'^\{\s*status:\s*\d+\s*\}$', stripped):
                status_match = re.search(r'status:\s*(\d+)', stripped)
                if status_match:
                    status = status_match.group(1)
                    indent = line[:len(line) - len(line.lstrip())]
                    new_lines.append(f'{indent}return NextResponse.json({{ error: "Internal server error" }}, {{ status: {status} }});')
                    fixes.append(f"Fixed incomplete return statement at line {i+1}")
                    continue
            
            new_lines.append(line)
        
        content = '\n'.join(new_lines)
        
        # Write back if changes were made
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Fixed {len(fixes)} issues in: {file_path}")
            for fix in fixes:
                print(f"   - {fix}")
            return True
        else:
            print(f"⚪ No issues found in: {file_path}")
            return False
        
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return False

def main():
    base_path = Path("/project/workspace/alphaeth784/taskfi-dan/src/app/api")
    
    # Get all TypeScript files
    ts_files = list(base_path.rglob("*.ts"))
    
    print(f"Processing {len(ts_files)} TypeScript files...")
    print("-" * 50)
    
    fixed_count = 0
    for ts_file in ts_files:
        if fix_file_syntax_issues(ts_file):
            fixed_count += 1
    
    print("-" * 50)
    print(f"Fixed issues in {fixed_count} files")

if __name__ == "__main__":
    main()
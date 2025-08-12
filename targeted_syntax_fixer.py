#!/usr/bin/env python3
"""
Targeted TypeScript Syntax Fixer
Fixes specific syntax patterns that were incorrectly modified
"""

import os
import re
from pathlib import Path

class TargetedSyntaxFixer:
    def __init__(self, base_path):
        self.base_path = Path(base_path)
        self.fixes_applied = []
    
    def fix_broken_return_statements(self, content, file_path):
        """Fix broken NextResponse return statements"""
        fixes = []
        
        # Pattern 1: { status: XXX }; followed by ); 
        # This should be: return NextResponse.json(error: { message }, { status: XXX });
        pattern1 = r'\s*\{\s*status:\s*(\d+)\s*\};\s*\n\s*\);'
        def fix_return_pattern1(match):
            status = match.group(1)
            fixes.append(f"Fixed broken return statement with status {status}")
            return f'\n      return NextResponse.json({{ error: "Internal server error" }}, {{ status: {status} }});'
        
        content = re.sub(pattern1, fix_return_pattern1, content, flags=re.MULTILINE)
        
        # Pattern 2: Looking for orphaned }) lines that should be return statements
        lines = content.split('\n')
        new_lines = []
        i = 0
        
        while i < len(lines):
            line = lines[i]
            
            # Check if this line is just closing braces/parentheses
            if re.match(r'\s*\}\s*\)\s*$', line.strip()) and i > 0:
                # Check previous lines for context
                prev_line = lines[i-1] if i > 0 else ""
                
                # If previous line looks like it should be a return statement
                if any(keyword in prev_line for keyword in ['{ status:', 'error', 'message']):
                    # Skip this line - it's probably an orphaned closing
                    fixes.append(f"Removed orphaned closing at line {i+1}")
                    i += 1
                    continue
            
            # Check for lines that look like incomplete return statements
            if re.match(r'\s*\{\s*status:\s*\d+\s*\}\s*;?\s*$', line.strip()):
                status_match = re.search(r'status:\s*(\d+)', line)
                if status_match:
                    status = status_match.group(1)
                    new_lines.append(f'      return NextResponse.json({{ error: "Internal server error" }}, {{ status: {status} }});')
                    fixes.append(f"Fixed incomplete return statement at line {i+1}")
                    i += 1
                    continue
            
            new_lines.append(line)
            i += 1
        
        if fixes:
            self.fixes_applied.append({"file": str(file_path), "fixes": fixes})
            return '\n'.join(new_lines)
        
        return content
    
    def fix_malformed_try_catch_blocks(self, content, file_path):
        """Fix malformed try-catch block structures"""
        fixes = []
        lines = content.split('\n')
        new_lines = []
        i = 0
        
        while i < len(lines):
            line = lines[i]
            
            # Look for orphaned catch blocks
            if re.match(r'\s*\}\s*catch\s*\(\s*error\s*\)\s*\{', line.strip()):
                # Find the corresponding try block above
                try_found = False
                j = i - 1
                brace_count = 0
                
                while j >= 0:
                    if '{' in lines[j]:
                        brace_count += lines[j].count('{')
                    if '}' in lines[j]:
                        brace_count -= lines[j].count('}')
                    
                    if 'try {' in lines[j]:
                        try_found = True
                        break
                    
                    # If we find a function declaration, insert try block
                    if ('async function' in lines[j] or 'export async function' in lines[j]) and brace_count == 0:
                        # Insert try block after the function declaration
                        for k in range(j + 1, i):
                            if '{' in lines[k] and 'try' not in lines[k]:
                                lines[k] = lines[k].replace('{', '{\n  try {')
                                try_found = True
                                fixes.append(f"Added missing try block after function at line {k+1}")
                                break
                        break
                    j -= 1
                
                # Convert } catch to } } catch
                if try_found:
                    line = line.replace('} catch', '  } catch')
            
            new_lines.append(line)
            i += 1
        
        if fixes:
            self.fixes_applied.append({"file": str(file_path), "fixes": fixes})
            return '\n'.join(new_lines)
        
        return content
    
    def fix_missing_return_keyword(self, content, file_path):
        """Add missing 'return' keywords to response statements"""
        fixes = []
        
        # Pattern: NextResponse.json without return
        pattern = r'^(\s+)NextResponse\.json\('
        def add_return(match):
            indent = match.group(1)
            fixes.append("Added missing 'return' keyword")
            return f"{indent}return NextResponse.json("
        
        content = re.sub(pattern, add_return, content, flags=re.MULTILINE)
        
        if fixes:
            self.fixes_applied.append({"file": str(file_path), "fixes": fixes})
        
        return content
    
    def fix_missing_closing_braces(self, content, file_path):
        """Fix missing closing braces for functions"""
        fixes = []
        lines = content.split('\n')
        
        # Count braces to see if we need closing braces
        open_braces = 0
        for line in lines:
            open_braces += line.count('{')
            open_braces -= line.count('}')
        
        # Add missing closing braces if needed
        if open_braces > 0:
            for _ in range(open_braces):
                lines.append('}')
            fixes.append(f"Added {open_braces} missing closing braces")
        
        if fixes:
            self.fixes_applied.append({"file": str(file_path), "fixes": fixes})
        
        return '\n'.join(lines)
    
    def fix_file(self, file_path):
        """Apply all targeted fixes to a single file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Apply fixes in order
            content = self.fix_broken_return_statements(content, file_path)
            content = self.fix_missing_return_keyword(content, file_path)
            content = self.fix_malformed_try_catch_blocks(content, file_path)
            content = self.fix_missing_closing_braces(content, file_path)
            
            # Only write if changes were made
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ Fixed: {file_path}")
                return True
            else:
                print(f"⚪ No changes needed: {file_path}")
                return False
        
        except Exception as e:
            print(f"❌ Error fixing {file_path}: {e}")
            return False
    
    def fix_all_files(self, file_list):
        """Fix specific list of files with known errors"""
        fixed_count = 0
        
        for file_path in file_list:
            if self.fix_file(file_path):
                fixed_count += 1
        
        print(f"Fixed {fixed_count} files out of {len(file_list)}")

# Known problematic files from TypeScript output
problematic_files = [
    "/project/workspace/alphaeth784/taskfi-dan/src/app/api/admin/dashboard/route.ts",
    "/project/workspace/alphaeth784/taskfi-dan/src/app/api/admin/users/route.ts",
    "/project/workspace/alphaeth784/taskfi-dan/src/app/api/admin/users/[id]/route.ts",
    "/project/workspace/alphaeth784/taskfi-dan/src/app/api/analytics/route.ts",
    "/project/workspace/alphaeth784/taskfi-dan/src/app/api/categories/route.ts",
    "/project/workspace/alphaeth784/taskfi-dan/src/app/api/categories/[id]/route.ts",
    "/project/workspace/alphaeth784/taskfi-dan/src/app/api/gigs/route.ts",
    "/project/workspace/alphaeth784/taskfi-dan/src/app/api/gigs/[id]/route.ts",
    "/project/workspace/alphaeth784/taskfi-dan/src/app/api/gigs/[id]/order/route.ts",
    "/project/workspace/alphaeth784/taskfi-dan/src/app/api/gigs/[id]/purchase/route.ts",
]

def main():
    base_path = "/project/workspace/alphaeth784/taskfi-dan"
    fixer = TargetedSyntaxFixer(base_path)
    
    print("Applying targeted syntax fixes...")
    fixer.fix_all_files(problematic_files)

if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""
Precise Try-Catch Block Fixer
Specifically fixes missing try blocks before existing catch blocks
"""

import re
from pathlib import Path

class TryCatchFixer:
    def __init__(self, base_path):
        self.base_path = Path(base_path)
        self.fixes_applied = []
    
    def fix_missing_try_blocks(self, content, file_path):
        """Add missing try blocks before existing catch blocks"""
        fixes = []
        lines = content.split('\n')
        new_lines = []
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Look for orphaned } catch (error) { patterns
            if re.search(r'^\s*\}\s*catch\s*\(\s*error\s*\)\s*\{', line.strip()):
                # This catch block needs a try block
                # Look backwards to find where the try should start
                j = i - 1
                try_insertion_point = None
                
                # Look for the start of a logical block (usually after function declaration)
                while j >= 0:
                    line_content = lines[j].strip()
                    
                    # Look for patterns that indicate where try should start
                    if ('const body = await request.json()' in lines[j] or
                        'const session = await getServerSession' in lines[j] or
                        'if (!session)' in lines[j] or
                        'const params = await props.params' in lines[j]):
                        try_insertion_point = j
                        break
                    
                    # If we hit a function declaration, try block should be after the opening brace
                    if 'export async function' in lines[j] and '{' in lines[j]:
                        try_insertion_point = j + 1
                        break
                    elif 'export async function' in lines[j]:
                        # Function declaration without opening brace, look for the brace
                        k = j + 1
                        while k < i and '{' not in lines[k]:
                            k += 1
                        if k < i:
                            try_insertion_point = k + 1
                            break
                    
                    j -= 1
                
                if try_insertion_point is not None:
                    # Insert try block at the determined point
                    # Get the indentation from the insertion point
                    indent_line = lines[try_insertion_point]
                    indent = len(indent_line) - len(indent_line.lstrip())
                    
                    # Insert the try block
                    new_lines = new_lines[:try_insertion_point] + [
                        ' ' * indent + 'try {'
                    ] + new_lines[try_insertion_point:]
                    
                    # Adjust the catch line to have proper closing brace for try
                    line = line.replace('} catch', '  } catch')
                    
                    fixes.append(f"Added missing try block before catch at line {i+1}")
                else:
                    # Fallback - just add try block right before this line
                    indent = len(line) - len(line.lstrip())
                    new_lines.append(' ' * indent + 'try {')
                    line = line.replace('} catch', '  } catch')
                    fixes.append(f"Added fallback try block for catch at line {i+1}")
            
            # Look for lines that are just catch blocks without proper structure
            elif re.search(r'^\s*catch\s*\(\s*error\s*\)\s*\{', line.strip()):
                # This is a standalone catch - needs both closing brace for try and proper structure
                indent = len(line) - len(line.lstrip())
                new_lines.append(' ' * indent + '} catch (error) {')
                fixes.append(f"Fixed standalone catch block at line {i+1}")
                i += 1
                continue
            
            new_lines.append(line)
            i += 1
        
        if fixes:
            self.fixes_applied.append({"file": str(file_path), "fixes": fixes})
            return '\n'.join(new_lines)
        
        return content
    
    def fix_malformed_return_statements(self, content, file_path):
        """Fix specific malformed return statement patterns"""
        fixes = []
        
        # Fix: return NextResponse.json({ applications, stats }) - missing semicolon
        pattern = r'(\s+return\s+NextResponse\.json\(\s*\{\s*[^}]+\s*\}\s*\))\s*\n(\s*\}\s*catch)'
        def add_semicolon(match):
            return_part = match.group(1)
            catch_part = match.group(2)
            fixes.append("Added missing semicolon to return statement")
            return f"{return_part};\n{catch_part}"
        
        content = re.sub(pattern, add_semicolon, content, flags=re.MULTILINE)
        
        # Fix: return NextResponse.json({ escrow: escrowInfo })
        pattern2 = r'(\s+return\s+NextResponse\.json\(\s*\{\s*[^}]+:\s*[^}]+\s*\}\s*\))\s*\n(\s*\}\s*catch)'
        content = re.sub(pattern2, add_semicolon, content, flags=re.MULTILINE)
        
        if fixes:
            self.fixes_applied.append({"file": str(file_path), "fixes": fixes})
        
        return content
    
    def fix_file(self, file_path):
        """Fix a single file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Apply fixes
            content = self.fix_missing_try_blocks(content, file_path)
            content = self.fix_malformed_return_statements(content, file_path)
            
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True
            return False
        
        except Exception as e:
            print(f"❌ Error fixing {file_path}: {e}")
            return False

def main():
    base_path = "/project/workspace/alphaeth784/taskfi-dan"
    fixer = TryCatchFixer(base_path)
    
    # Focus on files with remaining errors
    problem_files = [
        "src/app/api/categories/[id]/route.ts",
        "src/app/api/gigs/[id]/route.ts",
        "src/app/api/gigs/[id]/purchase/route.ts",
        "src/app/api/jobs/[id]/applications/[applicationId]/route.ts",
        "src/app/api/jobs/[id]/applications/route.ts",
        "src/app/api/jobs/[id]/route.ts",
        "src/app/api/payments/[id]/route.ts",
        "src/app/api/payments/[id]/escrow/route.ts",
        "src/app/api/users/[id]/route.ts",
    ]
    
    print("Fixing try-catch block issues in problematic files...")
    print("-" * 60)
    
    fixed_count = 0
    for file_rel_path in problem_files:
        file_path = Path(base_path) / file_rel_path
        if file_path.exists():
            if fixer.fix_file(file_path):
                print(f"✅ Fixed: {file_rel_path}")
                fixed_count += 1
            else:
                print(f"⚪ No changes: {file_rel_path}")
        else:
            print(f"❌ File not found: {file_rel_path}")
    
    print("-" * 60)
    print(f"Fixed {fixed_count} files")
    
    # Save report
    import json
    with open(f"{base_path}/try_catch_fixes_report.json", 'w') as f:
        json.dump(fixer.fixes_applied, f, indent=2)

if __name__ == "__main__":
    main()
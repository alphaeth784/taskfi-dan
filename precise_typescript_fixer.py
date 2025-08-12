#!/usr/bin/env python3
"""
Precise TypeScript Error Fixer
Carefully fixes only the specific syntax errors identified by TypeScript compiler
"""

import os
import re
from pathlib import Path

class PreciseTypescriptFixer:
    def __init__(self, base_path):
        self.base_path = Path(base_path)
        self.fixes_applied = []
    
    def fix_malformed_return_statements(self, content, file_path):
        """Fix specific malformed return statements identified in TS errors"""
        fixes = []
        lines = content.split('\n')
        new_lines = []
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Pattern: return NextResponse.json({ error: "..." }, { status: XXX });
            # This is a doubled return statement that needs to be cleaned up
            if 'return NextResponse.json({ error: "Internal server error" }, { status:' in line and i > 0:
                # Check if previous lines form part of a return statement
                prev_line = lines[i-1]
                if '{ error:' in prev_line or 'return NextResponse.json(' in prev_line:
                    # This is a duplicate - replace the malformed section with proper closure
                    # Look back to find the start of the return statement
                    j = i - 1
                    while j >= 0 and 'return NextResponse.json(' not in lines[j]:
                        j -= 1
                    
                    if j >= 0:
                        # Extract status code from current line
                        status_match = re.search(r'status:\s*(\d+)', line)
                        status = status_match.group(1) if status_match else '500'
                        
                        # Replace everything from return statement to current line
                        new_return = f'    return NextResponse.json({{ error: "Internal server error" }}, {{ status: {status} }});'
                        
                        # Remove the malformed lines
                        while len(new_lines) > j:
                            new_lines.pop()
                        
                        new_lines.append(new_return)
                        fixes.append(f"Fixed malformed return statement at line {i+1}")
                        i += 1
                        continue
            
            new_lines.append(line)
            i += 1
        
        if fixes:
            self.fixes_applied.append({"file": str(file_path), "fixes": fixes})
            return '\n'.join(new_lines)
        
        return content
    
    def fix_missing_semicolons_precise(self, content, file_path):
        """Fix only missing semicolons that cause compilation errors"""
        fixes = []
        
        # Fix specific pattern: return NextResponse.json(...) without semicolon before } catch
        pattern = r'(\s+return\s+NextResponse\.json\([^;]+\))\s*\n(\s*\}\s*catch)'
        def add_semicolon(match):
            return_stmt = match.group(1)
            catch_part = match.group(2)
            fixes.append("Added missing semicolon before catch block")
            return f"{return_stmt};\n{catch_part}"
        
        content = re.sub(pattern, add_semicolon, content, flags=re.MULTILINE)
        
        # Fix pattern: walletBalance: Math.max(0, walletBalance); (should be comma)
        if 'walletBalance: Math.max(0, walletBalance);' in content:
            content = content.replace('walletBalance: Math.max(0, walletBalance);', 
                                    'walletBalance: Math.max(0, walletBalance),')
            fixes.append("Fixed semicolon to comma in object property")
        
        if fixes:
            self.fixes_applied.append({"file": str(file_path), "fixes": fixes})
        
        return content
    
    def fix_orphaned_catch_blocks(self, content, file_path):
        """Fix orphaned catch blocks by adding missing try statements"""
        fixes = []
        lines = content.split('\n')
        new_lines = []
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Look for } catch (error) { pattern that might be orphaned
            if re.match(r'\s*\}\s*catch\s*\(\s*error\s*\)\s*\{', line.strip()):
                # Look back to see if there's a corresponding try block
                j = i - 1
                found_try = False
                brace_count = 1  # Starting with 1 because we saw the closing brace
                
                while j >= 0:
                    if '{' in lines[j]:
                        brace_count -= lines[j].count('{')
                    if '}' in lines[j] and j != i:
                        brace_count += lines[j].count('}')
                    
                    if 'try {' in lines[j] and brace_count <= 0:
                        found_try = True
                        break
                    
                    # If we hit a function declaration without finding try, we need to add it
                    if ('export async function' in lines[j] or 'async function' in lines[j]) and brace_count <= 0:
                        # Find where to insert try block
                        k = j + 1
                        while k < i and not ('{' in lines[k] and 'try' not in lines[k]):
                            k += 1
                        
                        if k < i:
                            # Insert try block
                            indent = len(lines[k]) - len(lines[k].lstrip())
                            new_lines = new_lines[:k] + [lines[k].replace('{', '{\n' + ' ' * (indent + 2) + 'try {')] + new_lines[k+1:]
                            found_try = True
                            fixes.append(f"Added missing try block at line {k+1}")
                        break
                    j -= 1
                
                if found_try:
                    # Convert } catch to  } } catch (add extra closing brace for try block)
                    line = line.replace('} catch', '  } } catch', 1)
                    fixes.append(f"Fixed orphaned catch block at line {i+1}")
            
            new_lines.append(line)
            i += 1
        
        if fixes:
            self.fixes_applied.append({"file": str(file_path), "fixes": fixes})
            return '\n'.join(new_lines)
        
        return content
    
    def fix_file_carefully(self, file_path):
        """Apply only necessary fixes to avoid breaking working code"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Apply fixes in careful order
            content = self.fix_malformed_return_statements(content, file_path)
            content = self.fix_missing_semicolons_precise(content, file_path)
            content = self.fix_orphaned_catch_blocks(content, file_path)
            
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

def main():
    base_path = "/project/workspace/alphaeth784/taskfi-dan"
    fixer = PreciseTypescriptFixer(base_path)
    
    # Get all TypeScript files in API routes
    api_path = Path(base_path) / "src" / "app" / "api"
    ts_files = list(api_path.rglob("*.ts"))
    
    print(f"Applying precise fixes to {len(ts_files)} TypeScript files...")
    print("-" * 60)
    
    fixed_count = 0
    for file_path in ts_files:
        if fixer.fix_file_carefully(file_path):
            fixed_count += 1
    
    print("-" * 60)
    print(f"Fixed {fixed_count} files out of {len(ts_files)}")
    
    # Save detailed report
    import json
    with open(f"{base_path}/precise_fixes_report.json", 'w') as f:
        json.dump(fixer.fixes_applied, f, indent=2)
    
    print(f"Detailed fix report saved to: precise_fixes_report.json")

if __name__ == "__main__":
    main()
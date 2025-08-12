#!/usr/bin/env python3
"""
Final TypeScript Error Fixer
Addresses the remaining specific syntax patterns causing compilation errors
"""

import re
from pathlib import Path

class FinalTypeScriptFixer:
    def __init__(self, base_path):
        self.base_path = Path(base_path)
        self.fixes_applied = []
    
    def fix_orphaned_catch_blocks(self, content, file_path):
        """Fix orphaned catch blocks by adding proper try structure"""
        fixes = []
        lines = content.split('\n')
        new_lines = []
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Look for } catch (error) { pattern
            if re.search(r'^\s*\}\s*catch\s*\(\s*error\s*\)\s*\{', line):
                # Need to add try block - look back for function start
                j = i - 1
                function_found = False
                brace_count = 0
                
                while j >= 0:
                    if 'export async function' in lines[j] or 'async function' in lines[j]:
                        # Find the opening brace of this function
                        k = j
                        while k <= i and '{' not in lines[k]:
                            k += 1
                        
                        if k <= i:
                            # Insert try block right after the function's opening brace
                            func_brace_line = lines[k]
                            indent = len(func_brace_line) - len(func_brace_line.lstrip())
                            
                            # Replace the function's opening brace line
                            lines[k] = func_brace_line.replace('{', '{\n' + ' ' * (indent + 2) + 'try {')
                            
                            # Now fix the current catch line - add closing brace for try
                            line = line.replace('} catch', '  } catch')
                            fixes.append(f"Added try block for orphaned catch at line {i+1}")
                            function_found = True
                            break
                    j -= 1
                
                if not function_found:
                    # If we can't find function, just add try above
                    indent = len(line) - len(line.lstrip())
                    new_lines.append(' ' * indent + 'try {')
                    line = line.replace('} catch', '  } catch')
                    fixes.append(f"Added standalone try block for catch at line {i+1}")
            
            # Fix missing semicolons in return statements
            elif 'return NextResponse.json(' in line and not line.rstrip().endswith(';'):
                if i + 1 < len(lines) and ('} catch' in lines[i + 1] or 'catch (' in lines[i + 1]):
                    line = line.rstrip() + ';'
                    fixes.append(f"Added missing semicolon at line {i+1}")
            
            new_lines.append(line)
            i += 1
        
        if fixes:
            self.fixes_applied.append({"file": str(file_path), "fixes": fixes})
            return '\n'.join(new_lines)
        
        return content
    
    def fix_missing_return_statements(self, content, file_path):
        """Fix missing return statements in API handlers"""
        fixes = []
        
        # Pattern: return NextResponse.json({ applications, stats }) without semicolon
        content = re.sub(
            r'(\s+return\s+NextResponse\.json\([^;]+\))\s*\n(\s*\}\s*catch)',
            r'\1;\n\2',
            content,
            flags=re.MULTILINE
        )
        
        # Pattern: return NextResponse.json({ escrow: escrowInfo }) without semicolon
        if re.search(r'return\s+NextResponse\.json\([^;]+\)\s*\n\s*\}\s*catch', content):
            fixes.append("Fixed missing semicolon in return statement")
        
        if fixes:
            self.fixes_applied.append({"file": str(file_path), "fixes": fixes})
        
        return content
    
    def fix_orphaned_braces(self, content, file_path):
        """Remove orphaned closing braces that cause declaration errors"""
        fixes = []
        lines = content.split('\n')
        new_lines = []
        
        i = 0
        while i < len(lines):
            line = lines[i]
            stripped = line.strip()
            
            # Look for lines that are just closing braces or parentheses
            if stripped in [')', ');', '}', '});'] and i > 0:
                # Check context - if this looks like an orphaned closer, remove it
                prev_line = lines[i-1].strip() if i > 0 else ''
                
                # If previous line ends with semicolon and this is just a closer, likely orphaned
                if prev_line.endswith(';') and stripped in [')', ');']:
                    fixes.append(f"Removed orphaned closing at line {i+1}")
                    i += 1
                    continue
            
            new_lines.append(line)
            i += 1
        
        if fixes:
            self.fixes_applied.append({"file": str(file_path), "fixes": fixes})
            return '\n'.join(new_lines)
        
        return content
    
    def fix_missing_closing_braces(self, content, file_path):
        """Add missing closing braces for functions"""
        fixes = []
        lines = content.split('\n')
        
        # Simple brace counting
        open_braces = 0
        close_braces = 0
        
        for line in lines:
            open_braces += line.count('{')
            close_braces += line.count('}')
        
        # If we have more opening braces than closing, add closing braces
        missing_braces = open_braces - close_braces
        if missing_braces > 0:
            for _ in range(missing_braces):
                lines.append('}')
            fixes.append(f"Added {missing_braces} missing closing braces")
        
        if fixes:
            self.fixes_applied.append({"file": str(file_path), "fixes": fixes})
            return '\n'.join(lines)
        
        return content
    
    def fix_file(self, file_path):
        """Apply all final fixes to a file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Apply fixes in order
            content = self.fix_orphaned_catch_blocks(content, file_path)
            content = self.fix_missing_return_statements(content, file_path)
            content = self.fix_orphaned_braces(content, file_path)
            content = self.fix_missing_closing_braces(content, file_path)
            
            # Write back if changed
            if content != original_content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ Fixed: {file_path}")
                return True
            else:
                print(f"⚪ No changes: {file_path}")
                return False
        
        except Exception as e:
            print(f"❌ Error: {file_path}: {e}")
            return False
    
    def fix_all_api_files(self):
        """Fix all API route files"""
        api_path = self.base_path / "src" / "app" / "api"
        ts_files = list(api_path.rglob("*.ts"))
        
        print(f"Applying final fixes to {len(ts_files)} TypeScript files...")
        print("-" * 60)
        
        fixed_count = 0
        for file_path in ts_files:
            if self.fix_file(file_path):
                fixed_count += 1
        
        print("-" * 60)
        print(f"Applied fixes to {fixed_count} files")
        
        # Save report
        import json
        with open(self.base_path / "final_fixes_report.json", 'w') as f:
            json.dump(self.fixes_applied, f, indent=2)

def main():
    base_path = "/project/workspace/alphaeth784/taskfi-dan"
    fixer = FinalTypeScriptFixer(base_path)
    fixer.fix_all_api_files()

if __name__ == "__main__":
    main()
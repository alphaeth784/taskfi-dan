#!/usr/bin/env python3
"""
Comprehensive TypeScript Syntax Fixer
Systematically fixes common syntax errors in TaskFi API routes
"""

import os
import re
import json
from pathlib import Path

class TypeScriptSyntaxFixer:
    def __init__(self, base_path):
        self.base_path = Path(base_path)
        self.fixes_applied = []
    
    def fix_missing_semicolons(self, content, file_path):
        """Fix missing semicolons in return statements"""
        fixes = []
        
        # Pattern: return NextResponse.json(...) without semicolon at end
        pattern = r'(\s+return\s+NextResponse\.json\([^;]+)\)(\s*\n)'
        def replace_semicolon(match):
            before = match.group(1)
            after = match.group(2)
            fixes.append(f"Added semicolon to return statement")
            return f"{before});{after}"
        
        content = re.sub(pattern, replace_semicolon, content, flags=re.MULTILINE)
        
        # Pattern: }, { status: XXX }) without semicolon
        pattern2 = r'(\s*\},\s*\{\s*status:\s*\d+\s*\})(\s*\n)'
        def replace_status_semicolon(match):
            before = match.group(1)
            after = match.group(2)
            fixes.append(f"Added semicolon to status return")
            return f"{before};{after}"
        
        content = re.sub(pattern2, replace_status_semicolon, content, flags=re.MULTILINE)
        
        # Pattern: walletBalance: Math.max(0, walletBalance); (fix incorrect semicolon)
        content = re.sub(r'walletBalance:\s*Math\.max\(0,\s*walletBalance\);', 
                        'walletBalance: Math.max(0, walletBalance),', content)
        
        if fixes:
            self.fixes_applied.append({"file": str(file_path), "fixes": fixes})
        
        return content
    
    def fix_missing_function_braces(self, content, file_path):
        """Fix missing closing braces for functions"""
        lines = content.split('\n')
        fixes = []
        
        # Track brace balance
        brace_stack = []
        function_starts = []
        
        for i, line in enumerate(lines):
            # Find function declarations
            if 'export async function' in line or 'async function' in line:
                function_starts.append(i)
            
            # Count braces
            open_braces = line.count('{')
            close_braces = line.count('}')
            
            for _ in range(open_braces):
                brace_stack.append(i)
            
            for _ in range(close_braces):
                if brace_stack:
                    brace_stack.pop()
        
        # If we have unmatched braces and function starts, add closing braces
        if brace_stack and function_starts:
            # Add missing closing braces at the end
            missing_braces = len(brace_stack)
            if missing_braces > 0:
                lines.append('')
                for _ in range(missing_braces):
                    lines.append('}')
                fixes.append(f"Added {missing_braces} missing closing braces")
        
        if fixes:
            self.fixes_applied.append({"file": str(file_path), "fixes": fixes})
        
        return '\n'.join(lines)
    
    def fix_malformed_try_catch(self, content, file_path):
        """Fix malformed try-catch blocks"""
        fixes = []
        lines = content.split('\n')
        
        i = 0
        while i < len(lines):
            line = lines[i]
            
            # Look for orphaned catch blocks
            if re.match(r'\s*\}\s*catch\s*\(\s*error\s*\)\s*\{', line.strip()):
                # Find the previous try block or add one
                j = i - 1
                found_try = False
                
                while j >= 0:
                    if 'try {' in lines[j]:
                        found_try = True
                        break
                    j -= 1
                
                if not found_try:
                    # Insert a try block before this catch
                    try_line = "  try {"
                    lines.insert(i, try_line)
                    fixes.append(f"Added missing try block at line {i+1}")
                    i += 1  # Adjust index due to insertion
            
            i += 1
        
        if fixes:
            self.fixes_applied.append({"file": str(file_path), "fixes": fixes})
        
        return '\n'.join(lines)
    
    def fix_incomplete_functions(self, content, file_path):
        """Fix incomplete function declarations and structures"""
        fixes = []
        
        # Fix export function with missing try block
        pattern = r'(export async function \w+\([^)]*\)\s*\{)\s*(\n\s*if\s*\()'
        def add_try_block(match):
            func_start = match.group(1)
            if_statement = match.group(2)
            fixes.append("Added missing try block after function declaration")
            return f"{func_start}\n  try {{{if_statement}"
        
        content = re.sub(pattern, add_try_block, content, flags=re.MULTILINE)
        
        if fixes:
            self.fixes_applied.append({"file": str(file_path), "fixes": fixes})
        
        return content
    
    def fix_file(self, file_path):
        """Apply all fixes to a single file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            # Apply fixes in order
            content = self.fix_missing_semicolons(content, file_path)
            content = self.fix_malformed_try_catch(content, file_path)
            content = self.fix_incomplete_functions(content, file_path)
            content = self.fix_missing_function_braces(content, file_path)
            
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
    
    def fix_all_api_routes(self):
        """Fix all API route files"""
        api_path = self.base_path / "src" / "app" / "api"
        if not api_path.exists():
            print(f"API path not found: {api_path}")
            return
        
        # Get all TypeScript files in API routes
        ts_files = list(api_path.rglob("*.ts"))
        
        print(f"Found {len(ts_files)} TypeScript files in API routes")
        print("-" * 50)
        
        fixed_count = 0
        for file_path in ts_files:
            if self.fix_file(file_path):
                fixed_count += 1
        
        print("-" * 50)
        print(f"Fixed {fixed_count} files out of {len(ts_files)}")
        
        # Save fix report
        with open(self.base_path / "syntax_fixes_report.json", 'w') as f:
            json.dump(self.fixes_applied, f, indent=2)
        
        print(f"Fix report saved to: syntax_fixes_report.json")

def main():
    base_path = "/project/workspace/alphaeth784/taskfi-dan"
    fixer = TypeScriptSyntaxFixer(base_path)
    fixer.fix_all_api_routes()

if __name__ == "__main__":
    main()
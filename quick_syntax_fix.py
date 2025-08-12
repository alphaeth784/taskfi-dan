#!/usr/bin/env python3
import re
import os

def fix_specific_files():
    """Fix specific known syntax issues in problematic files"""
    
    fixes = [
        # Analytics route - remove duplicate closing brace
        {
            'file': 'src/app/api/analytics/route.ts',
            'action': 'ensure_single_end_brace'
        },
        
        # Categories ID route - fix the PUT function syntax
        {
            'file': 'src/app/api/categories/[id]/route.ts',
            'action': 'fix_put_function_end'
        },
        
        # Gigs purchase route - fix missing semicolon and brace
        {
            'file': 'src/app/api/gigs/[id]/purchase/route.ts',
            'action': 'fix_return_semicolon'
        },
        
        # Gigs ID route - fix missing function end
        {
            'file': 'src/app/api/gigs/[id]/route.ts',
            'action': 'fix_get_function_end'
        },
        
        # Jobs applications applicationId route
        {
            'file': 'src/app/api/jobs/[id]/applications/[applicationId]/route.ts',
            'action': 'fix_get_function_end'
        }
    ]
    
    for fix in fixes:
        file_path = fix['file']
        full_path = f"/project/workspace/alphaeth784/taskfi-dan/{file_path}"
        
        if not os.path.exists(full_path):
            print(f"⚠️  File not found: {full_path}")
            continue
            
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            original_content = content
            
            if fix['action'] == 'ensure_single_end_brace':
                # Remove duplicate closing braces at end
                content = content.rstrip()
                while content.endswith('}\n}') or content.endswith('}}\n') or content.endswith('}}'):
                    content = content[:-1].rstrip()
                if not content.endswith('}'):
                    content += '\n}'
                content += '\n'
                    
            elif fix['action'] == 'fix_put_function_end':
                # Add missing closing brace before PUT function
                pattern = r'(\s*return NextResponse\.json\({ category }\);)\s*(\} catch \(error\))'
                if re.search(pattern, content):
                    content = re.sub(pattern, r'\1\n  \2', content)
                    
            elif fix['action'] == 'fix_return_semicolon':
                # Fix missing semicolons and braces
                pattern = r'(\}, \{ status: 201 \})\s*(\} catch \(error\))'
                if re.search(pattern, content):
                    content = re.sub(pattern, r'\1;\n  \2', content)
                    
            elif fix['action'] == 'fix_get_function_end':
                # Fix missing closing braces for GET functions
                lines = content.split('\n')
                new_lines = []
                i = 0
                while i < len(lines):
                    line = lines[i]
                    new_lines.append(line)
                    
                    # Look for pattern where catch block ends but function doesn't close
                    if (line.strip() == '}' and i < len(lines) - 2 and 
                        lines[i + 1].strip() == '' and 
                        lines[i + 2].strip().startswith('// ') and
                        'export async function' in lines[i + 3] if i + 3 < len(lines) else False):
                        # Add missing function closing brace
                        new_lines.append('}')
                    
                    i += 1
                
                content = '\n'.join(new_lines)
            
            if content != original_content:
                with open(full_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"✅ Fixed: {file_path}")
            else:
                print(f"✓ No changes needed: {file_path}")
                
        except Exception as e:
            print(f"❌ Error fixing {file_path}: {e}")

def main():
    print("🔧 Quick Syntax Fix for TaskFi")
    print("=" * 40)
    fix_specific_files()
    print("\n✅ Quick fixes completed!")

if __name__ == "__main__":
    main()
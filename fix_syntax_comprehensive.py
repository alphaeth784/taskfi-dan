#!/usr/bin/env python3
"""
Comprehensive syntax fixer for TaskFi API routes.
Fixes missing braces, semicolons, and other syntax issues.
"""

import os
import re
import sys
from typing import List, Dict, Tuple

def fix_api_route(file_path: str) -> bool:
    """Fix syntax issues in a single API route file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Common fixes
        fixes_applied = []
        
        # 1. Fix missing closing braces after return statements before new function definitions
        pattern1 = r'(\s*return NextResponse\.json\([^}]+\))\s*\n\s*//\s*(GET|POST|PUT|DELETE|[A-Z])'
        if re.search(pattern1, content):
            content = re.sub(pattern1, r'\1\n  }\n}\n\n// \2', content)
            fixes_applied.append("Fixed missing closing braces before function definitions")
        
        # 2. Fix missing closing braces after catch blocks
        pattern2 = r'(\s*return NextResponse\.json\([^}]+\)\s*)\n(\s*}\s*)\n\s*(// [A-Z]|export async function)'
        if re.search(pattern2, content):
            content = re.sub(pattern2, r'\1\n\2}\n\n\3', content)
            fixes_applied.append("Fixed missing closing braces after catch blocks")
        
        # 3. Fix missing closing braces for if statements
        pattern3 = r'(\s*return NextResponse\.json\([^}]+\)\s*)\n(\s*)(console\.error|return NextResponse)'
        if re.search(pattern3, content):
            content = re.sub(pattern3, r'\1;\n\2}\n\2\3', content)
            fixes_applied.append("Fixed missing closing braces for if statements")
        
        # 4. Fix missing semicolons in return statements
        pattern4 = r'(\s*return NextResponse\.json\([^}]+\))\n(\s*})'
        content = re.sub(pattern4, r'\1;\n\2', content)
        if pattern4 in content:
            fixes_applied.append("Fixed missing semicolons in return statements")
        
        # 5. Fix files ending without proper closing braces
        if not content.strip().endswith('}'):
            content = content.rstrip() + '\n}\n'
            fixes_applied.append("Added missing final closing brace")
        
        # Specific file fixes
        filename = os.path.basename(file_path)
        
        if filename == 'route.ts' and '/analytics/' in file_path:
            # Analytics route specific fixes
            if 'export async function GET' in content and not content.count('export async function GET') == content.count('}'):
                # Find the end of the GET function
                lines = content.split('\n')
                in_get_function = False
                brace_count = 0
                get_end_line = -1
                
                for i, line in enumerate(lines):
                    if 'export async function GET' in line:
                        in_get_function = True
                        brace_count = 0
                    
                    if in_get_function:
                        brace_count += line.count('{')
                        brace_count -= line.count('}')
                        
                        if brace_count == 0 and line.strip().endswith('}') and i > 0:
                            get_end_line = i
                            break
                
                if get_end_line > 0 and get_end_line < len(lines) - 1:
                    next_line = lines[get_end_line + 1].strip()
                    if next_line and not next_line.startswith('//') and not next_line == '}':
                        lines.insert(get_end_line + 1, '}')
                        content = '\n'.join(lines)
                        fixes_applied.append("Fixed analytics GET function closing")
        
        # Write back if changes were made
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Fixed {file_path}")
            for fix in fixes_applied:
                print(f"   - {fix}")
            return True
        else:
            print(f"✓ No issues found in {file_path}")
            return False
            
    except Exception as e:
        print(f"❌ Error processing {file_path}: {e}")
        return False

def find_api_routes(root_dir: str) -> List[str]:
    """Find all API route files."""
    api_routes = []
    api_dir = os.path.join(root_dir, 'src', 'app', 'api')
    
    if not os.path.exists(api_dir):
        print(f"❌ API directory not found: {api_dir}")
        return []
    
    for root, dirs, files in os.walk(api_dir):
        for file in files:
            if file == 'route.ts':
                api_routes.append(os.path.join(root, file))
    
    return api_routes

def main():
    """Main function to fix all syntax issues."""
    project_root = '/project/workspace/alphaeth784/taskfi-dan'
    
    if not os.path.exists(project_root):
        print(f"❌ Project root not found: {project_root}")
        sys.exit(1)
    
    print("🔧 TaskFi API Routes Syntax Fixer")
    print("=" * 50)
    
    api_routes = find_api_routes(project_root)
    
    if not api_routes:
        print("❌ No API route files found")
        sys.exit(1)
    
    print(f"📁 Found {len(api_routes)} API route files")
    
    fixed_count = 0
    
    for route_file in api_routes:
        if fix_api_route(route_file):
            fixed_count += 1
    
    print("\n" + "=" * 50)
    print(f"✅ Syntax fix completed!")
    print(f"📊 Fixed {fixed_count} files out of {len(api_routes)} total")
    
    # Test build
    print("\n🧪 Testing build...")
    os.chdir(project_root)
    result = os.system('bun run build > build_test.log 2>&1')
    
    if result == 0:
        print("✅ Build successful! All syntax errors fixed.")
    else:
        print("⚠️  Build still has issues. Check build_test.log for details.")
        # Show first few lines of build error
        try:
            with open('build_test.log', 'r') as f:
                lines = f.readlines()[-20:]  # Last 20 lines
                print("\nBuild errors:")
                for line in lines:
                    print(line.rstrip())
        except:
            pass

if __name__ == "__main__":
    main()
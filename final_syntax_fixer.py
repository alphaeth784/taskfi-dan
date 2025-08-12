#!/usr/bin/env python3

import os
import re
import glob

def fix_typescript_syntax_issues(file_path):
    """Fix the specific TypeScript syntax issues identified."""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    fixed = False
    
    # Pattern 1: Fix orphaned catch blocks - find } catch and ensure they have proper try
    # Look for cases where there's a return statement followed by } catch
    pattern1 = r'(\s+})\s*} catch \(error\) \{'
    if re.search(pattern1, content):
        content = re.sub(pattern1, r'\1\n  } catch (error) {', content)
        fixed = True
    
    # Pattern 2: Fix orphaned try statements inside if blocks
    pattern2 = r'if \([^)]+\) \{\s*try \{\s*return NextResponse\.json'
    matches = re.finditer(pattern2, content)
    for match in matches:
        # This indicates a malformed if block with orphaned try
        # Need to close the if block properly
        pass
    
    # Pattern 3: Remove extra closing braces at end of files
    # Count braces in the last 20 lines
    lines = content.split('\n')
    last_lines = lines[-20:]
    extra_braces = 0
    
    for i in range(len(last_lines) - 1, -1, -1):
        line = last_lines[i].strip()
        if line == '}':
            extra_braces += 1
        elif line and line != '}':
            break
    
    # If more than 2 consecutive closing braces at end, remove extras
    if extra_braces > 2:
        # Keep only 1-2 closing braces
        while lines and lines[-1].strip() == '}':
            lines.pop()
        
        # Add back 1 closing brace for the function
        lines.append('}')
        content = '\n'.join(lines)
        fixed = True
    
    # Pattern 4: Fix specific case of doubled return statements
    pattern4 = r'return NextResponse\.json\([^}]+}, return NextResponse\.json\([^}]+}, \{status: \d+\}\);'
    if re.search(pattern4, content):
        content = re.sub(pattern4, lambda m: m.group(0).split(', return')[0] + ');', content)
        fixed = True
    
    # Pattern 5: Fix missing closing braces in if statements
    # Look for return statements followed immediately by another statement without proper closure
    pattern5 = r'return NextResponse\.json\([^}]+}\)\s*([a-zA-Z_])'
    matches = list(re.finditer(pattern5, content))
    for match in reversed(matches):  # Process from end to avoid offset issues
        pos = match.start(1)
        # Insert missing closing brace and newline
        content = content[:pos] + '\n    }\n\n    ' + content[pos:]
        fixed = True
    
    # Pattern 6: Fix malformed try-catch structure specific to API routes
    # Find: } catch (error) { immediately after return statements
    pattern6 = r'(\s+return NextResponse\.json\([^}]+}\);)\s*} catch \(error\) \{'
    if re.search(pattern6, content):
        content = re.sub(pattern6, r'\1\n  } catch (error) {', content)
        fixed = True
    
    if fixed and content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    
    return False

def main():
    # Find all TypeScript files in API routes
    api_files = glob.glob('/project/workspace/alphaeth784/taskfi-dan/src/app/api/**/*.ts', recursive=True)
    
    fixed_files = []
    
    for file_path in api_files:
        try:
            if fix_typescript_syntax_issues(file_path):
                fixed_files.append(file_path)
                print(f"Fixed: {file_path}")
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
    
    print(f"\\nTotal files fixed: {len(fixed_files)}")
    
    if fixed_files:
        print("\\nFixed files:")
        for file_path in fixed_files:
            print(f"  - {os.path.relpath(file_path, '/project/workspace/alphaeth784/taskfi-dan')}")

if __name__ == "__main__":
    main()
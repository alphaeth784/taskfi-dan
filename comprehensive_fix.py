#!/usr/bin/env python3

import os
import re

def fix_route_file(file_path):
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Remove orphaned closing braces from interface removal
    content = re.sub(r'^\s*}\s*$\n\n', '', content, flags=re.MULTILINE)
    
    # Fix function signatures with params
    # Pattern: export async function METHOD(request, props: { params: Promise<{ id: string }> })
    # Should be: export async function METHOD(request, props: { params: Promise<{ id: string }> }) {
    #             const params = await props.params;
    
    # Fix missing opening brace and duplicate try
    content = re.sub(
        r'export async function (\w+)\(request: NextRequest, props: \{ params: Promise<[^>]+> \}\)\s*const params = await props\.params;\s*try \{\s*try \{',
        r'export async function \1(request: NextRequest, props: { params: Promise<{ id: string }> }) {\n  const params = await props.params;\n  try {',
        content,
        flags=re.MULTILINE | re.DOTALL
    )
    
    # Handle applicationId case
    if '[applicationId]' in file_path:
        content = re.sub(
            r'Promise<\{ id: string \}>',
            r'Promise<{ id: string; applicationId: string }>',
            content
        )
    
    with open(file_path, 'w') as f:
        f.write(content)

# List of files to fix
files_to_fix = [
    'src/app/api/admin/users/[id]/route.ts',
    'src/app/api/categories/[id]/route.ts', 
    'src/app/api/gigs/[id]/purchase/route.ts',
    'src/app/api/gigs/[id]/route.ts',
    'src/app/api/jobs/[id]/applications/[applicationId]/route.ts',
    'src/app/api/jobs/[id]/applications/route.ts',
    'src/app/api/jobs/[id]/route.ts',
    'src/app/api/payments/[id]/escrow/route.ts',
    'src/app/api/payments/[id]/route.ts',
    'src/app/api/users/[id]/route.ts'
]

for file_path in files_to_fix:
    if os.path.exists(file_path):
        print(f"Fixing {file_path}")
        fix_route_file(file_path)
    else:
        print(f"File not found: {file_path}")

print("All route files fixed!")
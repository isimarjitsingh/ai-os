from preview_assistant import validate_project_structure

# Test 1: Empty file tree
result = validate_project_structure({}, 'test_project')
print('Test 1 - Empty file tree:')
print('  valid:', result["valid"])
print('  missing_mandatory:', result["missing_mandatory"])

# Test 2: File tree with frontend structure (correct format)
result2 = validate_project_structure({
    'frontend': {
        'package.json': {'file': {'contents': '{"name": "test"}'},
        'vite.config.js': {'file': {'contents': ''}},
        'index.html': {'file': {'contents': '<html><body><div id="root"></div></body></html>'}},
        'src': {
            'main.jsx': {'file': {'contents': 'import React from "react"'}},
            'index.css': {'file': {'contents': ''}}
        }
    }
}, 'test_project')
print('Test 2 - Complete frontend structure:')
print('  valid:', result2["valid"])
print('  missing_mandatory:', result2["missing_mandatory"])

# Test 3: Missing some files
result3 = validate_project_structure({
    'frontend': {
        'package.json': {'file': {'contents': '{"name": "test"}'},
    }
}, 'test_project')
print('Test 3 - Missing most files:')
print('  valid:', result3["valid"])
print('  missing_mandatory:', result3["missing_mandatory"])
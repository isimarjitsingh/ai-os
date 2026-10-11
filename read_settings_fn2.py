with open('frontend/src/pages/Settings.jsx', 'r') as f:
    lines = f.readlines()
for i, line in enumerate(lines[620:680], start=621):
    print(f'{i}: {line}', end='')
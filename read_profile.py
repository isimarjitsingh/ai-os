with open('frontend/src/pages/Settings.jsx', 'r') as f:
    lines = f.readlines()
for i, line in enumerate(lines[449:500], start=450):
    print(f'{i}: {line}', end='')
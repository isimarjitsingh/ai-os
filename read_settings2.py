with open('frontend/src/pages/Settings.jsx', 'r') as f:
    lines = f.readlines()
for i, line in enumerate(lines[529:600], start=530):
    print(f'{i}: {line}', end='')
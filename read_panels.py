with open('frontend/src/pages/Settings.jsx', 'r') as f:
    lines = f.readlines()
for i, line in enumerate(lines[580:700], start=581):
    print(f'{i}: {line}', end='')
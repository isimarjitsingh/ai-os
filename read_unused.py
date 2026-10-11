with open('frontend/src/pages/Settings.jsx', 'r') as f:
    lines = f.readlines()
for i, line in enumerate(lines[473:600], start=474):
    print(f'{i}: {line}', end='')
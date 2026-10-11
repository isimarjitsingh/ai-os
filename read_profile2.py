with open('frontend/src/pages/Settings.jsx', 'r') as f:
    lines = f.readlines()
for i, line in enumerate(lines[430:500], start=431):
    print(f'{i}: {line}', end='')
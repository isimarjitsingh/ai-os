with open('frontend/src/pages/Settings.jsx', 'r') as f:
    lines = f.readlines()
for i, line in enumerate(lines[593:660], start=594):
    print(f'{i}: {line}', end='')
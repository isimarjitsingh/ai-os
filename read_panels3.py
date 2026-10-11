with open('frontend/src/pages/Settings.jsx', 'r') as f:
    content = f.read()
start = content.find('const panels = {')
end = content.find('};', start) + 2
print(repr(content[start:end]))
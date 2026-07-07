import os
import re

# Directory to search
directory = 'src'

replacements = {
    r'\bbg-base\b': 'bg-bg-base',
    r'\bbg-surface\b': 'bg-bg-surface',
    r'\bbg-elevated\b': 'bg-bg-elevated',
    r'\bbg-overlay\b': 'bg-bg-overlay',
    r'\bborder-border\b': 'border-border-default',
    r'\btext-main\b': 'text-text-primary',
    r'\btext-sub\b': 'text-text-secondary',
    r'\bbg-brand\b(?!-)': 'bg-brand-500',
    r'\btext-brand\b(?!-)': 'text-brand-500',
    r'\bborder-brand\b(?!-)': 'border-brand-500',
    r'\bring-brand\b(?!-)': 'ring-brand-500',
    r'\bbg-danger\b(?!-)': 'bg-danger',
    r'\btext-danger\b(?!-)': 'text-danger',
}

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()

            new_content = content
            for old, new in replacements.items():
                new_content = re.sub(old, new, new_content)

            if content != new_content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {path}")

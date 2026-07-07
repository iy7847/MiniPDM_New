const fs = require('fs');
const path = require('path');

const directory = 'src';

const replacements = {
    '\\bbg-base\\b': 'bg-bg-base',
    '\\bbg-surface\\b': 'bg-bg-surface',
    '\\bbg-elevated\\b': 'bg-bg-elevated',
    '\\bbg-overlay\\b': 'bg-bg-overlay',
    '\\bborder-border\\b': 'border-border-default',
    '\\btext-main\\b': 'text-text-primary',
    '\\btext-sub\\b': 'text-text-secondary',
    '\\bbg-brand\\b(?!-)': 'bg-brand-500',
    '\\btext-brand\\b(?!-)': 'text-brand-500',
    '\\bborder-brand\\b(?!-)': 'border-brand-500',
    '\\bring-brand\\b(?!-)': 'ring-brand-500',
    '\\bbg-danger\\b(?!-)': 'bg-danger',
    '\\btext-danger\\b(?!-)': 'text-danger'
};

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walkDir(directory);

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    let newContent = content;
    
    for (const [old, newStr] of Object.entries(replacements)) {
        newContent = newContent.replace(new RegExp(old, 'g'), newStr);
    }
    
    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        console.log(`Updated ${file}`);
    }
});

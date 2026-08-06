const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetFiles = [];
walkDir('./src', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    targetFiles.push(filePath);
  }
});

let modifiedCount = 0;

targetFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace text-slate-400 dark:text-slate-500 with text-slate-500 dark:text-slate-400
  content = content.replace(/text-slate-400\s+dark:text-slate-500/g, 'text-slate-500 dark:text-slate-400');
  
  // Replace text-slate-400 where not preceded by dark:, hover:, focus:, etc.
  content = content.replace(/(?<![a-zA-Z:-])text-slate-400(?!\s+dark:text-slate-)/g, 'text-slate-500 dark:text-slate-400');
  
  // Replace text-slate-300 where not preceded by dark:, hover:, focus:, etc.
  content = content.replace(/(?<![a-zA-Z:-])text-slate-300(?!\s+dark:text-slate-)/g, 'text-slate-500 dark:text-slate-300');

  // Replace text-slate-200 where not preceded by dark:, hover:, focus:, etc.
  // Be careful: text-slate-200 might be inside a dark element. But adding dark:text-slate-200 won't hurt, 
  // and changing base to text-slate-600 ensures it's readable if somehow the container isn't dark.
  // Actually, some places use `text-slate-200` to be light grey inside a dark container in light mode (e.g., bg-slate-900).
  // If we change it to text-slate-600, it'll be dark inside a dark container! 
  // Let's only target text-slate-300 and text-slate-400 for now.

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
    console.log('Modified', file);
  }
});

console.log('Total files modified:', modifiedCount);

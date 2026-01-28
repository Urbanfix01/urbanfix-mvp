const fs=require('fs'); 
const path=require('path'); 
const file=path.join('apps/web/app/p','[id]','page.tsx'); 
const lines=fs.readFileSync(file,'utf8').split('\\n'); 
var out=[]; var i=0; 
while (i !== lines.length) { if (lines[i].indexOf('Pendiente') !== -1) { out.push((i+1)+':' + lines[i]); } i = i + 1; } 
console.log(out.join('\\n')); 

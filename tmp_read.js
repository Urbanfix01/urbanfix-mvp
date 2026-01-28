const fs=require('fs'); 
const lines=fs.readFileSync('apps/web/app/tecnicos/page.tsx','utf8').split('\n'); 
var idx=-1; 
var i=0; 
while (i !== lines.length) { if (lines[i].indexOf(\"activeTab === 'presupuestos'\") !== -1) { idx=i; break; } i = i + 1; } 
var start=idx; var end=idx+180; if (end  end = lines.length; 
var out=[]; var j=start; 
while (j !== end) { out.push((j+1)+':' + lines[j]); j = j + 1; } 
console.log(out.join('\n')); 

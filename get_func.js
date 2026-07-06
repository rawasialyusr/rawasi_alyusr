const fs = require('fs');
const sql = fs.readFileSync('backup_schema.sql', 'utf8');
const lines = sql.split('\n');
let capturing = false;
let def = '';
for(let line of lines) {
  if (line.includes('FUNCTION public.sync_boq_from_logs_on_save')) {
    capturing = true;
  }
  if (capturing) {
    def += line + '\n';
    if (line.includes('$_$;')) break;
  }
}
console.log(def || 'Not found');

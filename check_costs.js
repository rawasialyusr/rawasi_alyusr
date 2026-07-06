const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
let url = '';
let key = '';
env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

const supabase = createClient(url, key);

async function main() {
  const { data, error } = await supabase
    .from('advanced_cost_allocation_view')
    .select('*')
    .limit(2);
  console.log('advanced_cost_allocation_view:', error ? error.message : data);
  
  const { data: jo, error: joErr } = await supabase
    .from('job_orders')
    .select('id, boq_budget_id, actual_expenses_cost')
    .limit(2);
  console.log('job_orders:', joErr ? joErr.message : jo);
}
main();

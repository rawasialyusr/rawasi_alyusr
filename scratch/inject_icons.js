const fs = require('fs');

const pagesToUpdate = {
  'app/labor_logs/page.tsx': '👷‍♂️',
  'app/expenses/page.tsx': '💸',
  'app/PaymentVouchers/page.tsx': '📤',
  'app/ReceiptVouchers/page.tsx': '📥',
  'app/journal/page.tsx': '📓',
  'app/partners/page.tsx': '🤝',
  'app/projects/page.tsx': '🏗️',
  'app/team/page.tsx': '👥',
  'app/settings/page.tsx': '⚙️',
  'app/reports/page.tsx': '📊',
  'app/subclaims/page.tsx': '📜',
  'app/material_issues/page.tsx': '🚚',
  'app/materials/page.tsx': '🧱',
  'app/materialitems/page.tsx': '📦',
  'app/laborcost/page.tsx': '💰',
  'app/ledger/page.tsx': '📖',
  'app/PartnerBalances/page.tsx': '⚖️',
  'app/profile/page.tsx': '👤',
  'app/project-ledger/page.tsx': '🏛️',
  'app/revenue/page.tsx': '📈',
  'app/statement/page.tsx': '📑',
  'app/subcontractor-costs/page.tsx': '💵',
  'app/trialbalance/page.tsx': '⚖️',
  'app/violations/page.tsx': '⚠️',
  'app/overhead/page.tsx': '📉'
};

for (const [file, icon] of Object.entries(pagesToUpdate)) {
  if (fs.existsSync(file)) {
    let c = fs.readFileSync(file, 'utf8');
    c = c.replace(/<MasterPage([\s\n]+)/g, '<MasterPage icon="' + icon + '"$1');
    fs.writeFileSync(file, c);
    console.log('Updated ' + file);
  }
}

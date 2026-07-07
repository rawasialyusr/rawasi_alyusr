const fs = require('fs');
let c = fs.readFileSync('app/ManualJournals/manual_journals_logic.ts', 'utf8');

c = c.replace(/select\('id, name, type'\)/g, "select('id, name, account_type')");
c = c.replace(/project:projects\(name\)/g, "project:projects(Property)");
c = c.replace(/\.from\('projects'\)\.select\('id, name'\)\.order\('name'\)/g, ".from('projects').select('id, name:Property').order('Property')");

fs.writeFileSync('app/ManualJournals/manual_journals_logic.ts', c);
console.log("Done");

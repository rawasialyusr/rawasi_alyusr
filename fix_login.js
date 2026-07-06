const fs = require('fs');

let code = fs.readFileSync('app/login/login_logic.ts', 'utf8');

// Replace both occurrences of the routing logic
code = code.replace(/const redirectParam = searchParams\?\.get\('redirect'\);\s*const lastRoute = localStorage\.getItem\('last_visited_route'\);\s*router\.replace\(redirectParam \|\| lastRoute \|\| '\/Dashboard'\);/g, "const redirectParam = searchParams?.get('redirect');\n        router.replace(redirectParam || '/Dashboard');");

fs.writeFileSync('app/login/login_logic.ts', code);
console.log('Fixed login_logic.ts');

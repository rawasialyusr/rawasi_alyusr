const fs = require('fs');
const file = 'components/layout/LayoutClient.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import LoadingScreen')) {
  content = content.replace(
    "import UserCard from '@/components/UserCard';",
    "import UserCard from '@/components/UserCard';\nimport LoadingScreen from '@/components/LoadingScreen';"
  );
}

const target = "return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl', fontWeight: 900 }}>⏳ جاري تحميل الصلاحيات...</div>;";
const replacement = "return <LoadingScreen message=\"جاري تهيئة النظام...\" subMessage=\"يتم الآن تجميع صلاحياتك الخاصة وتأمين الواجهة\" fullScreen={true} />;";

content = content.replace(target, replacement);

fs.writeFileSync(file, content);
console.log('LayoutClient updated successfully!');

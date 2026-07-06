const fs = require('fs');

let code = fs.readFileSync('app/Dashboard/page.tsx', 'utf8');

if (!code.includes('MOTIVATIONAL_MESSAGES')) {
    // 1. Add imports if needed
    if (!code.includes("import { supabase } from '@/lib/supabase';")) {
        code = code.replace(/(import .*?;\n)/, "$1import { supabase } from '@/lib/supabase';\n");
    }

    // 2. Add MOTIVATIONAL_MESSAGES array
    const messagesArray = `
const MOTIVATIONAL_MESSAGES = [
  "يوم جديد لنجاحات مبهرة، توكل على الله وانطلق! 🚀",
  "النجاح يبدأ بخطوة، وأنت الآن في المسار الصحيح! 🌟",
  "الأرقام لا تكذب، اجعل أرقام اليوم أفضل من الأمس! 📊",
  "كل مجهود صغير يتراكم ليصنع إنجازاً عظيماً! 💪",
  "رواسي اليسر تكبر بجهودكم، شكراً لعملكم الرائع! 🏗️",
  "الدقة في العمل هي أساس الثقة، حافظ على تميزك! 💎",
  "اجعل هدفك اليوم هو التميز، لا مجرد الإنجاز! ✨",
  "لا حدود لما يمكنك تحقيقه اليوم، انطلق بثقة! 🎯"
];
`;
    code = code.replace(/export default function DashboardPage\(\) \{/, messagesArray + '\nexport default function DashboardPage() {');

    // 3. Add State and Effect
    const stateLogic = `
  const [userName, setUserName] = useState('');
  const [quote, setQuote] = useState(MOTIVATIONAL_MESSAGES[0]);

  useEffect(() => {
    // اختيار رسالة عشوائية
    setQuote(MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]);
    
    // جلب اسم المستخدم
    supabase.auth.getSession().then(({ data }) => {
        if(data?.session?.user) {
            supabase.from('profiles').select('full_name').eq('id', data.session.user.id).single().then(res => {
                if(res?.data?.full_name) {
                    setUserName(res.data.full_name.split(' ')[0]); // الاسم الأول فقط
                }
            });
        }
    });
  }, []);
`;
    code = code.replace(/const logic = useDashboardLogic\(\);/, 'const logic = useDashboardLogic();\n' + stateLogic);

    // 4. Update MasterPage props
    code = code.replace(
        /<MasterPage title="لوحة القيادة المركزية" subtitle="مراقبة الأداء التشغيلي والمالي - رواسي اليسر">/,
        '<MasterPage title={userName ? `أهلاً بك يا ${userName} 👋` : "لوحة القيادة المركزية 🏠"} subtitle={quote}>'
    );

    fs.writeFileSync('app/Dashboard/page.tsx', code);
    console.log('Added welcome message to Dashboard');
} else {
    console.log('Welcome message already exists');
}

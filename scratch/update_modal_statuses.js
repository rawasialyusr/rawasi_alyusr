const fs = require('fs');

function updateModal() {
    let modalPath = 'app/joborders/JobOrderModal.tsx';
    let content = fs.readFileSync(modalPath, 'utf8');

    const filterOptionsOld = `<option value="موقوف">⏸️ موقوف</option>`;
    const filterOptionsNew = `<option value="موقوف">⏸️ موقوف</option>
                            <option value="جاري التسليم">🚚 جاري التسليم</option>
                            <option value="مفوتر">🧾 مفوتر</option>
                            <option value="تم التحصيل">💰 تم التحصيل</option>`;

    content = content.replace(filterOptionsOld, filterOptionsNew);

    fs.writeFileSync(modalPath, content);
    console.log("Updated JobOrderModal.tsx");
}

updateModal();

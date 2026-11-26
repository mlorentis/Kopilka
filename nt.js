// --- NO-TABBAR OVERRIDE v9 (после app.js) ---
// v9+: таба 44 / переключалка 54; один счёт — на всю ширину, 2+ — карусель;
//     подпись периода дельты всегда серая; Add-карта: радиус 32, зазор 8;
//     скользящая пилюля табов: стекло на главной, плоская #1A1D24 в модалках.
// v8: дизайн-ревью — стекло на кнопках навбара/активной табе/кнопке Add,
//     белая нулевая дельта, табы 44px/паддинг 4, переключалки 54px,
//     карточка Add account 200px с иконкой 56.
// v7: клавиатура — лист уходит под клаву (bottom:0) + паддинг modal-body,
//     полосы-обрезки между клавой и листом больше нет.
// v6: живые курсы валют (open.er-api.com) — NW/дельта/итоги в основной валюте.
// v5: клавиатурный пиннинг листа к visualViewport (паттерн hh.ru).
// Главная: NW → сегмент → карусель счетов → Operations (3) → FAB-пилюля.
// History / Profile / Language / Currency — страницы с шевроном назад.
// Language и Currency — большой заголовок в контенте, навбар заливается
// и показывает мелкий заголовок, когда большой ушёл под скролл.
const NT_SCREENS = ['home', 'history', 'profile', 'language', 'currency'];
let ntSeg = 'asset';
let ntTab = 'home';

// Знак валюты по дефолту; если общепринятого знака нет — код валюты (BYN)
const NT_CURRENCY_SYMBOLS = {
    USD: '$', EUR: '€', RUB: '₽', UAH: '₴', KZT: '₸', INR: '₹', KRW: '₩',
    TRY: '₺', ILS: '₪', THB: '฿', VND: '₫', NGN: '₦', BRL: 'R$', ZAR: 'R', IDR: 'Rp'
};
function ntSym(cur) { return NT_CURRENCY_SYMBOLS[cur] || cur; }

// --- НАСТРОЙКИ (язык + основная валюта + период дельты) ---
let ntSettings = { lang: 'en', currency: 'USD', deltaPeriod: '24h' };
try {
    const saved = JSON.parse(localStorage.getItem('kp_settings'));
    if (saved && typeof saved === 'object') ntSettings = { ...ntSettings, ...saved };
} catch (e) {}
function ntSaveSettings() { localStorage.setItem('kp_settings', JSON.stringify(ntSettings)); }

// --- КУРСЫ ВАЛЮТ (open.er-api.com — бесплатно, без ключа, CORS открыт) ---
// База USD: rates[cur] = сколько единиц cur дают за 1 USD.
// Кэш в localStorage (kp_rates), обновляем не чаще раза в 12 часов
// (API сам обновляет курсы раз в сутки). Офлайн/ошибка — живём на кэше;
// если кэша нет вообще — показываем суммы без конвертации, как раньше.
const NT_RATES_URL = 'https://open.er-api.com/v6/latest/USD';
const NT_RATES_TTL = 12 * 60 * 60 * 1000;
let ntRates = null; // { rates: { USD: 1, EUR: 0.92, ... }, fetchedAt: ts }
try {
    const savedRates = JSON.parse(localStorage.getItem('kp_rates'));
    if (savedRates && savedRates.rates) ntRates = savedRates;
} catch (e) {}

async function ntFetchRates() {
    if (ntRates && Date.now() - ntRates.fetchedAt < NT_RATES_TTL) return;
    try {
        const res = await fetch(NT_RATES_URL);
        const data = await res.json();
        if (data && data.result === 'success' && data.rates) {
            ntRates = { rates: data.rates, fetchedAt: Date.now() };
            localStorage.setItem('kp_rates', JSON.stringify(ntRates));
            ntRenderNetWorth();
            renderHistory();
        }
    } catch (e) { /* офлайн — работаем на кэше */ }
}

// amount из валюты from в основную валюту. Нет курса — возвращаем как есть.
function ntConvert(amount, from) {
    const to = ntSettings.currency;
    if (from === to || !ntRates || !ntRates.rates[from] || !ntRates.rates[to]) return amount;
    return amount / ntRates.rates[from] * ntRates.rates[to];
}

// Сумма всех балансов счёта в основной валюте
function ntAccountTotalMain(acc) {
    return Object.entries(acc.balances).reduce((s, [cur, b]) => s + ntConvert(b, cur), 0);
}

// Периоды дельты под Net Worth — переключаются тапом по строке
const NT_DELTA_PERIODS = [
    { key: '24h', ms: 24 * 60 * 60 * 1000, label: { en: '24h', ru: '24ч' } },
    { key: 'week', ms: 7 * 24 * 60 * 60 * 1000, label: { en: 'Week', ru: 'Неделя' } },
    { key: 'month', ms: 30 * 24 * 60 * 60 * 1000, label: { en: 'Month', ru: 'Месяц' } }
];
function ntDeltaPeriod() {
    return NT_DELTA_PERIODS.find(p => p.key === ntSettings.deltaPeriod) || NT_DELTA_PERIODS[0];
}
function ntCycleDelta() {
    const idx = NT_DELTA_PERIODS.findIndex(p => p.key === ntSettings.deltaPeriod);
    ntSettings.deltaPeriod = NT_DELTA_PERIODS[(idx + 1) % NT_DELTA_PERIODS.length].key;
    ntSaveSettings();
    ntRenderNetWorth();
}

// --- СТРОКИ UI ---
const NT_STRINGS = {
    en: {
        netWorth: 'Net Worth', asset: 'Asset', debt: 'Debt',
        operations: 'Operations', history: 'History', profile: 'Profile',
        language: 'Language', mainCurrency: 'Main Currency', resetData: 'Reset Data',
        addAccount: 'Add Account', addAccountCardTitle: 'Add account',
        addAccountCardSub: 'Track cash, cards, or crypto in one place',
        addTransaction: 'Add Transaction', selectAccount: 'Select Account',
        expense: 'Expense', income: 'Income', note: 'Note', confirm: 'Confirm',
        editAccount: 'Edit Account', deleteAccount: 'Delete Account',
        icon: 'Icon', currencies: 'Currencies', name: 'Name', to: 'to',
        other: 'Other', today: 'Today', yesterday: 'Yesterday',
        resetConfirm: 'Reset all data? Accounts and transactions will be deleted.'
    },
    ru: {
        netWorth: 'Капитал', asset: 'Актив', debt: 'Долг',
        operations: 'Операции', history: 'История', profile: 'Профиль',
        language: 'Язык', mainCurrency: 'Основная валюта', resetData: 'Сбросить данные',
        addAccount: 'Добавить счёт', addAccountCardTitle: 'Добавить счёт',
        addAccountCardSub: 'Наличные, карты и крипта в одном месте',
        addTransaction: 'Добавить операцию', selectAccount: 'Выберите счёт',
        expense: 'Расход', income: 'Доход', note: 'Заметка', confirm: 'Готово',
        editAccount: 'Изменить счёт', deleteAccount: 'Удалить счёт',
        icon: 'Иконка', currencies: 'Валюты', name: 'Название', to: 'в',
        other: 'Другое', today: 'Сегодня', yesterday: 'Вчера',
        resetConfirm: 'Сбросить все данные? Счета и операции будут удалены.'
    },
    am: {
        netWorth: 'የተጣራ ሀብት', asset: 'ንብረት', debt: 'ዕዳ',
        operations: 'ግብይቶች', history: 'ታሪክ', profile: 'መገለጫ',
        language: 'ቋንቋ', mainCurrency: 'ዋና መገባደዳ', resetData: 'ውሂብ አጽዳ',
        addAccount: 'መለያ ጨምር', addAccountCardTitle: 'መለያ ጨምር',
        addAccountCardSub: 'ጥሬ ገንዘብ፣ ካርዶች እና ክሪፕቶ በአንድ ቦታ',
        addTransaction: 'ግብይት ጨምር', selectAccount: 'መለያ ይምረጡ',
        expense: 'ወጪ', income: 'ገቢ', note: 'ማስታወሻ', confirm: 'ተከናውኗል',
        editAccount: 'መለያ አስተካክል', deleteAccount: 'መለያ ሰርዝ',
        icon: 'አዶ', currencies: 'መገባደዳዎች', name: 'ስም', to: 'ወደ',
        other: 'ሌላ', today: 'ዛሬ', yesterday: 'ትናንት',
        resetConfirm: 'ሁሉንም ውሂብ ማጽዳት? መለያዎች እና ግብይቶች ይሰረዛሉ።'
    },
    ar: {
        netWorth: 'صافي الثروة', asset: 'أصل', debt: 'دَين',
        operations: 'العمليات', history: 'السجل', profile: 'الملف الشخصي',
        language: 'اللغة', mainCurrency: 'العملة الرئيسية', resetData: 'إعادة تعيين البيانات',
        addAccount: 'إضافة حساب', addAccountCardTitle: 'إضافة حساب',
        addAccountCardSub: 'النقد والبطاقات والعملات المشفرة في مكان واحد',
        addTransaction: 'إضافة معاملة', selectAccount: 'اختر الحساب',
        expense: 'مصروف', income: 'دخل', note: 'ملاحظة', confirm: 'تم',
        editAccount: 'تعديل الحساب', deleteAccount: 'حذف الحساب',
        icon: 'الأيقونة', currencies: 'العملات', name: 'الاسم', to: 'إلى',
        other: 'أخرى', today: 'اليوم', yesterday: 'أمس',
        resetConfirm: 'إعادة تعيين كل البيانات؟ سيتم حذف الحسابات والمعاملات.'
    },
    bn: {
        netWorth: 'নেট মূল্য', asset: 'সম্পদ', debt: 'ঋণ',
        operations: 'লেনদেন', history: 'ইতিহাস', profile: 'প্রোফাইল',
        language: 'ভাষা', mainCurrency: 'প্রধান মুদ্রা', resetData: 'ডেটা রিসেট করুন',
        addAccount: 'অ্যাকাউন্ট যোগ করুন', addAccountCardTitle: 'অ্যাকাউন্ট যোগ করুন',
        addAccountCardSub: 'নগদ, কার্ড ও ক্রিপ্টো এক জায়গায়',
        addTransaction: 'লেনদেন যোগ করুন', selectAccount: 'অ্যাকাউন্ট নির্বাচন করুন',
        expense: 'খরচ', income: 'আয়', note: 'নোট', confirm: 'সম্পন্ন',
        editAccount: 'অ্যাকাউন্ট সম্পাদনা', deleteAccount: 'অ্যাকাউন্ট মুছুন',
        icon: 'আইকন', currencies: 'মুদ্রা', name: 'নাম', to: 'তে',
        other: 'অন্যান্য', today: 'আজ', yesterday: 'গতকাল',
        resetConfirm: 'সব ডেটা রিসেট হবে? অ্যাকাউন্ট ও লেনদেন মুছে যাবে।'
    },
    'zh-TW': {
        netWorth: '淨資產', asset: '資產', debt: '負債',
        operations: '交易', history: '記錄', profile: '個人資料',
        language: '語言', mainCurrency: '主要貨幣', resetData: '重設資料',
        addAccount: '新增帳戶', addAccountCardTitle: '新增帳戶',
        addAccountCardSub: '現金、卡片與加密貨幣集中管理',
        addTransaction: '新增交易', selectAccount: '選擇帳戶',
        expense: '支出', income: '收入', note: '備註', confirm: '完成',
        editAccount: '編輯帳戶', deleteAccount: '刪除帳戶',
        icon: '圖示', currencies: '貨幣', name: '名稱', to: '至',
        other: '其他', today: '今天', yesterday: '昨天',
        resetConfirm: '重設所有資料？帳戶與交易將被刪除。'
    },
    de: {
        netWorth: 'Nettovermögen', asset: 'Vermögen', debt: 'Schulden',
        operations: 'Vorgänge', history: 'Verlauf', profile: 'Profil',
        language: 'Sprache', mainCurrency: 'Hauptwährung', resetData: 'Daten zurücksetzen',
        addAccount: 'Konto hinzufügen', addAccountCardTitle: 'Konto hinzufügen',
        addAccountCardSub: 'Bargeld, Karten und Krypto an einem Ort',
        addTransaction: 'Vorgang hinzufügen', selectAccount: 'Konto wählen',
        expense: 'Ausgabe', income: 'Einnahme', note: 'Notiz', confirm: 'Fertig',
        editAccount: 'Konto bearbeiten', deleteAccount: 'Konto löschen',
        icon: 'Symbol', currencies: 'Währungen', name: 'Name', to: 'an',
        other: 'Sonstiges', today: 'Heute', yesterday: 'Gestern',
        resetConfirm: 'Alle Daten zurücksetzen? Konten und Vorgänge werden gelöscht.'
    },
    hi: {
        netWorth: 'कुल संपत्ति', asset: 'संपत्ति', debt: 'ऋण',
        operations: 'लेन-देन', history: 'इतिहास', profile: 'प्रोफ़ाइल',
        language: 'भाषा', mainCurrency: 'मुख्य मुद्रा', resetData: 'डेटा रीसेट करें',
        addAccount: 'खाता जोड़ें', addAccountCardTitle: 'खाता जोड़ें',
        addAccountCardSub: 'नकद, कार्ड और क्रिप्टो एक ही जगह',
        addTransaction: 'लेन-देन जोड़ें', selectAccount: 'खाता चुनें',
        expense: 'खर्च', income: 'आय', note: 'नोट', confirm: 'हो गया',
        editAccount: 'खाता बदलें', deleteAccount: 'खाता हटाएं',
        icon: 'आइकन', currencies: 'मुद्राएँ', name: 'नाम', to: 'में',
        other: 'अन्य', today: 'आज', yesterday: 'कल',
        resetConfirm: 'सारा डेटा रीसेट करें? खाते और लेन-देन हटा दिए जाएंगे।'
    },
    id: {
        netWorth: 'Kekayaan Bersih', asset: 'Aset', debt: 'Utang',
        operations: 'Operasi', history: 'Riwayat', profile: 'Profil',
        language: 'Bahasa', mainCurrency: 'Mata Uang Utama', resetData: 'Reset Data',
        addAccount: 'Tambah Akun', addAccountCardTitle: 'Tambah Akun',
        addAccountCardSub: 'Uang tunai, kartu, dan kripto di satu tempat',
        addTransaction: 'Tambah Transaksi', selectAccount: 'Pilih Akun',
        expense: 'Pengeluaran', income: 'Pemasukan', note: 'Catatan', confirm: 'Selesai',
        editAccount: 'Ubah Akun', deleteAccount: 'Hapus Akun',
        icon: 'Ikon', currencies: 'Mata Uang', name: 'Nama', to: 'ke',
        other: 'Lainnya', today: 'Hari ini', yesterday: 'Kemarin',
        resetConfirm: 'Reset semua data? Akun dan transaksi akan dihapus.'
    },
    it: {
        netWorth: 'Patrimonio netto', asset: 'Attività', debt: 'Debito',
        operations: 'Operazioni', history: 'Cronologia', profile: 'Profilo',
        language: 'Lingua', mainCurrency: 'Valuta principale', resetData: 'Reimposta dati',
        addAccount: 'Aggiungi conto', addAccountCardTitle: 'Aggiungi conto',
        addAccountCardSub: 'Contanti, carte e cripto in un unico posto',
        addTransaction: 'Aggiungi transazione', selectAccount: 'Seleziona conto',
        expense: 'Spesa', income: 'Entrata', note: 'Nota', confirm: 'Fatto',
        editAccount: 'Modifica conto', deleteAccount: 'Elimina conto',
        icon: 'Icona', currencies: 'Valute', name: 'Nome', to: 'a',
        other: 'Altro', today: 'Oggi', yesterday: 'Ieri',
        resetConfirm: 'Reimpostare tutti i dati? Conti e transazioni saranno eliminati.'
    },
    kk: {
        netWorth: 'Капитал', asset: 'Актив', debt: 'Қарыз',
        operations: 'Операциялар', history: 'Тарих', profile: 'Профиль',
        language: 'Тіл', mainCurrency: 'Негізгі валюта', resetData: 'Деректерді тазалау',
        addAccount: 'Шот қосу', addAccountCardTitle: 'Шот қосу',
        addAccountCardSub: 'Қолма-қол ақша, карталар және крипта бір жерде',
        addTransaction: 'Операция қосу', selectAccount: 'Шотты таңдаңыз',
        expense: 'Шығыс', income: 'Кіріс', note: 'Жазба', confirm: 'Дайын',
        editAccount: 'Шотты өзгерту', deleteAccount: 'Шотты жою',
        icon: 'Белгіше', currencies: 'Валюталар', name: 'Атауы', to: '→',
        other: 'Басқа', today: 'Бүгін', yesterday: 'Кеше',
        resetConfirm: 'Барлық деректер тазалансын ба? Шоттар мен операциялар жойылады.'
    },
    'pt-BR': {
        netWorth: 'Patrimônio líquido', asset: 'Ativo', debt: 'Dívida',
        operations: 'Operações', history: 'Histórico', profile: 'Perfil',
        language: 'Idioma', mainCurrency: 'Moeda principal', resetData: 'Redefinir dados',
        addAccount: 'Adicionar conta', addAccountCardTitle: 'Adicionar conta',
        addAccountCardSub: 'Dinheiro, cartões e cripto em um só lugar',
        addTransaction: 'Adicionar transação', selectAccount: 'Selecionar conta',
        expense: 'Despesa', income: 'Receita', note: 'Nota', confirm: 'Concluir',
        editAccount: 'Editar conta', deleteAccount: 'Excluir conta',
        icon: 'Ícone', currencies: 'Moedas', name: 'Nome', to: 'para',
        other: 'Outros', today: 'Hoje', yesterday: 'Ontem',
        resetConfirm: 'Redefinir todos os dados? Contas e transações serão excluídas.'
    },
    'es-419': {
        netWorth: 'Patrimonio neto', asset: 'Activo', debt: 'Deuda',
        operations: 'Operaciones', history: 'Historial', profile: 'Perfil',
        language: 'Idioma', mainCurrency: 'Moneda principal', resetData: 'Restablecer datos',
        addAccount: 'Agregar cuenta', addAccountCardTitle: 'Agregar cuenta',
        addAccountCardSub: 'Efectivo, tarjetas y cripto en un solo lugar',
        addTransaction: 'Agregar transacción', selectAccount: 'Selecciona cuenta',
        expense: 'Gasto', income: 'Ingreso', note: 'Nota', confirm: 'Listo',
        editAccount: 'Editar cuenta', deleteAccount: 'Eliminar cuenta',
        icon: 'Ícono', currencies: 'Monedas', name: 'Nombre', to: 'a',
        other: 'Otros', today: 'Hoy', yesterday: 'Ayer',
        resetConfirm: '¿Restablecer todos los datos? Se eliminarán cuentas y transacciones.'
    },
    uk: {
        netWorth: 'Капітал', asset: 'Актив', debt: 'Борг',
        operations: 'Операції', history: 'Історія', profile: 'Профіль',
        language: 'Мова', mainCurrency: 'Основна валюта', resetData: 'Скинути дані',
        addAccount: 'Додати рахунок', addAccountCardTitle: 'Додати рахунок',
        addAccountCardSub: 'Готівка, картки та крипта в одному місці',
        addTransaction: 'Додати операцію', selectAccount: 'Оберіть рахунок',
        expense: 'Витрата', income: 'Дохід', note: 'Нотатка', confirm: 'Готово',
        editAccount: 'Змінити рахунок', deleteAccount: 'Видалити рахунок',
        icon: 'Іконка', currencies: 'Валюти', name: 'Назва', to: 'на',
        other: 'Інше', today: 'Сьогодні', yesterday: 'Вчора',
        resetConfirm: 'Скинути всі дані? Рахунки та операції будуть видалені.'
    },
    uz: {
        netWorth: 'Kapital', asset: 'Aktiv', debt: 'Qarz',
        operations: 'Operatsiyalar', history: 'Tarix', profile: 'Profil',
        language: 'Til', mainCurrency: 'Asosiy valyuta', resetData: "Ma'lumotlarni tozalash",
        addAccount: "Hisob qo'shish", addAccountCardTitle: "Hisob qo'shish",
        addAccountCardSub: 'Naqd pul, kartalar va kripto bir joyda',
        addTransaction: "Operatsiya qo'shish", selectAccount: 'Hisobni tanlang',
        expense: 'Xarajat', income: 'Daromad', note: 'Izoh', confirm: 'Tayyor',
        editAccount: "Hisobni o'zgartirish", deleteAccount: "Hisobni o'chirish",
        icon: 'Belgisi', currencies: 'Valyutalar', name: 'Nomi', to: 'ga',
        other: 'Boshqa', today: 'Bugun', yesterday: 'Kecha',
        resetConfirm: "Barcha ma'lumotlar tozalansinmi? Hisoblar va operatsiyalar o'chiriladi."
    },
    vi: {
        netWorth: 'Tài sản ròng', asset: 'Tài sản', debt: 'Nợ',
        operations: 'Giao dịch', history: 'Lịch sử', profile: 'Hồ sơ',
        language: 'Ngôn ngữ', mainCurrency: 'Tiền tệ chính', resetData: 'Đặt lại dữ liệu',
        addAccount: 'Thêm tài khoản', addAccountCardTitle: 'Thêm tài khoản',
        addAccountCardSub: 'Tiền mặt, thẻ và crypto ở một nơi',
        addTransaction: 'Thêm giao dịch', selectAccount: 'Chọn tài khoản',
        expense: 'Chi tiêu', income: 'Thu nhập', note: 'Ghi chú', confirm: 'Xong',
        editAccount: 'Sửa tài khoản', deleteAccount: 'Xóa tài khoản',
        icon: 'Biểu tượng', currencies: 'Tiền tệ', name: 'Tên', to: 'vào',
        other: 'Khác', today: 'Hôm nay', yesterday: 'Hôm qua',
        resetConfirm: 'Đặt lại toàn bộ dữ liệu? Tài khoản và giao dịch sẽ bị xóa.'
    }
};
function ntT(key) {
    return (NT_STRINGS[ntSettings.lang] && NT_STRINGS[ntSettings.lang][key]) || NT_STRINGS.en[key] || key;
}

// Языки — список как в референсе (Walt). Порядок как на скринах.
const NT_LANGS = [
    { code: 'en', native: 'English', name: { en: 'English', ru: 'Английский' } },
    { code: 'ru', native: 'Русский', name: { en: 'Russian', ru: 'Русский' } },
    { code: 'am', native: 'አማርኛ', name: { en: 'Amharic', ru: 'Амхарский' } },
    { code: 'ar', native: 'العربية', name: { en: 'Arabic', ru: 'Арабский' } },
    { code: 'bn', native: 'বাংলা', name: { en: 'Bengali', ru: 'Бенгальский' } },
    { code: 'zh-TW', native: '中文 (繁體)', name: { en: 'Chinese (Traditional)', ru: 'Китайский (традиционный)' } },
    { code: 'de', native: 'Deutsch', name: { en: 'German', ru: 'Немецкий' } },
    { code: 'hi', native: 'हिन्दी', name: { en: 'Hindi', ru: 'Хинди' } },
    { code: 'id', native: 'Bahasa Indonesia', name: { en: 'Indonesian', ru: 'Индонезийский' } },
    { code: 'it', native: 'Italiano', name: { en: 'Italian', ru: 'Итальянский' } },
    { code: 'kk', native: 'Қазақша', name: { en: 'Kazakh', ru: 'Казахский' } },
    { code: 'pt-BR', native: 'Português (Brasil)', name: { en: 'Portuguese (Brazil)', ru: 'Португальский (Бразилия)' } },
    { code: 'es-419', native: 'Español (Latinoamérica)', name: { en: 'Spanish (Latin America)', ru: 'Испанский (Латинская Америка)' } },
    { code: 'uk', native: 'Українська', name: { en: 'Ukrainian', ru: 'Украинский' } },
    { code: 'uz', native: "O'zbekcha", name: { en: 'Uzbek', ru: 'Узбекский' } },
    { code: 'vi', native: 'Tiếng Việt', name: { en: 'Vietnamese', ru: 'Вьетнамский' } }
];

// Валюты — список как в референсе (Walt). Флаги — SVG-ассеты от Михаила
// в /flags/<CODE>.svg (круглые, 96×96); где файла нет (AED) — эмодзи-фолбэк.
const NT_CURS = [
    { code: 'AED', flag: '🇦🇪', name: { en: 'UAE Dirham', ru: 'Дирхам ОАЭ' } },
    { code: 'ARS', flag: '🇦🇷', name: { en: 'Argentine Peso', ru: 'Аргентинское песо' } },
    { code: 'BRL', flag: '🇧🇷', name: { en: 'Brazilian Real', ru: 'Бразильский реал' } },
    { code: 'BYN', flag: '🇧🇾', name: { en: 'Belarusian Ruble', ru: 'Белорусский рубль' } },
    { code: 'COP', flag: '🇨🇴', name: { en: 'Colombian Peso', ru: 'Колумбийское песо' } },
    { code: 'EGP', flag: '🇪🇬', name: { en: 'Egyptian Pound', ru: 'Египетский фунт' } },
    { code: 'ETB', flag: '🇪🇹', name: { en: 'Ethiopian Birr', ru: 'Эфиопский быр' } },
    { code: 'EUR', flag: '🇪🇺', name: { en: 'Euro', ru: 'Евро' } },
    { code: 'IDR', flag: '🇮🇩', name: { en: 'Indonesian Rupiah', ru: 'Индонезийская рупия' } },
    { code: 'ILS', flag: '🇮🇱', name: { en: 'Israeli New Shekel', ru: 'Новый израильский шекель' } },
    { code: 'INR', flag: '🇮🇳', name: { en: 'Indian Rupee', ru: 'Индийская рупия' } },
    { code: 'KES', flag: '🇰🇪', name: { en: 'Kenyan Shilling', ru: 'Кенийский шиллинг' } },
    { code: 'KRW', flag: '🇰🇷', name: { en: 'South Korean Won', ru: 'Южнокорейская вона' } },
    { code: 'KZT', flag: '🇰🇿', name: { en: 'Kazakhstani Tenge', ru: 'Казахстанский тенге' } },
    { code: 'MXN', flag: '🇲🇽', name: { en: 'Mexican Peso', ru: 'Мексиканское песо' } },
    { code: 'MYR', flag: '🇲🇾', name: { en: 'Malaysian Ringgit', ru: 'Малайзийский ринггит' } },
    { code: 'NGN', flag: '🇳🇬', name: { en: 'Nigerian Naira', ru: 'Нигерийская найра' } },
    { code: 'RSD', flag: '🇷🇸', name: { en: 'Serbian Dinar', ru: 'Сербский динар' } },
    { code: 'RUB', flag: '🇷🇺', name: { en: 'Russian Ruble', ru: 'Российский рубль' } },
    { code: 'SAR', flag: '🇸🇦', name: { en: 'Saudi Riyal', ru: 'Саудовский риал' } },
    { code: 'THB', flag: '🇹🇭', name: { en: 'Thai Baht', ru: 'Тайский бат' } },
    { code: 'TRY', flag: '🇹🇷', name: { en: 'Turkish Lira', ru: 'Турецкая лира' } },
    { code: 'UAH', flag: '🇺🇦', name: { en: 'Ukrainian Hryvnia', ru: 'Украинская гривна' } },
    { code: 'UGX', flag: '🇺🇬', name: { en: 'Ugandan Shilling', ru: 'Угандийский шиллинг' } },
    { code: 'USD', flag: '🇺🇸', name: { en: 'US Dollar', ru: 'Доллар США' } },
    { code: 'UYU', flag: '🇺🇾', name: { en: 'Uruguayan Peso', ru: 'Уругвайское песо' } },
    { code: 'UZS', flag: '🇺🇿', name: { en: 'Uzbekistani Som', ru: 'Узбекский сум' } },
    { code: 'VES', flag: '🇻🇪', name: { en: 'Venezuelan Bolívar', ru: 'Венесуэльский боливар' } },
    { code: 'VND', flag: '🇻🇳', name: { en: 'Vietnamese Dong', ru: 'Вьетнамский донг' } },
    { code: 'ZAR', flag: '🇿🇦', name: { en: 'South African Rand', ru: 'Южноафриканский рэнд' } }
];

// Коды валют, для которых есть SVG-флаг (AED — пока эмодзи).
const NT_FLAG_SVG = new Set(['AED','ARS','BRL','BYN','COP','EGP','ETB','EUR','IDR','ILS','INR','KES','KRW','KZT','MXN','MYR','NGN','RSD','RUB','SAR','THB','TRY','UAH','UGX','USD','UYU','UZS','VES','VND','ZAR']);
function ntFlagHTML(c) {
    if (NT_FLAG_SVG.has(c.code)) return `<img class="nt-flag-img" src="flags/${c.code}.svg" alt="${c.code}" draggable="false">`;
    return c.flag;
}

// Чипы валют в модалке счёта живут в app.js (CURRENCIES) —
// расширяем массив отсюда, app.js не трогаем.
if (typeof CURRENCIES !== 'undefined') {
    NT_CURS.forEach(c => { if (!CURRENCIES.includes(c.code)) CURRENCIES.push(c.code); });
}

function ntScrollTop() {
    const scroller = document.getElementById('app-content');
    if (scroller) scroller.scrollTop = 0;
    window.scrollTo(0, 0);
}

function ntCircleBtn(onclick, label, inner) {
    return `<button type="button" onclick="${onclick}" aria-label="${label}" class="hdr-btn pointer-events-auto">${inner}</button>`;
}

// --- ШАПКА ---
// home: аватар + плюс. history/profile: шеврон + заголовок по центру
// (виден всегда, фон прозрачный). language/currency: шеврон + скрытый
// заголовок — проявляется вместе с заливкой при скролле (.scrolled).
// Плюс из макета: 24×24 в навбаре (в кнопке Add Account — SVG_PLUS_16
// из app.js, это тот же плюс в масштабе 16/24, толщина штриха совпадает).
const NT_SVG_PLUS_24 = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3.64258V20.3569" stroke-width="1.995" stroke-linecap="round" stroke-linejoin="round" stroke="#F5F7FA"/>
    <path d="M3.64258 12H20.3569" stroke-width="1.995" stroke-linecap="round" stroke-linejoin="round" stroke="#F5F7FA"/>
</svg>`;

function renderHeader(tab) {
    const header = document.getElementById('main-header-inner');
    const hdr = document.getElementById('main-header');
    if (!header || !hdr) return;
    hdr.classList.remove('scrolled', 'show-title');

    const back = target => ntCircleBtn(`switchTab('${target}')`, 'Back', '<i class="ph ph-caret-left text-[24px]"></i>');

    if (tab === 'history' || tab === 'profile') {
        hdr.classList.add('show-title');
        header.innerHTML = `${back('home')}<span class="hdr-title">${ntT(tab)}</span><div class="w-11"></div>`;
        return;
    }
    if (tab === 'language' || tab === 'currency') {
        const titleKey = tab === 'currency' ? 'mainCurrency' : 'language';
        header.innerHTML = `${back('profile')}<span class="hdr-title">${ntT(titleKey)}</span><div class="w-11"></div>`;
        return;
    }
    header.innerHTML = `
        ${ntCircleBtn("switchTab('profile')", 'Profile', '<span class="text-[20px] font-semibold leading-[24px]">M</span>')}
        ${ntCircleBtn('openAccountModal()', 'Add account', NT_SVG_PLUS_24)}
    `;
}

// Заливка навбара + мелкий заголовок, когда большой заголовок
// ушёл за нижнюю кромку шапки
function ntOnScroll() {
    if (ntTab !== 'language' && ntTab !== 'currency') return;
    const title = document.querySelector(`#screen-${ntTab} .nt-large-title`);
    const hdr = document.getElementById('main-header');
    if (!title || !hdr) return;
    hdr.classList.toggle('scrolled', title.getBoundingClientRect().bottom <= hdr.getBoundingClientRect().bottom);
}

function switchTab(tab) {
    if (tab === 'accounts') tab = 'home';
    ntTab = tab;
    NT_SCREENS.forEach(t => {
        const screen = document.getElementById(`screen-${t}`);
        if (screen) screen.classList.toggle('hidden', t !== tab);
    });
    const acc = document.getElementById('screen-accounts');
    if (acc) acc.classList.add('hidden');
    renderHeader(tab);
    ntUpdateFab();
    ntScrollTop();
    ntOnScroll();
    if (tab === 'profile') ntRenderProfileValues();
    if (tab === 'language') ntRenderLanguage();
    if (tab === 'currency') ntRenderCurrency();
}

// --- FAB-ПИЛЮЛЯ: видна на Home и History, когда есть счета.
// has-pill добавляет контенту нижний паддинг, чтобы пилюля не перекрывала ---
function ntUpdateFab() {
    const fab = document.getElementById('fab-wrap');
    const content = document.getElementById('app-content');
    if (!fab) return;
    const show = accounts.length > 0 && (ntTab === 'home' || ntTab === 'history');
    fab.style.display = show ? 'flex' : 'none';
    if (content) content.classList.toggle('has-pill', show);
}

// --- СЕГМЕНТ ASSET / DEBT ---
function ntSetSeg(seg) {
    ntSeg = seg;
    ntRenderAccounts();
}

// --- Скользящая стеклянная пилюля для всех сегментов ---
// Пилюля (.seg-pill.glass-ui) лежит ПОД кнопками и едет к активной
// с пружинящей кривой. Кнопки прозрачные (CSS .seg-wrap > button),
// активная отличается только белым текстом.
function ntPillSync(container) {
    if (!container) return;
    container.classList.add('seg-wrap');
    let pill = container.querySelector(':scope > .seg-pill');
    let created = false;
    if (!pill) {
        pill = document.createElement('div');
        // На стеклянном треке (главная) — стеклянная пилюля;
        // на тёмном треке модалок — плоская #1A1D24, как было по дизайну.
        pill.className = 'seg-pill ' + (container.classList.contains('glass-ui') ? 'glass-ui' : 'seg-pill--flat');
        container.prepend(pill);
        created = true;
        // Tailwind CDN догружает классы (h-[44px] и т.п.) после нашего
        // первого замера — следим за размерами кнопок и молча пересаживаем
        // пилюлю, когда они «дозреют». Заодно ловим ресайзы окна.
        const ro = new ResizeObserver(() => {
            container.querySelectorAll(':scope > button').forEach(b => {
                // игнор — просто триггер пересинхронизации
            });
            delete pill.dataset.ready;
            ntPillSync(container);
        });
        container.querySelectorAll(':scope > button').forEach(b => ro.observe(b));
    }
    const btns = [...container.querySelectorAll(':scope > button')];
    if (!btns.length) return;
    const active = btns.find(b => b.className.includes('text-white')) || btns[0];
    const visible = container.offsetParent !== null;
    // Прыгаем без анимации: первое появление, скрытый контейнер,
    // либо пилюля ещё не была спозиционирована на видимом экране.
    const animate = visible && pill.dataset.ready === '1' && !created;
    pill.classList.toggle('seg-pill-anim', animate);
    pill.style.top = active.offsetTop + 'px';
    pill.style.height = active.offsetHeight + 'px';
    pill.style.width = active.offsetWidth + 'px';
    pill.style.transform = `translateX(${active.offsetLeft}px)`;
    if (visible) pill.dataset.ready = '1';
    if (!animate) {
        requestAnimationFrame(() => requestAnimationFrame(() => pill.classList.add('seg-pill-anim')));
    }
}

function ntPillSyncAll() {
    ['home-segment'].forEach(id => ntPillSync(document.getElementById(id)));
    ['acc-type-asset', 'btn-expense'].forEach(id => {
        const b = document.getElementById(id);
        if (b) ntPillSync(b.parentElement);
    });
}

// Клик по табу любого сегмента → пилюля едет за активной кнопкой
// (классы кнопкам ставит app.js/ntPaintSeg в том же обработчике).
document.addEventListener('click', e => {
    const btn = e.target.closest('.seg-wrap > button');
    if (!btn) return;
    requestAnimationFrame(() => ntPillSync(btn.parentElement));
});
window.addEventListener('resize', ntPillSyncAll);

// Сегмент может появиться из скрытого состояния (например, шаг 2
// в Add Transaction) без клика и без openModal — ловим смену классов.
let ntPillMoQueued = false;
new MutationObserver(() => {
    if (ntPillMoQueued) return;
    ntPillMoQueued = true;
    requestAnimationFrame(() => { ntPillMoQueued = false; ntPillSyncAll(); });
}).observe(document.body, { subtree: true, attributeFilter: ['class'] });

function ntPaintSeg() {
    const base = 'flex-1 h-[44px] rounded-full text-[16px] font-semibold leading-[19px] transition-colors ';
    const a = document.getElementById('seg-asset');
    const d = document.getElementById('seg-debt');
    if (a) a.className = base + (ntSeg === 'asset' ? 'text-white' : 'text-[#8B93A7]');
    if (d) d.className = base + (ntSeg === 'debt' ? 'text-white' : 'text-[#8B93A7]');
    ntPillSync(document.getElementById('home-segment'));
}

// Белая версия иконки счёта (для водяных знаков и тёмных кругов)
function ntWhiteIcon(key, size) {
    return accountIcon(key, size).replaceAll('url(#kopilkaGlass)', '#F5F7FA');
}

// Карточка Add account: 200px высотой, заголовок + белая иконка
// кошелька 56×56 справа, сабтитр, стеклянная кнопка "+ Add Account"
// прижата к низу (отступы карточки 20)
function ntAddCardHTML() {
    return `
        <div class="glass-ui rounded-[32px] p-5 h-[200px] flex flex-col">
            <div class="flex justify-between items-start">
                <div>
                    <h2 class="text-[20px] font-semibold leading-[24px]">${ntT('addAccountCardTitle')}</h2>
                    <p class="mt-2 text-[#8B93A7] text-[14px] leading-[17px]">${ntT('addAccountCardSub')}</p>
                </div>
                ${ntWhiteIcon('back', 56)}
            </div>
            <button type="button" onclick="openAccountModal()" class="mt-auto w-full h-[44px] rounded-full glass-ui text-[#F5F7FA] font-semibold text-[16px] leading-[19px] flex items-center justify-center gap-2 active:scale-95 transition-transform">
                ${SVG_PLUS_16} ${ntT('addAccount')}
            </button>
        </div>`;
}

// --- СЧЕТА: один счёт — карточка на всю ширину; два и больше —
// карусель 170×190 (сумма сверху, водяной знак по центру, имя снизу).
// Пустой сегмент → карточка Add account ---
function ntRenderAccounts() {
    ntPaintSeg();
    const box = document.getElementById('home-accounts');
    if (!box) return;

    const filtered = accounts.filter(a => a.type === ntSeg);
    if (filtered.length === 0) {
        box.innerHTML = ntAddCardHTML();
        return;
    }

    const single = filtered.length === 1;
    let html = single ? '' : '<div class="cards-row">';
    filtered.forEach(acc => {
        const cur = acc.currencies[0] || 'USD';
        const sym = ntSym(cur);
        const main = acc.balances[cur] || 0;
        const parts = getMoneyParts(main);
        const sign = (acc.type === 'debt' && main !== 0) || main < 0 ? '−' : '';
        html += `
            <button type="button" onclick="openAccountDetail('${acc.id}')" class="acc-card ${single ? 'acc-card--single' : ''} glass-ui rounded-[28px] p-4 relative overflow-hidden text-left active:scale-95 transition-transform">
                <p class="relative text-[20px] font-bold leading-[24px]">${sign}${parts.integer}<span class="text-[#8B93A7] text-[15px] font-semibold">,${parts.decimal} ${sym}</span></p>
                <div class="acc-card-icon">${ntWhiteIcon(acc.icon, 64)}</div>
                <p class="relative text-[15px] font-medium leading-[18px] truncate">${acc.name}</p>
            </button>`;
    });
    if (!single) html += '</div>';
    box.innerHTML = html;
}

// --- NET WORTH + ДЕЛЬТА (всегда видимы, в основной валюте с конвертацией) ---
function ntRenderNetWorth() {
    const netWorth = accounts.filter(a => a.type === 'asset').reduce((s, a) => s + ntAccountTotalMain(a), 0)
        - accounts.filter(a => a.type === 'debt').reduce((s, a) => s + ntAccountTotalMain(a), 0);
    const sym = ntSym(ntSettings.currency);

    const nwEl = document.getElementById('net-worth-amount');
    if (nwEl) {
        if (netWorth === 0) {
            nwEl.innerHTML = `0<span class="text-[#8B93A7] text-[36px] leading-[44px]"> ${sym}</span>`;
        } else {
            const parts = getMoneyParts(netWorth);
            const sign = netWorth < 0 ? '−' : '';
            nwEl.innerHTML = `${sign}${parts.integer}<span class="text-[#8B93A7] text-[36px] leading-[44px]">,${parts.decimal} ${sym}</span>`;
        }
    }

    const deltaRow = document.getElementById('delta-row');
    const deltaEl = document.getElementById('net-worth-delta');
    const periodEl = document.getElementById('delta-period');
    if (deltaRow && deltaEl) {
        deltaRow.classList.remove('hidden');
        const period = ntDeltaPeriod();
        const since = Date.now() - period.ms;
        const delta = transactions
            .filter(t => new Date(t.date).getTime() >= since)
            .reduce((s, t) => s + (t.type === 'income' ? 1 : -1) * ntConvert(t.amount, t.currency), 0);
        deltaEl.className = delta > 0 ? 'text-[#2ECC71]' : (delta < 0 ? 'text-[#FF6B6B]' : 'text-[#F5F7FA]');
        deltaEl.innerText = delta === 0
            ? `0 ${sym}`
            : `${delta > 0 ? '+' : '−'}${formatMoney(delta)} ${sym}`;
        if (periodEl) {
            periodEl.innerText = period.label[ntSettings.lang] || period.label.en;
            periodEl.className = 'text-[#8B93A7] ml-1';
        }
    }
}

// --- СТРОКА ОПЕРАЦИИ (общая для Home и History) ---
function ntTxRowHTML(tx) {
    const acc = accounts.find(a => a.id === tx.accountId);
    if (!acc) return '';
    const income = tx.type === 'income';
    const color = income ? 'text-[#2ECC71]' : 'text-white';
    const sign = income ? '+' : '−';
    const time = new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `
        <div class="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-11 h-11 rounded-full bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-white flex-none">${ntWhiteIcon(acc.icon, 20)}</div>
                <div class="min-w-0">
                    <p class="font-medium text-[16px] truncate">${acc.name}</p>
                    <p class="text-[#8B93A7] text-[13px] truncate">${tx.category || ntT('other')}</p>
                </div>
            </div>
            <div class="text-right flex-none pl-3">
                <p class="${color} font-medium text-[16px]">${sign}${formatMoney(tx.amount)} ${ntSym(tx.currency)}</p>
                <p class="text-[#8B93A7] text-[13px]">${time}</p>
            </div>
        </div>`;
}

// --- OPERATIONS: 3 последние + провал в History. Пусто — блок скрыт ---
function ntRenderOperations() {
    const block = document.getElementById('block-operations');
    const head = document.getElementById('home-operations-head');
    const list = document.getElementById('home-operations-list');
    if (!block || !head || !list) return;

    if (transactions.length === 0) {
        block.style.display = 'none';
        return;
    }
    block.style.display = 'block';

    head.innerHTML = `
        <button type="button" onclick="switchTab('history')" class="w-full flex justify-between items-center mb-2 active:opacity-70 transition-opacity">
            <h2 class="text-[20px] font-semibold leading-[24px]">${ntT('operations')}</h2>
            <i class="ph ph-caret-right text-[20px] text-[#8B93A7]"></i>
        </button>`;

    list.innerHTML = '';
    transactions.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3).forEach(tx => {
        list.innerHTML += ntTxRowHTML(tx);
    });
}

// --- HISTORY: дневные группы, заголовок 22px + итог дня справа ---
function ntDayLabel(ts) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(ts); day.setHours(0, 0, 0, 0);
    const diff = Math.round((today - day) / 86400000);
    if (diff === 0) return ntT('today');
    if (diff === 1) return ntT('yesterday');
    return day.toLocaleDateString(ntSettings.lang || 'en', { day: 'numeric', month: 'long' });
}

renderHistory = function () {
    const list = document.getElementById('history-list');
    if (!list) return;
    if (transactions.length === 0) {
        list.innerHTML = '';
        return;
    }
    const groups = {};
    transactions.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(tx => {
        const d = new Date(tx.date); d.setHours(0, 0, 0, 0);
        const key = d.getTime();
        if (!groups[key]) groups[key] = [];
        groups[key].push(tx);
    });
    const sym = ntSym(ntSettings.currency);
    let html = '';
    Object.keys(groups).sort((a, b) => b - a).forEach(key => {
        const txs = groups[key];
        const total = txs.reduce((s, t) => s + (t.type === 'income' ? 1 : -1) * ntConvert(t.amount, t.currency), 0);
        const totalColor = total > 0 ? 'text-[#2ECC71]' : 'text-[#8B93A7]';
        const totalSign = total > 0 ? '+' : (total < 0 ? '−' : '');
        html += `
            <div class="flex justify-between items-baseline mt-6 mb-1 first:mt-0">
                <h3 class="text-[22px] font-semibold tracking-tight">${ntDayLabel(Number(key))}</h3>
                <span class="${totalColor} text-[16px] font-medium">${totalSign}${formatMoney(total)} ${sym}</span>
            </div>`;
        txs.forEach(tx => { html += ntTxRowHTML(tx); });
    });
    list.innerHTML = html;
};

// --- PROFILE: значения настроек в карточке ---
function ntRenderProfileValues() {
    const langEl = document.getElementById('profile-lang-value');
    const curEl = document.getElementById('profile-currency-value');
    if (langEl) {
        const l = NT_LANGS.find(x => x.code === ntSettings.lang);
        langEl.innerText = l ? l.native : ntSettings.lang;
    }
    if (curEl) curEl.innerText = ntSettings.currency;
}

function openProfile() {
    ntRenderProfileValues();
    switchTab('profile');
}

function resetAllData() {
    if (!confirm(ntT('resetConfirm'))) return;
    accounts = [];
    transactions = [];
    saveData();
    renderHome();
    renderAccounts();
    renderHistory();
    switchTab('home');
}

// --- LANGUAGE ---
function ntRenderLanguage() {
    const list = document.getElementById('language-list');
    if (!list) return;
    list.innerHTML = NT_LANGS.map(l => `
        <button type="button" onclick="ntSetLang('${l.code}')" class="w-full flex items-center justify-between py-4 border-b border-white/5 last:border-0 active:opacity-70 transition-opacity">
            <span class="text-left">
                <span class="block text-[17px] font-medium">${l.native}</span>
                <span class="block text-[15px] text-[#8B93A7]">${l.name[ntSettings.lang] || l.name.en}</span>
            </span>
            ${ntSettings.lang === l.code ? '<i class="ph ph-check text-[22px] text-white"></i>' : ''}
        </button>`).join('');
}

function ntSetLang(code) {
    ntSettings.lang = code;
    ntSaveSettings();
    ntApplyAll();
}

// --- CURRENCY ---
function ntRenderCurrency() {
    const list = document.getElementById('currency-list');
    if (!list) return;
    list.innerHTML = NT_CURS.map(c => `
        <button type="button" onclick="ntSetCurrency('${c.code}')" class="w-full flex items-center gap-3 py-3 border-b border-white/5 last:border-0 active:opacity-70 transition-opacity">
            <span class="nt-flag">${ntFlagHTML(c)}</span>
            <span class="flex-1 text-left">
                <span class="block text-[17px] font-medium">${c.name[ntSettings.lang] || c.name.en}</span>
                <span class="block text-[15px] text-[#8B93A7]">${c.code}</span>
            </span>
            ${ntSettings.currency === c.code ? '<i class="ph ph-check text-[22px] text-white"></i>' : ''}
        </button>`).join('');
}

function ntSetCurrency(code) {
    ntSettings.currency = code;
    ntSaveSettings();
    ntApplyAll();
}

// --- i18n статики + полный перерендер ---
function ntApplyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(el => { el.innerText = ntT(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = ntT(el.dataset.i18nPh); });
}

function ntApplyAll() {
    ntApplyI18n();
    renderHeader(ntTab);
    ntOnScroll();
    renderHome();
    renderHistory();
    ntRenderProfileValues();
    ntRenderLanguage();
    ntRenderCurrency();
}

// --- ACCOUNT DETAIL: тёмный круг + белая иконка, балансы со знаком валюты ---
function openAccountDetail(id) {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;

    document.getElementById('ad-header-name').innerText = acc.name;
    document.getElementById('ad-name').innerText = acc.name;
    document.getElementById('ad-icon').innerHTML = ntWhiteIcon(acc.icon, 28);

    const balancesEl = document.getElementById('ad-balances');
    balancesEl.innerHTML = '';
    acc.currencies.forEach(cur => {
        const balance = acc.balances[cur] || 0;
        const parts = getMoneyParts(balance);
        const sign = balance < 0 ? '−' : '';
        balancesEl.innerHTML += `
            <div class="glass-ui rounded-[20px] px-5 h-[64px] flex items-center mb-3">
                <p class="font-semibold text-[24px]">
                    <span class="text-[#F5F7FA]">${sign}${parts.integer}</span><span class="text-[#8B93A7] text-[16px]">,${parts.decimal} ${ntSym(cur)}</span>
                </p>
            </div>
        `;
    });

    document.getElementById('ad-edit-btn').onclick = () => {
        closeModal('modal-account-detail');
        setTimeout(() => openEditAccount(id), 400);
    };

    openModal('modal-account-detail');
}

// --- ADD/EDIT ACCOUNT: локализованный заголовок,
// в режиме редактирования крестик меняем на шеврон (по макету) ---
const __ntOpenAccountModal = openAccountModal;
openAccountModal = function () {
    __ntOpenAccountModal();
    document.getElementById('acc-modal-title').innerText = ntT('addAccount');
    ntSetAccCloseIcon('x');
};

const __ntOpenEditAccount = openEditAccount;
openEditAccount = function (id) {
    __ntOpenEditAccount(id);
    document.getElementById('acc-modal-title').innerText = ntT('editAccount');
    ntSetAccCloseIcon('back');
};

function ntSetAccCloseIcon(mode) {
    const btn = document.getElementById('acc-close-btn');
    if (!btn) return;
    btn.innerHTML = mode === 'back' ? '<i class="ph ph-caret-left text-xl"></i>' : '<i class="ph ph-x text-xl"></i>';
}

// Пикер иконок: белые глифы на тёмных кругах (по макету),
// выбранная — синий круг
renderIconPicker = function () {
    const picker = document.getElementById('acc-icon-picker');
    if (!picker) return;
    picker.innerHTML = '';
    Object.keys(ACCOUNT_ICONS).forEach(key => {
        const isActive = key === selectedIcon;
        const cls = isActive
            ? 'w-11 h-11 rounded-full bg-[#4C8DFF] text-white flex items-center justify-center active:scale-95 transition-transform'
            : 'w-11 h-11 rounded-full bg-[rgba(255,255,255,0.06)] text-white flex items-center justify-center active:scale-95 transition-transform';
        picker.innerHTML += `<button type="button" onclick="setAccIcon('${key}')" class="${cls}">${ntWhiteIcon(key, 20)}</button>`;
    });
};

// --- КЛАВИАТУРА iOS: лист уходит ПОД клавиатуру, а не ужимается над ней.
// bottom листа всегда 0 — нижняя часть просто скрыта за клавой, поэтому
// полосы обрезанного фона между клавой и листом не существует в принципе.
// Скролл сохраняется: телу листа добавляем паддинг на высоту клавиатуры,
// контент долистывается над нею. Если iOS спаннил вьюпорт (offsetTop>0) —
// поднимаем верх листа, чтобы шапка не уехала за экран. ---
let ntKbActive = false;

function ntKbSync() {
    const vv = window.visualViewport;
    const container = document.querySelector('.app-container');
    const overlay = document.querySelector('.modal-overlay.active');
    if (!vv || !container || !overlay) return;
    if (!ntKbActive) return;
    const sheet = overlay.querySelector('.modal-sheet');
    const body = overlay.querySelector('.modal-body');
    if (!sheet) return;
    const contH = container.clientHeight;
    const covered = Math.max(0, contH - (vv.offsetTop + vv.height));
    sheet.style.top = `calc(env(safe-area-inset-top, 0px) + ${10 + vv.offsetTop}px)`;
    sheet.style.bottom = '0px';
    if (body) body.style.paddingBottom = `calc(48px + ${covered}px)`;
}

// Фокусное поле над клавиатурой (после того как вьюпорт устаканился)
function ntKbScrollIntoView() {
    const el = document.activeElement;
    if (el && el.matches && el.matches('.modal-overlay input, .modal-overlay textarea')) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
}

function ntKbRestoreAll() {
    document.querySelectorAll('.modal-sheet').forEach(sheet => {
        sheet.style.top = '';
        sheet.style.bottom = '';
    });
    document.querySelectorAll('.modal-body').forEach(body => {
        body.style.paddingBottom = '';
    });
}

document.addEventListener('focusin', e => {
    if (!e.target.matches('.modal-overlay input, .modal-overlay textarea')) return;
    ntKbActive = true;
    ntKbSync();
    setTimeout(ntKbScrollIntoView, 350);
});

document.addEventListener('focusout', () => {
    // фокус мог уйти на другое поле той же модалки — проверяем с задержкой
    setTimeout(() => {
        const el = document.activeElement;
        if (el && el.matches && el.matches('.modal-overlay input, .modal-overlay textarea')) return;
        ntKbActive = false;
        ntKbRestoreAll();
    }, 50);
});

if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
        if (!ntKbActive) return;
        ntKbSync();
        setTimeout(ntKbScrollIntoView, 120);
    });
    window.visualViewport.addEventListener('scroll', () => { if (ntKbActive) ntKbSync(); });
}

// --- СТАТУС-БАР: полоса-источник цвета темнеет под открытой модалкой,
// чтобы зона статус-бара не выбивалась из затемнённого экрана (iOS 26.1+/27
// красит её в цвет верхнего fixed-элемента — синкаем с бэкдропом 50% чёрного
// поверх #171A1F ≈ #0C0D10) ---
function ntTintSync() {
    const tint = document.getElementById('nt-statusbar-tint');
    if (tint) tint.classList.toggle('dimmed', !!document.querySelector('.modal-overlay.active'));
}

// При открытии модалки пилюля встаёт на активную табу (без анимации):
// setAccType/setTxType в app.js отрабатывают до того, как лист стал видимым.
const __ntOpenModal = openModal;
openModal = function (id) {
    __ntOpenModal(id);
    requestAnimationFrame(() => requestAnimationFrame(() => { ntPillSyncAll(); ntTintSync(); }));
};

const __ntCloseModal = closeModal;
closeModal = function (id) {
    ntKbActive = false;
    ntKbRestoreAll();
    __ntCloseModal(id);
    ntTintSync();
};

// --- RENDER HOME: ядро + наши блоки ---
const __ntRenderHome = renderHome;
renderHome = function () {
    __ntRenderHome();
    // Net Worth виден всегда — пустое состояние по макету идёт с нулевым NW
    setBlock(document.getElementById('block-networth'), true, 'flex');
    ntRenderNetWorth();
    ntRenderAccounts();
    ntRenderOperations();
    ntUpdateFab();
};

function initNoTabbar() {
    ntApplyI18n();
    ntFetchRates();
    renderHome();
    renderAccounts();
    renderHistory();
    ntRenderProfileValues();
    ntRenderLanguage();
    ntRenderCurrency();
    switchTab('home');
    const scroller = document.getElementById('app-content');
    if (scroller) scroller.addEventListener('scroll', ntOnScroll, { passive: true });
}
window.onload = initNoTabbar;

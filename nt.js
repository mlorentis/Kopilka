// --- NO-TABBAR OVERRIDE v7 (после app.js) ---
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
const NT_CURRENCY_SYMBOLS = { USD: '$', EUR: '€', RUB: '₽' };
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
    }
};
function ntT(key) {
    return (NT_STRINGS[ntSettings.lang] && NT_STRINGS[ntSettings.lang][key]) || NT_STRINGS.en[key] || key;
}

const NT_LANGS = [
    { code: 'en', native: 'English', name: { en: 'English', ru: 'Английский' } },
    { code: 'ru', native: 'Русский', name: { en: 'Russian', ru: 'Русский' } }
];
const NT_CURS = [
    { code: 'USD', flag: '🇺🇸', name: { en: 'US Dollar', ru: 'Доллар США' } },
    { code: 'EUR', flag: '🇪🇺', name: { en: 'Euro', ru: 'Евро' } },
    { code: 'RUB', flag: '🇷🇺', name: { en: 'Russian Ruble', ru: 'Российский рубль' } }
];

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
        header.innerHTML = `${back('profile')}<span class="hdr-title">${ntT(tab)}</span><div class="w-11"></div>`;
        return;
    }
    header.innerHTML = `
        ${ntCircleBtn("switchTab('profile')", 'Profile', '<span class="text-[20px] font-semibold leading-[24px]">M</span>')}
        ${ntCircleBtn('openAccountModal()', 'Add account', '<i class="ph ph-plus text-[24px]"></i>')}
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
    const fab = document.getElementById('fab-add');
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

function ntPaintSeg() {
    const on = 'flex-1 rounded-full text-[15px] font-medium transition-all bg-[#2E333B] text-white shadow-sm';
    const off = 'flex-1 rounded-full text-[15px] font-medium transition-all text-[#8B93A7]';
    const a = document.getElementById('seg-asset');
    const d = document.getElementById('seg-debt');
    if (a) a.className = ntSeg === 'asset' ? on : off;
    if (d) d.className = ntSeg === 'debt' ? on : off;
}

// Белая версия иконки счёта (для водяных знаков и тёмных кругов)
function ntWhiteIcon(key, size) {
    return accountIcon(key, size).replaceAll('url(#kopilkaGlass)', '#F5F7FA');
}

// Карточка Add account: заголовок + белая иконка кошелька справа,
// сабтитр, во всю ширину кнопка "+ Add Account"
function ntAddCardHTML() {
    return `
        <div class="glass-ui rounded-[24px] p-5">
            <div class="flex justify-between items-center mb-1">
                <h2 class="text-[20px] font-semibold">${ntT('addAccountCardTitle')}</h2>
                ${ntWhiteIcon('back', 28)}
            </div>
            <p class="text-[#8B93A7] text-[14px] leading-[20px] mb-5 pr-16">${ntT('addAccountCardSub')}</p>
            <button type="button" onclick="openAccountModal()" class="w-full h-11 rounded-full bg-[rgba(255,255,255,0.06)] text-white font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-transform">
                ${SVG_PLUS_16} ${ntT('addAccount')}
            </button>
        </div>`;
}

// --- СЧЕТА: карусель 170×190 — сумма сверху, водяной знак по центру,
// имя снизу. Пустой сегмент → карточка Add account ---
function ntRenderAccounts() {
    ntPaintSeg();
    const box = document.getElementById('home-accounts');
    if (!box) return;

    const filtered = accounts.filter(a => a.type === ntSeg);
    if (filtered.length === 0) {
        box.innerHTML = ntAddCardHTML();
        return;
    }

    let html = '<div class="cards-row">';
    filtered.forEach(acc => {
        const cur = acc.currencies[0] || 'USD';
        const sym = ntSym(cur);
        const main = acc.balances[cur] || 0;
        const parts = getMoneyParts(main);
        const sign = (acc.type === 'debt' && main !== 0) || main < 0 ? '−' : '';
        html += `
            <button type="button" onclick="openAccountDetail('${acc.id}')" class="acc-card glass-ui rounded-[28px] p-4 relative overflow-hidden text-left active:scale-95 transition-transform">
                <p class="relative text-[20px] font-bold leading-[24px]">${sign}${parts.integer}<span class="text-[#8B93A7] text-[15px] font-semibold">,${parts.decimal} ${sym}</span></p>
                <div class="acc-card-icon">${ntWhiteIcon(acc.icon, 64)}</div>
                <p class="relative text-[15px] font-medium leading-[18px] truncate">${acc.name}</p>
            </button>`;
    });
    html += '</div>';
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
        deltaEl.className = delta > 0 ? 'text-[#2ECC71]' : (delta < 0 ? 'text-[#FF6B6B]' : 'text-[#8B93A7]');
        deltaEl.innerText = delta === 0
            ? `0 ${sym}`
            : `${delta > 0 ? '+' : '−'}${formatMoney(delta)} ${sym}`;
        if (periodEl) periodEl.innerText = period.label[ntSettings.lang] || period.label.en;
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
            <h2 class="text-[20px] font-semibold">${ntT('operations')}</h2>
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
    return day.toLocaleDateString(ntSettings.lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long' });
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
            <span class="nt-flag">${c.flag}</span>
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

const __ntCloseModal = closeModal;
closeModal = function (id) {
    ntKbActive = false;
    ntKbRestoreAll();
    __ntCloseModal(id);
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

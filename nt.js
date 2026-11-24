// --- NO-TABBAR OVERRIDE v2 (после app.js) ---
// Архитектура: один скролл на Home (Net Worth → сегмент Asset/Debt →
// карусель счетов → Operations), History и Profile — отдельные страницы
// с шевроном назад, FAB "+" — добавление транзакции, "+" в шапке — счёт.
const NT_SCREENS = ['home', 'history', 'profile'];
let ntSeg = 'asset';
let ntTab = 'home';

const NT_CURRENCY_SYMBOLS = { USD: '$', EUR: '€', RUB: '₽' };

function ntScrollTop() {
    const scroller = document.getElementById('app-content');
    if (scroller) scroller.scrollTop = 0;
    window.scrollTo(0, 0);
}

function ntCircleBtn(onclick, label, inner) {
    return `<button type="button" onclick="${onclick}" aria-label="${label}" class="w-11 h-11 rounded-full glass-ui flex items-center justify-center active:scale-95 transition-transform pointer-events-auto">${inner}</button>`;
}

function renderHeader(tab) {
    const header = document.getElementById('main-header-inner');
    if (!header) return;
    if (tab === 'history') {
        header.innerHTML = `
            ${ntCircleBtn("switchTab('home')", 'Back', '<i class="ph ph-caret-left text-[24px]"></i>')}
            <h1 class="text-[24px] font-bold tracking-tight h-11 flex items-center">History</h1>
            <div class="w-11"></div>
        `;
        return;
    }
    if (tab === 'profile') {
        header.innerHTML = `
            ${ntCircleBtn("switchTab('home')", 'Back', '<i class="ph ph-caret-left text-[24px]"></i>')}
            <h1 class="text-[24px] font-bold tracking-tight h-11 flex items-center">Profile</h1>
            <div class="w-11"></div>
        `;
        return;
    }
    header.innerHTML = `
        ${ntCircleBtn("switchTab('profile')", 'Profile', '<span class="text-[20px] font-semibold leading-[24px]">M</span>')}
        ${ntCircleBtn('openAccountModal()', 'Add account', '<i class="ph ph-plus text-[24px]"></i>')}
    `;
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
}

// --- FAB: виден на Home и History, когда есть счета ---
function ntUpdateFab() {
    const fab = document.getElementById('fab-add');
    if (!fab) return;
    const show = accounts.length > 0 && (ntTab === 'home' || ntTab === 'history');
    fab.style.display = show ? 'flex' : 'none';
}

// --- СЕГМЕНТ ASSET / DEBT ---
function ntSetSeg(seg) {
    ntSeg = seg;
    ntRenderAccounts();
}

function ntPaintSeg() {
    const on = 'flex-1 rounded-full text-[15px] font-medium transition-all bg-[#27292E] text-white shadow-sm';
    const off = 'flex-1 rounded-full text-[15px] font-medium transition-all text-[#8B93A7]';
    const a = document.getElementById('seg-asset');
    const d = document.getElementById('seg-debt');
    if (a) a.className = ntSeg === 'asset' ? on : off;
    if (d) d.className = ntSeg === 'debt' ? on : off;
}

// --- СЧЕТА: карусель карточек / пустая карточка ---
function ntRenderAccounts() {
    ntPaintSeg();
    const box = document.getElementById('home-accounts');
    if (!box) return;

    if (accounts.length === 0) {
        box.innerHTML = `
            <div class="glass-ui rounded-[32px] p-6 flex flex-col items-center text-center">
                <div class="w-14 h-14 rounded-full glass-ui flex items-center justify-center text-white mb-4">${accountIcon('cash', 24)}</div>
                <h2 class="text-[20px] font-semibold mb-2">Add account</h2>
                <p class="text-[#8B93A7] text-[14px] leading-[20px] mb-5">Track cash, cards, or crypto in one place</p>
                <button type="button" onclick="openAccountModal()" class="bg-[#4C8DFF] text-white font-semibold text-[15px] h-[44px] px-6 rounded-full flex items-center gap-2 active:scale-95 transition-transform">
                    ${SVG_PLUS_16} Add Account
                </button>
            </div>`;
        return;
    }

    const filtered = accounts.filter(a => a.type === ntSeg);
    let html = '<div class="cards-row">';
    filtered.forEach(acc => {
        const cur = acc.currencies[0] || 'USD';
        const sym = NT_CURRENCY_SYMBOLS[cur] || cur;
        const main = acc.balances[cur] || 0;
        const parts = getMoneyParts(main);
        const sign = (acc.type === 'debt' ? '−' : '');
        const extra = acc.currencies.slice(1)
            .map(c => `<p class="text-[13px] text-[#8B93A7] leading-[16px]">${sign}${formatMoney(acc.balances[c] || 0)} ${NT_CURRENCY_SYMBOLS[c] || c}</p>`)
            .join('');
        html += `
            <button type="button" onclick="openAccountDetail('${acc.id}')" class="acc-card glass-ui rounded-[24px] p-4 flex flex-col justify-between text-left active:scale-95 transition-transform">
                <div class="w-9 h-9 rounded-full glass-ui flex items-center justify-center text-white flex-none">${accountIcon(acc.icon, 18)}</div>
                <div class="min-w-0">
                    <p class="text-[20px] font-bold leading-[24px] truncate">${sign}${parts.integer}<span class="text-[#8B93A7] text-[15px] font-semibold">,${parts.decimal} ${sym}</span></p>
                    ${extra}
                    <p class="text-[14px] text-[#8B93A7] leading-[18px] truncate mt-1">${acc.name}</p>
                </div>
            </button>`;
    });
    html += `
            <button type="button" onclick="openAccountModal()" class="acc-card acc-card-add rounded-[24px] flex flex-col items-center justify-center gap-2 text-[#8B93A7] active:scale-95 transition-transform">
                <i class="ph ph-plus text-[24px]"></i>
                <span class="text-[14px] font-medium">Add</span>
            </button>
        </div>`;
    box.innerHTML = html;
}

// --- OPERATIONS: 3 последние + провал в History ---
function ntRenderOperations() {
    const head = document.getElementById('home-operations-head');
    const list = document.getElementById('home-operations-list');
    if (!head || !list) return;

    head.innerHTML = `
        <button type="button" onclick="switchTab('history')" class="w-full flex justify-between items-center mb-2 active:opacity-70 transition-opacity">
            <h2 class="text-[20px] font-semibold">Operations</h2>
            <i class="ph ph-caret-right text-[20px] text-[#8B93A7]"></i>
        </button>`;

    if (transactions.length === 0) {
        list.innerHTML = `
            <div class="py-6 flex flex-col items-center text-center">
                <p class="text-[#F5F7FA] text-[16px] font-semibold mb-1">No transactions yet</p>
                <p class="text-[#8B93A7] text-[14px] leading-[20px] mb-5">Add your first income or expense to see it here</p>
                ${accounts.length > 0 ? `<button type="button" onclick="openTxModal()" class="bg-[#4C8DFF] text-white font-semibold text-[15px] h-[42px] px-5 rounded-full inline-flex items-center gap-2 active:scale-95 transition-transform">${SVG_PLUS_16} Add Transaction</button>` : ''}
            </div>`;
        return;
    }

    list.innerHTML = '';
    transactions.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3).forEach(tx => {
        const acc = accounts.find(a => a.id === tx.accountId);
        if (!acc) return;
        const income = tx.type === 'income';
        const color = income ? 'text-[#2ECC71]' : 'text-white';
        const sign = income ? '+' : '−';
        const time = new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        list.innerHTML += `
            <div class="flex justify-between items-center py-4 border-b border-white/5 last:border-0">
                <div class="flex items-center gap-4 min-w-0">
                    <div class="w-12 h-12 rounded-full glass-ui flex items-center justify-center text-white flex-none">${accountIcon(acc.icon, 20)}</div>
                    <div class="min-w-0">
                        <p class="font-medium text-[16px] truncate">${acc.name}</p>
                        <p class="text-[#8B93A7] text-[14px] truncate">${tx.category || 'Other'}</p>
                    </div>
                </div>
                <div class="text-right flex-none pl-3">
                    <p class="${color} font-medium text-[16px]">${sign}${formatMoney(tx.amount)} ${tx.currency}</p>
                    <p class="text-[#8B93A7] text-[13px]">${time}</p>
                </div>
            </div>`;
    });
}

// --- PROFILE: страница, не модалка ---
function openProfile() {
    const a = document.getElementById('profile-acc-count');
    const t = document.getElementById('profile-tx-count');
    if (a) a.innerText = accounts.length;
    if (t) t.innerText = transactions.length;
    switchTab('profile');
}

function resetAllData() {
    if (!confirm('Reset all data? Accounts and transactions will be deleted.')) return;
    accounts = [];
    transactions = [];
    saveData();
    renderHome();
    renderAccounts();
    renderHistory();
    switchTab('home');
}

// --- RENDER HOME: ядро + наши блоки ---
const __ntRenderHome = renderHome;
renderHome = function () {
    __ntRenderHome();
    // Net Worth виден всегда — пустое состояние по макету идёт с нулевым NW
    setBlock(document.getElementById('block-networth'), true, 'flex');
    ntRenderAccounts();
    ntRenderOperations();
    ntUpdateFab();
};

function initNoTabbar() {
    renderHome();
    renderAccounts();
    renderHistory();
    switchTab('home');
}
window.onload = initNoTabbar;

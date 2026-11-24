// --- NO-TABBAR OVERRIDE (после app.js) ---
const NT_SCREENS = ['home', 'history'];

function ntScrollTop() {
    const scroller = document.getElementById('app-content');
    if (scroller) scroller.scrollTop = 0;
    window.scrollTo(0, 0);
}

function renderHeader(tab) {
    const header = document.getElementById('main-header-inner');
    if (!header) return;
    if (tab === 'history') {
        header.innerHTML = `
            <button type="button" onclick="switchTab('home')" aria-label="Back" class="w-11 h-11 rounded-full glass-ui flex items-center justify-center active:scale-95 transition-transform pointer-events-auto">
                <i class="ph ph-caret-left text-[24px]"></i>
            </button>
            <h1 class="text-[24px] font-bold tracking-tight h-11 flex items-center">History</h1>
            ${accounts.length > 0 ? `<button type="button" onclick="openTxModal()" aria-label="Add transaction" class="w-11 h-11 rounded-full glass-ui flex items-center justify-center active:scale-95 transition-transform pointer-events-auto"><i class="ph ph-plus text-[24px]"></i></button>` : `<div class="w-11"></div>`}
        `;
        return;
    }
    header.innerHTML = `
        <button type="button" onclick="openProfile()" aria-label="Profile" class="w-11 h-11 rounded-full glass-ui flex items-center justify-center active:scale-95 transition-transform pointer-events-auto">
            <span class="text-[20px] font-semibold leading-[24px]">M</span>
        </button>
        <button type="button" onclick="switchTab('history')" aria-label="History" class="w-11 h-11 rounded-full glass-ui flex items-center justify-center active:scale-95 transition-transform pointer-events-auto">
            <i class="ph ph-clock-counter-clockwise text-[24px]"></i>
        </button>
    `;
}

function switchTab(tab) {
    if (tab === 'accounts') tab = 'home';
    NT_SCREENS.forEach(t => {
        const screen = document.getElementById(`screen-${t}`);
        if (screen) screen.classList.toggle('hidden', t !== tab);
    });
    const acc = document.getElementById('screen-accounts');
    if (acc) acc.classList.add('hidden');
    renderHeader(tab);
    ntScrollTop();
}

function renderQuickActions() {
    const box = document.getElementById('home-actions');
    if (!box) return;
    if (accounts.length === 0) { box.style.display = 'none'; box.innerHTML = ''; return; }
    box.style.display = 'grid';
    box.innerHTML = `
        <button type="button" onclick="openAccountModal()" class="glass-ui h-[48px] rounded-full px-4 text-white font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-transform">${SVG_PLUS_16} Account</button>
        <button type="button" onclick="openTxModal()" class="bg-[#4C8DFF] h-[48px] rounded-full px-4 text-white font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-transform">${SVG_PLUS_16} Transaction</button>
    `;
}

function renderRecent() {
    const block = document.getElementById('block-recent');
    const list = document.getElementById('home-recent-list');
    if (!block || !list) return;
    if (accounts.length === 0) { block.style.display = 'none'; list.innerHTML = ''; return; }
    block.style.display = 'block';
    if (transactions.length === 0) {
        list.innerHTML = `
            <div class="glass-ui rounded-[28px] p-5 text-center">
                <p class="text-[#F5F7FA] text-[16px] font-semibold mb-1">No transactions yet</p>
                <p class="text-[#8B93A7] text-[14px] mb-4">Add income or expense for this account</p>
                <button type="button" onclick="openTxModal()" class="bg-[#4C8DFF] text-white font-semibold text-[15px] h-[42px] px-5 rounded-full inline-flex items-center gap-2 active:scale-95 transition-transform">${SVG_PLUS_16} Add Transaction</button>
            </div>`;
        return;
    }
    list.innerHTML = '';
    transactions.slice().reverse().slice(0, 4).forEach(tx => {
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

const __ntRenderHome = renderHome;
renderHome = function () {
    __ntRenderHome();
    renderQuickActions();
    renderRecent();
};

function initNoTabbar() {
    updateFabVisibility();
    renderHome();
    renderAccounts();
    renderHistory();
    switchTab('home');
}
window.onload = initNoTabbar;

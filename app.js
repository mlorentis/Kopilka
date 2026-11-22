// --- 1. ХРАНИЛИЩЕ ДАННЫХ ---
const defaultAccounts = [
    { id: '1', name: 'US Dollar', group: 'Cash', type: 'asset', balance: 998.45, currency: 'USD' },
    { id: '2', name: 'Euro', group: 'Cash', type: 'asset', balance: 98.45, currency: 'EUR' },
    { id: '3', name: 'Ruble', group: 'Cash', type: 'asset', balance: 98.45, currency: 'RUB' },
    { id: '4', name: 'Visa Platinum', group: 'Bank Accounts', type: 'asset', balance: 5000, currency: 'USD' },
];

const defaultTransactions = [
    { id: '1', accountId: '1', type: 'income', amount: 100, category: 'Salary', date: new Date().toISOString() },
    { id: '2', accountId: '1', type: 'expense', amount: 20, category: 'Food', date: new Date().toISOString() },
];

// Если в localStorage пусто (или null), берем дефолтные данные
let accounts = JSON.parse(localStorage.getItem('accounts'));
if (!accounts || accounts.length === 0) {
    accounts = defaultAccounts;
    localStorage.setItem('accounts', JSON.stringify(accounts));
}

let transactions = JSON.parse(localStorage.getItem('transactions'));
if (!transactions || transactions.length === 0) {
    transactions = defaultTransactions;
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

let currentTxType = 'expense';

// --- 2. ФОРМАТИРОВАНИЕ ---
function getMoneyParts(amount) {
    const fixed = Math.abs(amount).toFixed(2);
    const [integer, decimal] = fixed.split('.');
    const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return { integer: formattedInteger, decimal: decimal };
}

function formatMoney(amount) {
    const parts = getMoneyParts(amount);
    return `${parts.integer},${parts.decimal}`;
}

// --- 3. ИНИЦИАЛИЗАЦИЯ ---
function init() {
    updateBackgroundState();
    renderHome();
    renderAccounts();
    renderHistory();
    populateAccountSelect();
    switchTab('home'); 
}

// --- 4. СМЕНА ФОНА ---
function updateBackgroundState() {
    const totalAssets = accounts.filter(a => a.type === 'asset').reduce((sum, a) => sum + a.balance, 0);
    const body = document.body;
    body.classList.remove('bg-positive', 'bg-negative', 'bg-neutral');
    
    if (totalAssets > 0) body.classList.add('bg-positive');
    else if (totalAssets < 0) body.classList.add('bg-negative');
    else body.classList.add('bg-neutral');
}

// --- 5. РЕНДЕР ГЛАВНОЙ ---
function renderHome() {
    const totalAssets = accounts.filter(a => a.type === 'asset').reduce((sum, a) => sum + a.balance, 0);
    
    // Net Worth
    const netWorthAmountEl = document.getElementById('net-worth-amount');
    if (netWorthAmountEl) {
        const parts = getMoneyParts(totalAssets);
        const sign = totalAssets < 0 ? '−' : '';
        netWorthAmountEl.innerHTML = `<span>${sign}${parts.integer}</span><span class="text-[36px] leading-[44px]">,${parts.decimal}</span>`;
    }

    // Assets
    const blockAssets = document.getElementById('block-assets');
    const homeList = document.getElementById('home-assets-list');
    const groups = ['Cash', 'Bank Accounts', 'Savings', 'Crypto'];
    let hasAssets = false;
    if (homeList) homeList.innerHTML = '';

    groups.forEach(group => {
        const groupAccounts = accounts.filter(a => a.group === group);
        let groupTotal = groupAccounts.reduce((sum, a) => sum + a.balance, 0);
        
        // Временно оставим фейк для Savings и Crypto, чтобы на скрине было 4 карточки
        if (group === 'Savings') groupTotal = 598.45; 
        if (group === 'Crypto') groupTotal = 598.45; 

        if (groupTotal > 0) {
            hasAssets = true;
            let icon = group === 'Bank Accounts' ? 'ph-credit-card' : group === 'Crypto' ? 'ph-currency-btc' : group === 'Savings' ? 'ph-lock' : 'ph-wallet';
            
            const parts = getMoneyParts(groupTotal);
            const sign = groupTotal < 0 ? '−' : '';

            homeList.innerHTML += `
                <div class="glass-ui rounded-[32px] p-4 w-[200px] h-[200px] flex flex-col justify-between flex-shrink-0">
                    <div class="flex items-center gap-[10px]">
                        <div class="w-[40px] h-[40px] rounded-full glass-ui bg-white/5 flex items-center justify-center text-[20px] text-[#F5F7FA]">
                            <i class="ph ${icon}"></i>
                        </div>
                        <span class="font-medium text-[16px] leading-[19px]">${group}</span>
                    </div>
                    <p class="font-semibold text-[24px] leading-[29px]">
                        <span class="text-[#F5F7FA]">${sign}${parts.integer}</span><span class="text-[#8B93A7] text-[16px] leading-[19px]">,${parts.decimal}</span> <span class="text-[#8B93A7] text-[16px] leading-[19px] ml-[4px]">$</span>
                    </p>
                </div>
            `;
        }
    });
    blockAssets.classList.toggle('hidden', !hasAssets);

    // Owed to me
    const blockOwed = document.getElementById('block-owed');
    const totalOwedEl = document.getElementById('total-owed');
    const totalOwed = 98.45; 
    if (totalOwed > 0) {
        blockOwed.classList.remove('hidden');
        totalOwedEl.innerHTML = `${formatMoney(totalOwed)} <span class="text-[#8B93A7] text-[18px]">$</span>`;
    } else {
        blockOwed.classList.add('hidden');
    }

    // Debts
    const blockDebts = document.getElementById('block-debts');
    const totalDebtsEl = document.getElementById('total-debts');
    const debtsList = document.getElementById('home-debts-list');
    
    const fakeDebts = [
        { id: 'd1', name: 'Credit Cards', balance: 1998.45, icon: 'ph-credit-card' },
        { id: 'd2', name: 'Loans', balance: 61998.45, icon: 'ph-percent' },
        { id: 'd3', name: 'Mortgages', balance: 61998.45, icon: 'ph-house' },
        { id: 'd4', name: 'Borrowed', balance: 61998.45, icon: 'ph-hand-coins' }
    ];

    if (fakeDebts.length > 0) {
        blockDebts.classList.remove('hidden');
        totalDebtsEl.innerText = `−${formatMoney(fakeDebts.reduce((sum, d) => sum + d.balance, 0))} $`;
        
        debtsList.innerHTML = '';
        fakeDebts.forEach(debt => {
            const parts = getMoneyParts(debt.balance);
            
            debtsList.innerHTML += `
                <div class="glass-ui rounded-[32px] p-5 flex flex-col h-[143px] justify-between w-full">
                    <div class="flex items-center gap-3">
                        <div class="w-[44px] h-[44px] rounded-full glass-ui bg-white/5 flex items-center justify-center text-[#FF6B6B]">
                            <i class="ph ${debt.icon} text-[20px]"></i>
                        </div>
                        <span class="font-medium text-[18px]">${debt.name}</span>
                    </div>
                    <p class="font-semibold text-[32px] leading-none">
                        <span class="text-[#F5F7FA]">−${parts.integer}</span><span class="text-[#8B93A7] text-[18px]">,${parts.decimal}</span> <span class="text-[#8B93A7] text-[18px] ml-1">$</span>
                    </p>
                </div>
            `;
        });
    } else {
        blockDebts.classList.add('hidden');
    }
}

// --- 6. РЕНДЕР АККАУНТОВ ---
function renderAccounts() {
    const list = document.getElementById('accounts-list');
    if (!list) return;
    list.innerHTML = '';
    const cashAccounts = accounts.filter(a => a.group === 'Cash'); 
    
    cashAccounts.forEach(acc => {
        let symbol = acc.currency === 'EUR' ? '€' : acc.currency === 'RUB' ? '₽' : '$';
        list.innerHTML += `
            <div class="glass-ui rounded-[32px] p-6 flex flex-col h-[140px] justify-between">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full glass-ui bg-white/5 flex items-center justify-center text-white text-[20px]">${symbol}</div>
                    <span class="font-medium text-[18px]">${acc.name}</span>
                </div>
                <p class="text-[32px] font-bold">${formatMoney(acc.balance)} <span class="text-[#8B93A7] text-[18px]">${acc.currency}</span></p>
            </div>
        `;
    });
}

// --- 7. РЕНДЕР ИСТОРИИ ---
function renderHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;
    list.innerHTML = '';

    let todayTotal = 0;
    transactions.forEach(tx => { todayTotal += tx.type === 'income' ? tx.amount : -tx.amount; });
    
    const totalColor = todayTotal >= 0 ? 'text-[#2ECC71]' : 'text-[#FF6B6B]';
    const totalSign = todayTotal >= 0 ? '+' : '−'; 

    list.innerHTML += `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-[20px] font-semibold">Today</h2>
            <span class="${totalColor} text-[15px] font-medium">${totalSign}${formatMoney(todayTotal)} $</span>
        </div>
    `;

    transactions.slice().reverse().forEach(tx => {
        const acc = accounts.find(a => a.id === tx.accountId);
        if (!acc) return;
        const isIncome = tx.type === 'income';
        const color = isIncome ? 'text-[#2ECC71]' : 'text-white';
        const sign = isIncome ? '+' : '−'; 
        const time = new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        list.innerHTML += `
            <div class="flex justify-between items-center py-4 border-b border-white/5 last:border-0">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-full glass-ui flex items-center justify-center text-white"><i class="ph ph-wallet text-[22px]"></i></div>
                    <div>
                        <p class="font-medium text-[16px]">${acc.name}</p>
                        <p class="text-[#8B93A7] text-[14px]">${tx.category || 'Other'}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="${color} font-medium text-[16px]">${sign}${formatMoney(tx.amount)} ${acc.currency}</p>
                    <p class="text-[#8B93A7] text-[13px]">${time}</p>
                </div>
            </div>
        `;
    });
}

// --- 8. ШАПКА ---
function renderHeader(tab) {
    const header = document.getElementById('main-header');
    if (!header) return;

    const svgIcon = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21.6702 6.9499C21.0302 4.7799 19.2202 2.9699 17.0502 2.3299C15.4002 1.8499 14.2602 1.8899 13.4702 2.4799C12.5202 3.1899 12.4102 4.4699 12.4102 5.3799V7.8699C12.4102 10.3299 13.5302 11.5799 15.7302 11.5799H18.6002C19.5002 11.5799 20.7902 11.4699 21.5002 10.5199C22.1102 9.7399 22.1602 8.5999 21.6702 6.9499Z" fill="#F5F7FA"/>
            <path d="M18.9094 13.3599C18.6494 13.0599 18.2694 12.8899 17.8794 12.8899H14.2994C12.5394 12.8899 11.1094 11.4599 11.1094 9.69991V6.11991C11.1094 5.72991 10.9394 5.34991 10.6394 5.08991C10.3494 4.82991 9.94941 4.70991 9.56941 4.75991C7.21941 5.05991 5.05941 6.34991 3.64941 8.28991C2.22941 10.2399 1.70941 12.6199 2.15941 14.9999C2.80941 18.4399 5.55941 21.1899 9.00941 21.8399C9.55941 21.9499 10.1094 21.9999 10.6594 21.9999C12.4694 21.9999 14.2194 21.4399 15.7094 20.3499C17.6494 18.9399 18.9394 16.7799 19.2394 14.4299C19.2894 14.0399 19.1694 13.6499 18.9094 13.3599Z" fill="#F5F7FA"/>
        </svg>
    `;

    if (tab === 'home') {
        header.innerHTML = `
            <button class="w-[44px] h-[44px] rounded-full glass-ui flex items-center justify-center active:scale-95 transition-transform pointer-events-auto">
                <div class="w-[24px] h-[24px] flex items-center justify-center text-[20px] font-semibold text-[#F5F7FA] leading-[24px]">M</div>
            </button>
            <button class="w-[44px] h-[44px] rounded-full glass-ui flex items-center justify-center active:scale-95 transition-transform pointer-events-auto">
                <div class="w-[24px] h-[24px] flex items-center justify-center">${svgIcon}</div>
            </button>
        `;
    } else if (tab === 'accounts') {
        header.innerHTML = `
            <h1 class="text-[34px] font-bold tracking-tight">Accounts</h1>
            <button onclick="openModal('modal-add-account')" class="w-[44px] h-[44px] rounded-full glass-ui flex items-center justify-center active:scale-95 transition-transform pointer-events-auto">
                <div class="w-[24px] h-[24px] flex items-center justify-center"><i class="ph ph-plus text-[24px] text-[#F5F7FA]"></i></div>
            </button>
        `;
    } else if (tab === 'history') {
        header.innerHTML = `<h1 class="text-[34px] font-bold tracking-tight">History</h1>`;
    }
}

// --- 9. НАВИГАЦИЯ ---
function switchTab(tab) {
    ['home', 'accounts', 'history'].forEach(t => {
        const screen = document.getElementById(`screen-${t}`);
        const btn = document.getElementById(`tab-${t}`);
        if (screen) screen.classList.add('hidden');
        if (btn) { btn.classList.remove('active', 'text-[#4C8DFF]'); btn.classList.add('text-[#8B93A7]'); }
    });

    const activeScreen = document.getElementById(`screen-${tab}`);
    const activeBtn = document.getElementById(`tab-${tab}`);
    if (activeScreen) activeScreen.classList.remove('hidden');
    if (activeBtn) { activeBtn.classList.add('active', 'text-[#4C8DFF]'); activeBtn.classList.remove('text-[#8B93A7]'); }

    renderHeader(tab);
}

// --- 10. МОДАЛКИ ---
function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

// --- 11. ТРАНЗАКЦИИ ---
function setTxType(type) {
    currentTxType = type;
    const btnExp = document.getElementById('btn-expense');
    const btnInc = document.getElementById('btn-income');
    if (!btnExp || !btnInc) return;
    if (type === 'expense') {
        btnExp.className = 'flex-1 py-3 rounded-full bg-[#1A1D24] text-white text-[15px] font-medium shadow-sm transition-all';
        btnInc.className = 'flex-1 py-3 rounded-full text-[#8B93A7] text-[15px] font-medium transition-all';
    } else {
        btnInc.className = 'flex-1 py-3 rounded-full bg-[#1A1D24] text-white text-[15px] font-medium shadow-sm transition-all';
        btnExp.className = 'flex-1 py-3 rounded-full text-[#8B93A7] text-[15px] font-medium transition-all';
    }
}

function populateAccountSelect() {
    const select = document.getElementById('tx-account');
    if (!select) return;
    select.innerHTML = '';
    accounts.forEach(acc => { select.innerHTML += `<option value="${acc.id}" class="bg-[#1A1D24]">${acc.name} (${acc.currency})</option>`; });
}

function saveTransaction() {
    const amountInput = document.getElementById('tx-amount');
    const accountId = document.getElementById('tx-account').value;
    const note = document.getElementById('tx-note').value || 'Other';
    const amount = parseFloat(amountInput.value);

    if (!amount || amount <= 0) { alert('Please enter a valid amount'); return; }

    const newTx = { id: Math.random().toString(), accountId: accountId, type: currentTxType, amount: amount, category: note, date: new Date().toISOString() };
    transactions.push(newTx);
    localStorage.setItem('transactions', JSON.stringify(transactions));

    accounts = accounts.map(acc => {
        if (acc.id === accountId) {
            const newBalance = currentTxType === 'income' ? acc.balance + amount : acc.balance - amount;
            return { ...acc, balance: newBalance };
        }
        return acc;
    });
    localStorage.setItem('accounts', JSON.stringify(accounts));

    amountInput.value = '';
    document.getElementById('tx-note').value = '';
    
    closeModal('modal-add-tx');
    init(); 
    switchTab('home');
}

window.onload = init;
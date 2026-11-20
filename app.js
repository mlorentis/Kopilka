// --- 1. ХРАНИЛИЩЕ ДАННЫХ ---
// Модель v2: счёт мультивалютный — currencies[] + balances{currency: amount}
let accounts = JSON.parse(localStorage.getItem('accounts')) || [];
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

// Миграция: старая схема (currency/balance) несовместима — сбрасываем
if (accounts.length > 0 && !Array.isArray(accounts[0].currencies)) {
    accounts = [];
    transactions = [];
}

function saveData() {
    localStorage.setItem('accounts', JSON.stringify(accounts));
    localStorage.setItem('transactions', JSON.stringify(transactions));
}
saveData();

// --- СОСТОЯНИЕ ---
let currentTxType = 'expense';
let editingAccountId = null;   // null = режим создания счёта
let selectedIcon = 'wallet';   // иконка выбранная в модалке счёта
let selectedCurrencies = [];   // валюты выбранные в модалке счёта
let activeAccountTab = 'asset';// сегмент Assets/Debts на экране Accounts
let debtsCollapsed = true;     // секция Debts на Home свёрнута по умолчанию
let txAccountId = null;        // счёт выбранный в транзакции (шаг 1)
let txCurrency = null;         // валюта транзакции (шаг 2)

// Набор иконок счёта (позже заменим на SVG-коды Михаила)
const ACCOUNT_ICONS = {
    wallet: 'ph-wallet',
    card: 'ph-credit-card',
    percent: 'ph-percent',
    bank: 'ph-bank',
    bookmark: 'ph-bookmark-simple',
    house: 'ph-house'
};
const CURRENCIES = ['USD', 'EUR', 'RUB'];
const currencySymbols = { USD: '$', EUR: '€', RUB: '₽' };

// SVG-иконки (из макетов Михаила)
const SVG_EMPTY_ICON = `<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M40.3341 20.1117V23.8884C40.3341 24.8967 39.5274 25.7217 38.5007 25.7584H34.9074C32.9274 25.7584 31.1124 24.31 30.9474 22.33C30.8374 21.175 31.2774 20.0934 32.0474 19.3417C32.7257 18.645 33.6607 18.2417 34.6874 18.2417H38.5007C39.5274 18.2784 40.3341 19.1034 40.3341 20.1117Z" fill="#F5F7FA"/>
    <path d="M37.5287 28.5082H34.907C31.4237 28.5082 28.4903 25.8865 28.197 22.5498C28.032 20.6432 28.7287 18.7365 30.122 17.3798C31.2953 16.1698 32.927 15.4915 34.687 15.4915H37.5287C38.0603 15.4915 38.5003 15.0515 38.4453 14.5198C38.042 10.0648 35.0903 7.0215 30.7087 6.50817C30.2687 6.43484 29.8103 6.4165 29.3337 6.4165H12.8337C12.3203 6.4165 11.8253 6.45317 11.3487 6.5265C6.67366 7.11317 3.66699 10.5965 3.66699 15.5832V28.4165C3.66699 33.4765 7.77366 37.5832 12.8337 37.5832H29.3337C34.467 37.5832 38.0053 34.3748 38.4453 29.4798C38.5003 28.9482 38.0603 28.5082 37.5287 28.5082ZM23.8337 17.8748H12.8337C12.082 17.8748 11.4587 17.2515 11.4587 16.4998C11.4587 15.7482 12.082 15.1248 12.8337 15.1248H23.8337C24.5853 15.1248 25.2087 15.7482 25.2087 16.4998C25.2087 17.2515 24.5853 17.8748 23.8337 17.8748Z" fill="#F5F7FA"/>
</svg>`;
const SVG_PLUS_16 = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 2.42871V13.5716" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round" stroke="#F5F7FA"/>
    <path d="M2.42871 8H13.5716" stroke-width="1.33" stroke-linecap="round" stroke-linejoin="round" stroke="#F5F7FA"/>
</svg>`;

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

// Сумма всех балансов счёта (в валюте отображения, вариант (а): без конвертации,
// числа суммируются как есть — TODO: конвертация валют по курсам)
function getAccountTotal(acc) {
    return Object.values(acc.balances).reduce((sum, b) => sum + b, 0);
}

// --- 3. ИНИЦИАЛИЗАЦИЯ ---
function init() {
    updateFabVisibility();
    renderHome();
    renderAccounts();
    renderHistory();
    switchTab('home');
}

// FAB добавления транзакции виден только когда есть хотя бы один счёт
function updateFabVisibility() {
    const fab = document.getElementById('fab-add-tx');
    if (fab) fab.classList.toggle('hidden', accounts.length === 0);
}

// --- 4. СМЕНА ФОНА ---
// Фон теперь плоский (#171A1F), состояния не подсвечиваются

function getNetWorth() {
    const assets = accounts.filter(a => a.type === 'asset').reduce((s, a) => s + getAccountTotal(a), 0);
    const debts = accounts.filter(a => a.type === 'debt').reduce((s, a) => s + getAccountTotal(a), 0);
    return assets - debts;
}

// --- 5. РЕНДЕР ГЛАВНОЙ ---
function renderHome() {
    const netWorth = getNetWorth();
    const netWorthAmountEl = document.getElementById('net-worth-amount');
    if (netWorthAmountEl) {
        const parts = getMoneyParts(netWorth);
        const sign = netWorth < 0 ? '−' : '';
        netWorthAmountEl.innerHTML = `<span>${sign}${parts.integer}</span><span class="text-[#8B93A7] text-[36px] leading-[44px]">,${parts.decimal}</span>`;
    }

    // Дельта за 24h: сумма (income − expense) за последние сутки, реальная
    const deltaEl = document.getElementById('net-worth-delta');
    if (deltaEl) {
        if (transactions.length === 0) {
            deltaEl.parentElement.classList.add('hidden');
        } else {
            deltaEl.parentElement.classList.remove('hidden');
            const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
            const delta = transactions
                .filter(t => new Date(t.date).getTime() >= dayAgo)
                .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
            const color = delta >= 0 ? 'text-[#2ECC71]' : 'text-[#FF6B6B]';
            const sign = delta >= 0 ? '+' : '−';
            deltaEl.className = color;
            deltaEl.innerText = `${sign}${formatMoney(delta)} $`;
        }
    }

    const blockEmpty = document.getElementById('block-empty');
    const blockNetWorth = document.getElementById('block-networth');
    const blockAssets = document.getElementById('block-assets');
    const blockDebts = document.getElementById('block-debts');

    // Пустое состояние: счетов нет — призыв создать первый, Net Worth не показываем
    if (accounts.length === 0) {
        if (blockEmpty) blockEmpty.classList.remove('hidden');
        if (blockNetWorth) blockNetWorth.classList.add('hidden');
        if (blockAssets) blockAssets.classList.add('hidden');
        if (blockDebts) blockDebts.classList.add('hidden');
        return;
    }
    if (blockEmpty) blockEmpty.classList.add('hidden');
    if (blockNetWorth) blockNetWorth.classList.remove('hidden');

    renderHomeSection('asset', blockAssets, 'assets-total', 'home-assets-list');
    renderHomeSection('debt', blockDebts, 'debts-total', 'home-debts-list');

    // className списка перезаписывается при рендере — восстанавливаем свёрнутость
    const debtsList = document.getElementById('home-debts-list');
    if (debtsList) debtsList.classList.toggle('hidden', debtsCollapsed);
}

// Секция Assets или Debts: заголовок с суммой + карточки счетов
function renderHomeSection(type, block, totalId, listId) {
    const list = document.getElementById(listId);
    const totalEl = document.getElementById(totalId);
    if (!list || !block) return;
    list.innerHTML = '';

    // Один счёт — растягиваем на всю ширину как дебт; два и больше — горизонтальный скролл карточек
    const isDebt = type === 'debt';
    const sectionAccounts = accounts.filter(a => a.type === type);
    const total = sectionAccounts.reduce((s, a) => s + getAccountTotal(a), 0);

    if (sectionAccounts.length === 0) {
        block.classList.add('hidden');
        return;
    }
    block.classList.remove('hidden');
    // Для долгов минус только при ненулевой сумме
    const totalSign = isDebt ? (total !== 0 ? '−' : '') : (total < 0 ? '−' : '');
    if (totalEl) totalEl.innerText = `${totalSign}${formatMoney(total)} $`;

    // Одиночный ассет/wide и дебты — вертикальный список; px-4 только там,
    // где обёртка секции его не даёт (block-debts уже имеет свой px-4)
    const wide = !isDebt && sectionAccounts.length === 1;
    list.className = isDebt ? 'flex flex-col gap-[10px]' : (wide ? 'flex flex-col gap-[10px] px-4' : 'flex gap-[10px] overflow-x-auto hide-scrollbar pb-2 px-4');

    sectionAccounts.forEach(acc => {
        const accTotal = getAccountTotal(acc);
        const parts = getMoneyParts(accTotal);
        const sign = isDebt ? (accTotal !== 0 ? '−' : '') : (accTotal < 0 ? '−' : '');
        const icon = ACCOUNT_ICONS[acc.icon] || 'ph-wallet';
        const amountHTML = `
            <p class="font-semibold text-[24px] leading-[29px]">
                <span class="text-[#F5F7FA]">${sign}${parts.integer}</span><span class="text-[#8B93A7] text-[16px] leading-[19px]">,${parts.decimal}</span> <span class="text-[#8B93A7] text-[16px] leading-[19px] ml-[4px]">$</span>
            </p>`;

        if (isDebt || wide) {
            list.innerHTML += `
                <div onclick="openAccountDetail('${acc.id}')" class="glass-ui rounded-[32px] p-5 flex flex-col h-[160px] justify-between cursor-pointer active:scale-95 transition-transform relative overflow-hidden">
                    ${amountHTML}
                    <div class="absolute right-5 bottom-5 opacity-40">
                        <div class="w-[64px] h-[64px] rounded-full flex items-center justify-center bg-[linear-gradient(135deg,rgba(76,141,255,0.25),rgba(76,141,255,0.05))]">
                            <i class="ph ${icon} text-[28px] text-[#F5F7FA]"></i>
                        </div>
                    </div>
                    <span class="font-medium text-[18px] text-[#F5F7FA]">${acc.name}</span>
                </div>
            `;
        } else {
            list.innerHTML += `
                <div onclick="openAccountDetail('${acc.id}')" class="glass-ui rounded-[32px] p-4 w-[200px] h-[230px] flex flex-col justify-between flex-shrink-0 cursor-pointer active:scale-95 transition-transform">
                    ${amountHTML}
                    <div class="self-center">
                        <div class="w-[72px] h-[72px] rounded-full flex items-center justify-center bg-[linear-gradient(135deg,rgba(76,141,255,0.25),rgba(76,141,255,0.05))]">
                            <i class="ph ${icon} text-[32px] text-[#F5F7FA] opacity-60"></i>
                        </div>
                    </div>
                    <span class="font-medium text-[16px] leading-[19px] text-[#F5F7FA]">${acc.name}</span>
                </div>
            `;
        }
    });
}

// Сворачивание/разворачивание секции Debts на Home
function toggleDebts() {
    debtsCollapsed = !debtsCollapsed;
    const list = document.getElementById('home-debts-list');
    const chevron = document.getElementById('debts-chevron');
    if (list) list.classList.toggle('hidden', debtsCollapsed);
    if (chevron) chevron.className = `ph ${debtsCollapsed ? 'ph-caret-down' : 'ph-caret-up'} text-[16px] text-[#8B93A7]`;
}

// --- 6. ЭКРАН ACCOUNTS ---
function setAccountTab(type) {
    activeAccountTab = type;
    const btnAssets = document.getElementById('acc-tab-assets');
    const btnDebts = document.getElementById('acc-tab-debts');
    const activeCls = 'flex-1 py-2.5 rounded-full bg-[#232730] text-white text-[15px] font-medium shadow-sm';
    const inactiveCls = 'flex-1 py-2.5 rounded-full text-[#8B93A7] text-[15px] font-medium';
    if (btnAssets) btnAssets.className = type === 'asset' ? activeCls : inactiveCls;
    if (btnDebts) btnDebts.className = type === 'debt' ? activeCls : inactiveCls;
    renderAccounts();
}

function renderAccounts() {
    const list = document.getElementById('accounts-list');
    if (!list) return;
    list.innerHTML = '';

    if (accounts.length === 0) {
        list.innerHTML = `
            <div class="flex flex-col items-center text-center pt-16">
                ${SVG_EMPTY_ICON}
                <div class="h-4"></div>
                <h2 class="text-[22px] font-semibold">Add your first account</h2>
                <div class="h-2"></div>
                <p class="text-[#8B93A7] text-[14px] leading-[17px] font-normal">Track cash, cards, or crypto in one place</p>
                <div class="h-6"></div>
                <button onclick="openAccountModal()" class="glass-ui text-white font-semibold text-[15px] h-[44px] px-6 rounded-full flex items-center gap-2 active:scale-95 transition-transform">${SVG_PLUS_16} Add Account</button>
            </div>
        `;
        return;
    }

    const filtered = accounts.filter(a => a.type === activeAccountTab);
    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="glass-ui rounded-[32px] p-8 flex flex-col items-center justify-center text-center">
                <p class="text-[#8B93A7] text-[15px] font-medium">Нет счетов этого типа</p>
            </div>
        `;
        return;
    }

    filtered.forEach(acc => {
        const accTotal = getAccountTotal(acc);
        const parts = getMoneyParts(accTotal);
        const sign = accTotal < 0 ? '<span class="text-[#FF6B6B]">−</span>' : '';
        const icon = ACCOUNT_ICONS[acc.icon] || 'ph-wallet';

        list.innerHTML += `
            <div onclick="openAccountDetail('${acc.id}')" class="glass-ui rounded-[32px] p-5 mb-4 h-[160px] flex flex-col justify-between cursor-pointer active:scale-95 transition-transform relative overflow-hidden">
                <p class="font-semibold text-[24px] leading-[29px]">
                    ${sign}<span class="text-[#F5F7FA]">${parts.integer}</span><span class="text-[#8B93A7] text-[16px] leading-[19px]">,${parts.decimal}</span> <span class="text-[#8B93A7] text-[16px] leading-[19px] ml-[4px]">$</span>
                </p>
                <div class="absolute right-4 bottom-4 opacity-40">
                    <div class="w-[64px] h-[64px] rounded-full flex items-center justify-center bg-[linear-gradient(135deg,rgba(76,141,255,0.25),rgba(76,141,255,0.05))]">
                        <i class="ph ${icon} text-[28px] text-[#F5F7FA]"></i>
                    </div>
                </div>
                <span class="font-medium text-[18px] text-[#F5F7FA]">${acc.name}</span>
            </div>
        `;
    });
}

// --- 7. МОДАЛКА СЧЁТА (DETAIL) ---
function openAccountDetail(id) {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;

    document.getElementById('ad-header-name').innerText = acc.name;
    document.getElementById('ad-name').innerText = acc.name;
    const iconEl = document.getElementById('ad-icon');
    if (iconEl) {
        iconEl.className = `ph ${ACCOUNT_ICONS[acc.icon] || 'ph-wallet'} text-[32px] text-[#F5F7FA]`;
    }

    const balancesEl = document.getElementById('ad-balances');
    balancesEl.innerHTML = '';
    acc.currencies.forEach(cur => {
        const balance = acc.balances[cur] || 0;
        const parts = getMoneyParts(balance);
        const sign = balance < 0 ? '−' : '';
        balancesEl.innerHTML += `
            <div class="glass-ui rounded-[24px] p-5 flex items-center justify-between mb-3">
                <p class="font-semibold text-[24px]">
                    <span class="text-[#F5F7FA]">${sign}${parts.integer}</span><span class="text-[#8B93A7] text-[16px]">,${parts.decimal}</span>
                </p>
                <span class="text-[#8B93A7] text-[16px] font-medium">${cur}</span>
            </div>
        `;
    });

    document.getElementById('ad-edit-btn').onclick = () => {
        closeModal('modal-account-detail');
        openEditAccount(id);
    };

    openModal('modal-account-detail');
}

// --- 8. ADD / EDIT ACCOUNT ---
function openAccountModal() {
    editingAccountId = null;
    document.getElementById('acc-modal-title').innerText = 'Add Account';
    document.getElementById('acc-modal-close').innerHTML = '<i class="ph ph-x text-xl"></i>';
    document.getElementById('acc-name').value = '';
    document.getElementById('acc-type-asset').className = 'flex-1 py-3 rounded-full bg-[#1A1D24] text-white text-[15px] font-medium shadow-sm transition-all';
    document.getElementById('acc-type-debt').className = 'flex-1 py-3 rounded-full text-[#8B93A7] text-[15px] font-medium transition-all';
    selectedIcon = 'wallet';
    selectedCurrencies = [];
    renderIconPicker();
    renderAccCurrencyChips();
    updateAccSaveBtn();
    document.getElementById('acc-delete-btn').classList.add('hidden');
    openModal('modal-add-account');
    setTimeout(() => document.getElementById('acc-name').focus(), 350);
}

function openEditAccount(id) {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;
    editingAccountId = id;

    document.getElementById('acc-modal-title').innerText = 'Edit Account';
    document.getElementById('acc-modal-close').innerHTML = '<i class="ph ph-arrow-left text-xl"></i>';
    document.getElementById('acc-name').value = acc.name;

    const isAsset = acc.type === 'asset';
    document.getElementById('acc-type-asset').className = isAsset
        ? 'flex-1 py-3 rounded-full bg-[#1A1D24] text-white text-[15px] font-medium shadow-sm transition-all'
        : 'flex-1 py-3 rounded-full text-[#8B93A7] text-[15px] font-medium transition-all';
    document.getElementById('acc-type-debt').className = !isAsset
        ? 'flex-1 py-3 rounded-full bg-[#1A1D24] text-white text-[15px] font-medium shadow-sm transition-all'
        : 'flex-1 py-3 rounded-full text-[#8B93A7] text-[15px] font-medium transition-all';

    selectedIcon = acc.icon;
    selectedCurrencies = [...acc.currencies];
    renderIconPicker();
    renderAccCurrencyChips();
    updateAccSaveBtn();
    document.getElementById('acc-delete-btn').classList.remove('hidden');
    openModal('modal-add-account');
}

function setAccType(type) {
    const assetBtn = document.getElementById('acc-type-asset');
    const debtBtn = document.getElementById('acc-type-debt');
    if (type === 'asset') {
        assetBtn.className = 'flex-1 py-3 rounded-full bg-[#1A1D24] text-white text-[15px] font-medium shadow-sm transition-all';
        debtBtn.className = 'flex-1 py-3 rounded-full text-[#8B93A7] text-[15px] font-medium transition-all';
    } else {
        debtBtn.className = 'flex-1 py-3 rounded-full bg-[#1A1D24] text-white text-[15px] font-medium shadow-sm transition-all';
        assetBtn.className = 'flex-1 py-3 rounded-full text-[#8B93A7] text-[15px] font-medium transition-all';
    }
}

function renderIconPicker() {
    const picker = document.getElementById('acc-icon-picker');
    if (!picker) return;
    picker.innerHTML = '';
    Object.keys(ACCOUNT_ICONS).forEach(key => {
        const isActive = key === selectedIcon;
        const cls = isActive
            ? 'w-11 h-11 rounded-full bg-[#4C8DFF] text-white flex items-center justify-center active:scale-95 transition-transform'
            : 'w-11 h-11 rounded-full glass-ui text-[#8B93A7] flex items-center justify-center active:scale-95 transition-transform';
        picker.innerHTML += `<button onclick="setAccIcon('${key}')" class="${cls}"><i class="ph ${ACCOUNT_ICONS[key]} text-[20px]"></i></button>`;
    });
}

function setAccIcon(key) {
    selectedIcon = key;
    renderIconPicker();
}

function renderAccCurrencyChips() {
    const box = document.getElementById('acc-currency-chips');
    if (!box) return;
    box.innerHTML = '';
    CURRENCIES.forEach(cur => {
        const isActive = selectedCurrencies.includes(cur);
        const cls = isActive
            ? 'px-4 py-2.5 rounded-full bg-[#4C8DFF] text-white text-[15px] font-medium flex items-center gap-2 active:scale-95 transition-transform'
            : 'px-4 py-2.5 rounded-full glass-ui text-[#8B93A7] text-[15px] font-medium flex items-center gap-2 active:scale-95 transition-transform';
        const cross = isActive ? '<i class="ph ph-x text-[14px]"></i>' : '';
        box.innerHTML += `<button onclick="toggleAccCurrency('${cur}')" class="${cls}">${cur} ${cross}</button>`;
    });
}

function toggleAccCurrency(cur) {
    if (selectedCurrencies.includes(cur)) {
        // Нельзя убрать валюту с ненулевым балансом
        if (editingAccountId) {
            const acc = accounts.find(a => a.id === editingAccountId);
            if (acc && (acc.balances[cur] || 0) !== 0) {
                alert('Нельзя убрать валюту с ненулевым балансом');
                return;
            }
        }
        selectedCurrencies = selectedCurrencies.filter(c => c !== cur);
    } else {
        selectedCurrencies.push(cur);
    }
    renderAccCurrencyChips();
}

// Галка Save: серая пока имя пустое, синяя когда можно сохранять
function updateAccSaveBtn() {
    const btn = document.getElementById('acc-save-btn');
    if (!btn) return;
    const name = document.getElementById('acc-name').value.trim();
    const ready = name.length > 0;
    btn.className = ready
        ? 'w-10 h-10 rounded-full bg-[#4C8DFF] text-white flex items-center justify-center active:scale-95 transition-transform'
        : 'w-10 h-10 rounded-full bg-[#232730] text-[#8B93A7] flex items-center justify-center transition-transform';
    return ready;
}

function saveAccount() {
    const name = document.getElementById('acc-name').value.trim();
    const type = document.getElementById('acc-type-asset').className.includes('bg-[#1A1D24]') ? 'asset' : 'debt';

    if (!name) { alert('Введите название счёта'); return; }
    if (selectedCurrencies.length === 0) { alert('Выберите хотя бы одну валюту'); return; }

    if (editingAccountId) {
        accounts = accounts.map(acc => {
            if (acc.id !== editingAccountId) return acc;
            const balances = {};
            selectedCurrencies.forEach(c => balances[c] = acc.balances[c] || 0);
            return { ...acc, name, type, icon: selectedIcon, currencies: [...selectedCurrencies], balances };
        });
    } else {
        const balances = {};
        selectedCurrencies.forEach(c => balances[c] = 0);
        accounts.push({
            id: Math.random().toString(),
            name, type,
            icon: selectedIcon,
            currencies: [...selectedCurrencies],
            balances
        });
    }
    saveData();
    closeModal('modal-add-account');
    init();
    switchTab('accounts');
}

function deleteAccount() {
    if (!editingAccountId) return;
    const acc = accounts.find(a => a.id === editingAccountId);
    if (!acc) return;
    if (!confirm(`Удалить счёт «${acc.name}»? Его транзакции тоже будут удалены.`)) return;

    accounts = accounts.filter(a => a.id !== editingAccountId);
    transactions = transactions.filter(t => t.accountId !== editingAccountId);
    saveData();
    closeModal('modal-add-account');
    init();
}

// --- 9. РЕНДЕР ИСТОРИИ ---
function renderHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;
    list.innerHTML = '';

    // Пустые состояния: нет счетов — призыв создать счёт; нет операций — призыв добавить транзакцию
    if (accounts.length === 0) {
        list.innerHTML = `
            <div class="flex flex-col items-center text-center pt-16">
                ${SVG_EMPTY_ICON}
                <div class="h-4"></div>
                <h2 class="text-[22px] font-semibold">Add your first account</h2>
                <div class="h-2"></div>
                <p class="text-[#8B93A7] text-[14px] leading-[17px] font-normal">Track cash, cards, or crypto in one place</p>
                <div class="h-6"></div>
                <button onclick="openAccountModal()" class="glass-ui text-white font-semibold text-[15px] h-[44px] px-6 rounded-full flex items-center gap-2 active:scale-95 transition-transform">${SVG_PLUS_16} Add Account</button>
            </div>
        `;
        return;
    }

    if (transactions.length === 0) {
        list.innerHTML = `
            <div class="flex flex-col items-center text-center pt-16">
                ${SVG_EMPTY_ICON}
                <div class="h-4"></div>
                <h2 class="text-[22px] font-semibold">No transaction yet</h2>
                <div class="h-2"></div>
                <p class="text-[#8B93A7] text-[14px] leading-[17px] font-normal">Add your first income or expense to see it here</p>
                <div class="h-6"></div>
                <button onclick="openTxModal()" class="glass-ui text-white font-semibold text-[15px] h-[44px] px-6 rounded-full flex items-center gap-2 active:scale-95 transition-transform">${SVG_PLUS_16} Add Transaction</button>
            </div>
        `;
        return;
    }

    // Группировка по дням, свежие сверху
    const days = {};
    transactions.slice().reverse().forEach(tx => {
        const key = new Date(tx.date).toDateString();
        (days[key] = days[key] || []).push(tx);
    });

    const todayKey = new Date().toDateString();
    const yesterdayKey = new Date(Date.now() - 86400000).toDateString();

    Object.keys(days).forEach(dayKey => {
        const dayTx = days[dayKey];
        const dayTotal = dayTx.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
        const totalColor = dayTotal >= 0 ? 'text-[#2ECC71]' : 'text-[#FF6B6B]';
        const totalSign = dayTotal >= 0 ? '+' : '−';

        let label;
        if (dayKey === todayKey) label = 'Today';
        else if (dayKey === yesterdayKey) label = 'Yesterday';
        else label = new Date(dayKey).toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });

        list.innerHTML += `
            <div class="flex justify-between items-center mb-4 mt-6 first:mt-0">
                <h2 class="text-[20px] font-semibold">${label}</h2>
                <span class="${totalColor} text-[15px] font-medium">${totalSign}${formatMoney(dayTotal)} $</span>
            </div>
        `;

        dayTx.forEach(tx => {
            const acc = accounts.find(a => a.id === tx.accountId);
            if (!acc) return;
            const isIncome = tx.type === 'income';
            const color = isIncome ? 'text-[#2ECC71]' : 'text-white';
            const sign = isIncome ? '+' : '−';
            const time = new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const symbol = currencySymbols[tx.currency] || '';

            list.innerHTML += `
                <div class="flex justify-between items-center py-4 border-b border-white/5 last:border-0">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 rounded-full glass-ui flex items-center justify-center text-white"><i class="ph ${ACCOUNT_ICONS[acc.icon] || 'ph-wallet'} text-[22px]"></i></div>
                        <div>
                            <p class="font-medium text-[16px]">${acc.name}</p>
                            <p class="text-[#8B93A7] text-[14px]">${tx.category || 'Other'}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="${color} font-medium text-[16px]">${sign}${formatMoney(tx.amount)} ${symbol} <span class="text-[#8B93A7] text-[13px]">${tx.currency}</span></p>
                        <p class="text-[#8B93A7] text-[13px]">${time}</p>
                    </div>
                </div>
            `;
        });
    });
}

// --- 10. ШАПКА ---
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
            <button onclick="switchTab('profile')" class="w-[44px] h-[44px] rounded-full glass-ui flex items-center justify-center active:scale-95 transition-transform pointer-events-auto">
                <div class="w-[24px] h-[24px] flex items-center justify-center text-[20px] font-semibold text-[#F5F7FA] leading-[24px]">M</div>
            </button>
            <button class="w-[44px] h-[44px] rounded-full glass-ui flex items-center justify-center active:scale-95 transition-transform pointer-events-auto">
                <div class="w-[24px] h-[24px] flex items-center justify-center">${svgIcon}</div>
            </button>
        `;
    } else if (tab === 'profile') {
        header.innerHTML = `
            <button onclick="switchTab('home')" class="w-[44px] h-[44px] rounded-full glass-ui flex items-center justify-center active:scale-95 transition-transform pointer-events-auto">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.75 19.5L7.25 12L14.75 4.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="#F5F7FA"/>
                </svg>
            </button>
            <div class="w-[24px] h-[24px]"></div>
        `;
    } else if (tab === 'accounts') {
        header.innerHTML = `
            <h1 class="text-[34px] font-bold tracking-tight">Accounts</h1>
            <button onclick="openAccountModal()" class="w-[44px] h-[44px] rounded-full glass-ui flex items-center justify-center active:scale-95 transition-transform pointer-events-auto">
                <div class="w-[24px] h-[24px] flex items-center justify-center"><i class="ph ph-plus text-[24px] text-[#F5F7FA]"></i></div>
            </button>
        `;
    } else if (tab === 'history') {
        header.innerHTML = `<h1 class="text-[34px] font-bold tracking-tight">History</h1>`;
    }
}

// --- 11. НАВИГАЦИЯ ---
function switchTab(tab) {
    ['home', 'accounts', 'history', 'profile'].forEach(t => {
        const screen = document.getElementById(`screen-${t}`);
        const btn = document.getElementById(`tab-${t}`);
        if (screen) screen.classList.add('hidden');
        if (btn) { btn.classList.remove('active', 'text-[#4C8DFF]'); btn.classList.add('text-[#F5F7FA]'); }
    });

    const activeScreen = document.getElementById(`screen-${tab}`);
    const activeBtn = document.getElementById(`tab-${tab}`);
    if (activeScreen) activeScreen.classList.remove('hidden');
    if (activeBtn) { activeBtn.classList.add('active', 'text-[#4C8DFF]'); activeBtn.classList.remove('text-[#F5F7FA]'); }

    // Страница Profile — не таб: активный таб снимаем
    if (tab === 'profile' && activeBtn) {
        activeBtn.classList.remove('active', 'text-[#4C8DFF]');
        activeBtn.classList.add('text-[#F5F7FA]');
    }

    renderHeader(tab);
    if (tab === 'profile') renderProfileStats();
    updateTabIndicator();
}

// Плавающая подсветка активного таба
let tabIndicatorInit = false;
function updateTabIndicator() {
    const indicator = document.getElementById('tab-indicator');
    if (!indicator) return;
    if (!tabIndicatorInit) {
        tabIndicatorInit = true;
        indicator.style.transition = 'none';
    }
    const active = document.querySelector('.tab-btn.active');
    if (!active) {
        indicator.style.width = '0px';
        indicator.style.transform = 'translateX(0px)';
    } else {
        indicator.style.width = active.offsetWidth + 'px';
        indicator.style.transform = `translateX(${active.offsetLeft}px)`;
    }
    if (indicator.style.transition === 'none') {
        requestAnimationFrame(() => { indicator.style.transition = ''; });
    }
}

// --- 12. МОДАЛКИ ---
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

// --- СВАЙП ВНИЗ ДЛЯ ЗАКРЫТИЯ МОДАЛОК ---
const swipeState = { active: false, startY: 0, currentY: 0, modal: null, content: null };

function attachSwipeToClose(modal) {
    const content = modal.querySelector('.modal-content');
    if (!content) return;

    // Только свайп за верхнюю зону (шапку с ручкой) — внизу контент скроллится
    content.addEventListener('touchstart', e => {
        if (modal.classList.contains('hidden')) return;
        // Скролл теперь во вложенном контейнере — проверяем его прокрутку
        const scroller = content.querySelector('.overflow-y-auto') || content;
        if (scroller.scrollTop > 0) return;
        swipeState.active = true;
        swipeState.startY = e.touches[0].clientY;
        swipeState.currentY = 0;
        swipeState.modal = modal;
        swipeState.content = content;
        content.style.transition = 'none';
    }, { passive: true });

    content.addEventListener('touchmove', e => {
        if (!swipeState.active || swipeState.modal !== modal) return;
        const dy = e.touches[0].clientY - swipeState.startY;
        // Тянем только вниз; вверх не даём
        swipeState.currentY = Math.max(0, dy);
        if (swipeState.currentY > 0) {
            content.style.transform = `translateY(${swipeState.currentY}px)`;
            // Подсветка оверлея гаснет по мере свайпа
            const overlay = modal.querySelector('.absolute.inset-0');
            if (overlay) overlay.style.opacity = String(Math.max(0, 1 - swipeState.currentY / 300));
        }
    }, { passive: true });

    content.addEventListener('touchend', () => {
        if (!swipeState.active || swipeState.modal !== modal) return;
        swipeState.active = false;
        content.style.transition = '';
        const overlay = modal.querySelector('.absolute.inset-0');
        if (overlay) overlay.style.opacity = '';

        if (swipeState.currentY > 120) {
            // Достаточно потянули — закрываем
            content.style.transform = '';
            closeModal(modal.id);
        } else {
            // Возвращаем на место с тем же эпловским easing
            content.style.transform = '';
        }
        swipeState.currentY = 0;
    });
}

function initSwipeOnModals() {
    ['modal-add-tx', 'modal-add-account', 'modal-account-detail'].forEach(id => {
        const modal = document.getElementById(id);
        if (modal) attachSwipeToClose(modal);
    });
}

// --- 13. ТРАНЗАКЦИИ (2 ШАГА) ---
// Шаг 1: выбор счёта. Шаг 2: валюта + сумма + приход/расход + заметка
function openTxModal() {
    if (accounts.length === 0) { openAccountModal(); return; }
    currentTxType = 'expense';
    setTxType('expense');

    document.getElementById('tx-step-1').classList.remove('hidden');
    document.getElementById('tx-step-2').classList.add('hidden');
    document.getElementById('tx-step-1-head').classList.remove('hidden');
    document.getElementById('tx-step-2-head').classList.add('hidden');

    const list = document.getElementById('tx-accounts-list');
    list.innerHTML = '';
    accounts.forEach(acc => {
        list.innerHTML += `
            <button onclick="selectTxAccount('${acc.id}')" class="w-full glass-ui rounded-[24px] p-4 mb-3 flex items-center gap-4 active:scale-95 transition-transform">
                <div class="w-12 h-12 rounded-full glass-ui bg-white/5 flex items-center justify-center text-[20px] text-[#F5F7FA]">
                    <i class="ph ${ACCOUNT_ICONS[acc.icon] || 'ph-wallet'}"></i>
                </div>
                <span class="font-medium text-[16px] flex-1 text-left">${acc.name}</span>
                <i class="ph ph-caret-right text-[20px] text-[#8B93A7]"></i>
            </button>
        `;
    });

    openModal('modal-add-tx');
}

function selectTxAccount(id) {
    txAccountId = id;
    const acc = accounts.find(a => a.id === id);
    if (!acc) return;

    document.getElementById('tx-step-1').classList.add('hidden');
    document.getElementById('tx-step-2').classList.remove('hidden');
    document.getElementById('tx-step-1-head').classList.add('hidden');
    document.getElementById('tx-step-2-head').classList.remove('hidden');
    document.getElementById('tx-selected-account').innerText = acc.name;

    // Чипы валют — только из валют выбранного счёта
    const chips = document.getElementById('tx-currency-chips');
    chips.innerHTML = '';
    acc.currencies.forEach(cur => {
        const isActive = cur === (txCurrency && acc.currencies.includes(txCurrency) ? txCurrency : acc.currencies[0]);
        if (isActive) txCurrency = cur;
        const cls = isActive
            ? 'px-4 py-2 rounded-full bg-[#4C8DFF] text-white text-[15px] font-medium active:scale-95 transition-transform'
            : 'px-4 py-2 rounded-full bg-[#232730] text-[#8B93A7] text-[15px] font-medium active:scale-95 transition-transform';
        chips.innerHTML += `<button onclick="setTxCurrency('${cur}')" class="${cls}">${cur}</button>`;
    });
    updateTxAmountSymbol();

    document.getElementById('tx-amount').value = '';
    document.getElementById('tx-note').value = '';
}

function backToTxStep1() {
    document.getElementById('tx-step-2').classList.add('hidden');
    document.getElementById('tx-step-1').classList.remove('hidden');
    document.getElementById('tx-step-2-head').classList.add('hidden');
    document.getElementById('tx-step-1-head').classList.remove('hidden');
}

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

function setTxCurrency(cur) {
    txCurrency = cur;
    const acc = accounts.find(a => a.id === txAccountId);
    if (!acc) return;
    const chips = document.getElementById('tx-currency-chips');
    chips.innerHTML = '';
    acc.currencies.forEach(c => {
        const isActive = c === cur;
        const cls = isActive
            ? 'px-4 py-2 rounded-full bg-[#4C8DFF] text-white text-[15px] font-medium active:scale-95 transition-transform'
            : 'px-4 py-2 rounded-full bg-[#232730] text-[#8B93A7] text-[15px] font-medium active:scale-95 transition-transform';
        chips.innerHTML += `<button onclick="setTxCurrency('${c}')" class="${cls}">${c}</button>`;
    });
    updateTxAmountSymbol();
}

function updateTxAmountSymbol() {
    const label = document.getElementById('tx-amount-symbol');
    if (label) label.innerText = currencySymbols[txCurrency] || '';
}

function saveTransaction() {
    if (!txAccountId || !txCurrency) { alert('Выберите счёт и валюту'); return; }

    const amountInput = document.getElementById('tx-amount');
    const note = document.getElementById('tx-note').value || 'Other';
    const amount = parseFloat(amountInput.value.replace(',', '.'));

    if (!amount || amount <= 0 || isNaN(amount)) { alert('Please enter a valid amount'); return; }

    transactions.push({
        id: Math.random().toString(),
        accountId: txAccountId,
        currency: txCurrency,
        type: currentTxType,
        amount,
        category: note,
        date: new Date().toISOString()
    });

    accounts = accounts.map(acc => {
        if (acc.id !== txAccountId) return acc;
        const current = acc.balances[txCurrency] || 0;
        const newBalance = currentTxType === 'income' ? current + amount : current - amount;
        return { ...acc, balances: { ...acc.balances, [txCurrency]: newBalance } };
    });

    saveData();

    amountInput.value = '';
    document.getElementById('tx-note').value = '';

    closeModal('modal-add-tx');
    init();
    switchTab('home');
}

// --- ПРОФИЛЬ / СБРОС ---
function renderProfileStats() {
    const accEl = document.getElementById('profile-acc-count');
    const txEl = document.getElementById('profile-tx-count');
    if (accEl) accEl.innerText = accounts.length;
    if (txEl) txEl.innerText = transactions.length;
}

function resetAllData() {
    if (!confirm('Reset all data? Accounts and transactions will be deleted.')) return;
    accounts = [];
    transactions = [];
    saveData();
    init();
    switchTab('home');
}

window.onload = init;
initSwipeOnModals();

// Прячем сплеш после первой отрисовки
window.addEventListener('load', () => {
    const splash = document.getElementById('splash');
    if (!splash) return;
    setTimeout(() => {
        splash.classList.add('opacity-0');
        setTimeout(() => splash.remove(), 350);
    }, 250);
});

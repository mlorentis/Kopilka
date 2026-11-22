// ============================================
// Kopilka — ядро (сборка с чистого листа, v2)
// ============================================

const BUILD = 'v9';

// --- ХРАНИЛИЩЕ (модель v2) ---
let accounts = JSON.parse(localStorage.getItem('accounts')) || [];
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];

function saveData() {
    localStorage.setItem('accounts', JSON.stringify(accounts));
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// --- СОСТОЯНИЕ ---
let returnTab = 'home';

// --- ЭКРАНЫ ---
const ALL_SCREENS = ['home', 'accounts', 'history'];

// --- ИНИЦИАЛИЗАЦИЯ ---
function init() {
    updateFabVisibility();
    fitAppContainer();
    showDebugInfo();
    switchTab('home');
}

// FAB виден только при наличии счетов
function updateFabVisibility() {
    const fab = document.getElementById('fab-add-tx');
    if (fab) fab.classList.toggle('hidden', accounts.length === 0);
}

// Реальная нижняя сейф-зона устройства: читаем через probe-элемент
// (env() в JS напрямую не прочитать). На айфонах с home indicator ≈34px,
// на SE/в браузере — 0. Используется только в диагностике.
function getSafeAreaBottom() {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom,0px);';
    document.body.appendChild(probe);
    const v = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
    probe.remove();
    return v;
}

// iOS standalone PWA: layout viewport КОРОЧЕ физического экрана на
// ~50px (34 safe-area + 16 резерв WebKit под индикатор Home). Canvas при
// этом рисует весь экран — проверено: завышенный контейнер рендерится
// целиком, без обрезки. Лечение: в PWA-портрете растягиваем контейнер
// на ПОЛНУЮ физическую высоту (screen.height — на iOS не меняется при
// повороте, это длинная сторона). Тогда margin таббара 20px считается от
// ФИЗИЧЕСКОГО низа: 20px ровно на всех устройствах.
// Замер на iPhone 13 mini: screenH=812, innerH=762, зона=50.
function fitAppContainer() {
    const c = document.querySelector('.app-container');
    if (!c) return;
    const standalone = window.navigator.standalone === true;
    const portrait = window.innerHeight >= window.innerWidth;
    if (standalone && portrait) {
        c.style.height = Math.max(window.screen.height, window.screen.width) + 'px';
    } else {
        c.style.height = '';
    }
}
window.addEventListener('resize', fitAppContainer);
window.addEventListener('orientationchange', fitAppContainer);

// ДИАГНОСТИКА ВРЕМЕННАЯ: обновляет статическую плашку из index.html.
// Видна всегда, даже если этот JS закэширован старый — тогда останется
// текст "BUILD v8-static". Пришли скрин из PWA.
function showDebugInfo() {
    const el = document.getElementById('debug-panel');
    if (!el) return;
    const upd = () => {
        const vv = window.visualViewport;
        el.textContent =
            `BUILD ${BUILD} standalone=${window.navigator.standalone} dpr=${window.devicePixelRatio}\n` +
            `innerH=${window.innerHeight} screenH=${window.screen.height} vvH=${vv ? Math.round(vv.height) : '-'} vvTop=${vv ? Math.round(vv.offsetTop) : '-'}\n` +
            `safeB=${getSafeAreaBottom()} contH=${document.querySelector('.app-container').style.height || 'auto'}`;
    };
    upd();
    setInterval(upd, 400);
}

// --- ШАПКА ---
function renderHeader(tab) {
    const header = document.getElementById('main-header-inner');
    if (!header) return;

    const statsSvg = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21.6702 6.9499C21.0302 4.7799 19.2202 2.9699 17.0502 2.3299C15.4002 1.8499 14.2602 1.8899 13.4702 2.4799C12.5202 3.1899 12.4102 4.4699 12.4102 5.3799V7.8699C12.4102 10.3299 13.5302 11.5799 15.7302 11.5799H18.6002C19.5002 11.5799 20.7902 11.4699 21.5002 10.5199C22.1102 9.7399 22.1602 8.5999 21.6702 6.9499Z" fill="#F5F7FA"/>
            <path d="M18.9094 13.3599C18.6494 13.0599 18.2694 12.8899 17.8794 12.8899H14.2994C12.5394 12.8899 11.1094 11.4599 11.1094 9.69991V6.11991C11.1094 5.72991 10.9394 5.34991 10.6394 5.08991C10.3494 4.82991 9.94941 4.70991 9.56941 4.75991C7.21941 5.05991 5.05941 6.34991 3.64941 8.28991C2.22941 10.2399 1.70941 12.6199 2.15941 14.9999C2.80941 18.4399 5.55941 21.1899 9.00941 21.8399C9.55941 21.9499 10.1094 21.9999 10.6594 21.9999C12.4694 21.9999 14.2194 21.4399 15.7094 20.3499C17.6494 18.9399 18.9394 16.7799 19.2394 14.4299C19.2894 14.0399 19.1694 13.6499 18.9094 13.3599Z" fill="#F5F7FA"/>
        </svg>`;

    if (tab === 'home') {
        header.innerHTML = `
            <button type="button" class="w-11 h-11 rounded-full glass-ui flex items-center justify-center active:scale-95 transition-transform pointer-events-auto">
                <span class="text-[20px] font-semibold leading-[24px]">M</span>
            </button>
            <button type="button" class="w-11 h-11 rounded-full glass-ui flex items-center justify-center active:scale-95 transition-transform pointer-events-auto">${statsSvg}</button>
        `;
    } else if (tab === 'accounts') {
        header.innerHTML = `
            <h1 class="text-[34px] font-bold tracking-tight">Accounts</h1>
            <button type="button" class="w-11 h-11 rounded-full glass-ui flex items-center justify-center active:scale-95 transition-transform pointer-events-auto">
                <i class="ph ph-plus text-[24px]"></i>
            </button>
        `;
    } else if (tab === 'history') {
        header.innerHTML = `<h1 class="text-[34px] font-bold tracking-tight">History</h1>`;
    }
}

// --- НАВИГАЦИЯ ---
function switchTab(tab) {
    ALL_SCREENS.forEach(t => {
        const screen = document.getElementById(`screen-${t}`);
        const btn = document.getElementById(`tab-${t}`);
        if (screen) screen.classList.add('hidden');
        if (btn) {
            btn.classList.remove('active', 'text-[#4C8DFF]');
            btn.classList.add('text-[#F5F7FA]');
        }
    });

    const activeScreen = document.getElementById(`screen-${tab}`);
    const activeBtn = document.getElementById(`tab-${tab}`);
    if (activeScreen) activeScreen.classList.remove('hidden');
    if (activeBtn) {
        activeBtn.classList.add('active', 'text-[#4C8DFF]');
        activeBtn.classList.remove('text-[#F5F7FA]');
    }

    renderHeader(tab);
    updateTabIndicator();
}

// Ездящая подсветка активного таба
let tabIndicatorInit = false;
function updateTabIndicator(instant) {
    const indicator = document.getElementById('tab-indicator');
    if (!indicator) return;
    if (!tabIndicatorInit || instant) {
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

// --- iOS-КОСТЫЛИ ---

// После закрытия клавиатуры fixed-контейнер может «залипнуть»
// ужатым — принудительно пересчитываем layout
function reflowFixedLayout() {
    const c = document.querySelector('.app-container');
    if (!c) return;
    c.style.transform = 'translateZ(0)';
    requestAnimationFrame(() => { c.style.transform = ''; });
}
window.addEventListener('resize', reflowFixedLayout);
window.addEventListener('focusout', reflowFixedLayout);

// При открытой клавиатуре WebKit сдвигает visual viewport вниз, а
// привязанные к layout viewport элементы уезжают наверх. Компенсируем
// сдвиг шапки трансформом. ТОЛЬКО пока фокус в поле ввода — иначе
// при обычном скролле шапка дёргается.
let vvRafPending = false;
function syncChromeWithVisualViewport() {
    if (!window.visualViewport || vvRafPending) return;
    vvRafPending = true;
    requestAnimationFrame(() => {
        vvRafPending = false;
        const header = document.getElementById('main-header');
        if (!header) return;
        const active = document.activeElement;
        const typing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
        const shift = typing ? Math.round(window.visualViewport.offsetTop) : 0;
        header.style.transform = shift > 1 ? `translateY(${shift}px)` : '';
    });
}
if (window.visualViewport) {
    window.visualViewport.addEventListener('scroll', syncChromeWithVisualViewport);
    window.visualViewport.addEventListener('resize', syncChromeWithVisualViewport);
    document.addEventListener('focusin', syncChromeWithVisualViewport);
    document.addEventListener('focusout', syncChromeWithVisualViewport);
}

// --- СТАРТ ---
window.onload = init;

// Прячем сплеш после первой отрисовки
window.addEventListener('load', () => {
    const splash = document.getElementById('splash');
    if (!splash) return;
    setTimeout(() => {
        splash.classList.add('fade');
        setTimeout(() => splash.remove(), 350);
    }, 250);
});

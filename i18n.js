// ============================================
// INTERNATIONALIZATION (i18n) - Core Loader
// ============================================

let currentLanguage = 'en';
const translations = {};

const availableLanguages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'uk', name: 'Українська', flag: '🇺🇦' },
    { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
    { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
    { code: 'ro', name: 'Română', flag: '🇷🇴' },
    { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
    { code: 'bg', name: 'Български', flag: '🇧🇬' },
    { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
    { code: 'sr', name: 'Српски', flag: '🇷🇸' },
    { code: 'sl', name: 'Slovenščina', flag: '🇸🇮' },
    { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
    { code: 'da', name: 'Dansk', flag: '🇩🇰' },
    { code: 'no', name: 'Norsk', flag: '🇳🇴' },
    { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
    { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'he', name: 'עברית', flag: '🇮🇱' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
    { code: 'th', name: 'ไทย', flag: '🇹🇭' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'id', name: 'Indonesia', flag: '🇮🇩' },
    { code: 'ms', name: 'Melayu', flag: '🇲🇾' },
    { code: 'tl', name: 'Tagalog', flag: '🇵🇭' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'zh', name: '简体中文', flag: '🇨🇳' },
    { code: 'zh-tw', name: '繁體中文', flag: '🇹🇼' },
    { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
    { code: 'ca', name: 'Català', flag: '🏳️' },
    { code: 'cy', name: 'Cymraeg', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
    { code: 'ga', name: 'Gaeilge', flag: '🇮🇪' }
];

function registerLanguage(code, data) {
    translations[code] = data;
}

function setLanguage(lang) {
    if (translations[lang]) {
        currentLanguage = lang;
        storage.write('switchGamesLanguage', lang);
        document.documentElement.lang = lang;
        document.documentElement.dir = ['ar', 'he'].includes(lang) ? 'rtl' : 'ltr';
        updateAllText();
        if (typeof renderPage === 'function') renderPage();
        if (typeof updateSettings === 'function') updateSettings();
    }
}

function getTranslation(key) {
    return translations[currentLanguage]?.[key] || translations.en?.[key] || key;
}

function getGameName(gameId) {
    return translations[currentLanguage]?.games?.[gameId] || translations.en?.games?.[gameId] || gameId;
}

function getGameInstructions(gameId, mode = 2) {
    const text = translations[currentLanguage]?.instructions?.[gameId] || translations.en?.instructions?.[gameId] || '';
    // Detailed mode-specific help is optional; retain the localized controls
    // for dictionaries that have not yet supplied it.
    const oneSwitch = translations[currentLanguage]?.instructionsOneSwitch?.[gameId];
    if (oneSwitch) return mode === 1 ? oneSwitch : text;
    if (gameId === 'helicopter' && mode === 2) {
        const lines=text.split('\n'), strip=line=>line?.replace(/^[⬅➡️\s]+/u,'')||'';
        return lines[0]+'\n⬅️➡️ '+strip(lines[1])+'\n○ '+strip(lines[2])+'\n'+(lines[3]||'');
    }
    if (mode !== 1 || typeof ui !== 'function') return text;
    const lines = text.split('\n');
    const actionLine = index => lines[index]?.replace(/^[⬅➡️\s]+/u, '') || ui('action');
    let action = ui('action');
    if (['space-invaders','breakout','pong','tank','asteroids','skiing','balance','airhockey','spacedodge'].includes(gameId)) action=ui('reverse');
    else if (gameId==='snake' || gameId==='tetris') action=actionLine(2);
    else if (gameId==='dino') action=actionLine(1);
    else if (['flappy','helicopter','lander','bubble-shooter','stack'].includes(gameId)) action=actionLine(1);
    else if (gameId==='simon') action=ui('select')+' — '+ui('scan');
    else if (gameId==='wireloop') action=ui('forward');
    else if (gameId==='pinball') action='↖ + ↗';
    else if (['fruit','whack','rhythm'].includes(gameId)) action='●';
    else if (gameId==='brickbuilder') action='⬇';
    else if (gameId==='penalty') action='⚽';
    const automatic = ['space-invaders','breakout','pong','tank','asteroids','skiing','balance','airhockey','spacedodge','tetris','brickbuilder'].includes(gameId) ? '\n'+ui('auto')+': ↔' : '';
    return lines[0]+automatic+'\n① '+ui('action')+': '+action;
}

function updateAllText() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        el.textContent = getTranslation(key);
    });
    if (typeof ui === 'function') document.querySelectorAll('[data-ui]').forEach(el => { el.textContent=ui(el.dataset.ui); });
}

function populateLanguageSelector() {
    const select = document.getElementById('language-select');
    if (!select) return;
    select.innerHTML = '';
    availableLanguages.forEach(lang => {
        if (translations[lang.code]) {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = `${lang.flag} ${lang.name}`;
            select.appendChild(option);
        }
    });
}

function loadLanguage() {
    // Accept the original unquoted language preference during migration.
    let saved = storage.read('switchGamesLanguage');
    if (!saved) { try { saved = localStorage.getItem('switchGamesLanguage'); } catch {} }
    if (saved && translations[saved]) {
        currentLanguage = saved;
    }
    populateLanguageSelector();
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = ['ar','he'].includes(currentLanguage) ? 'rtl' : 'ltr';
    updateAllText();
}

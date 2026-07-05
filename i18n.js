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
        localStorage.setItem('switchGamesLanguage', lang);
        updateAllText();
        if (typeof renderPage === 'function') renderPage();
    }
}

function getTranslation(key) {
    return translations[currentLanguage]?.[key] || translations.en?.[key] || key;
}

function getGameName(gameId) {
    return translations[currentLanguage]?.games?.[gameId] || translations.en?.games?.[gameId] || gameId;
}

function getGameInstructions(gameId) {
    return translations[currentLanguage]?.instructions?.[gameId] || translations.en?.instructions?.[gameId] || '';
}

function updateAllText() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        el.textContent = getTranslation(key);
    });
}

function populateLanguageSelector() {
    const select = document.getElementById('language-select');
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
    const saved = localStorage.getItem('switchGamesLanguage');
    if (saved && translations[saved]) {
        currentLanguage = saved;
    }
    populateLanguageSelector();
    document.getElementById('language-select').value = currentLanguage;
    updateAllText();
}

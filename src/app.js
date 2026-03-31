const languages = {
  en: { section: '', babla: 'https://en.bab.la/dictionary/english/', ipa: 'https://cdn.jsdelivr.net/gh/open-dict-data/ipa-dict@master/data/en_US.txt' },
  sv: { section: 'Swedish', babla: 'https://sv.bab.la/lexikon/engelsk-svensk/', ipa: 'https://cdn.jsdelivr.net/gh/open-dict-data/ipa-dict@master/data/sv.txt' },
  es: { section: 'Spanish', babla: 'https://es.bab.la/diccionario/espanol-ingles/', ipa: 'https://cdn.jsdelivr.net/gh/open-dict-data/ipa-dict@master/data/es_ES.txt' },
  fr: { section: 'French', babla: 'https://fr.bab.la/dictionnaire/francais-anglais/', ipa: 'https://cdn.jsdelivr.net/gh/open-dict-data/ipa-dict@master/data/fr_FR.txt' },
};

const lookupForm = document.getElementById('lookup-form');
const lookupInput = document.getElementById('lookup-input');
const languageSelect = document.getElementById('language');
const clearBtn = document.getElementById('clear-btn');
const bablaTab = document.getElementById('babla-tab');
const iframe = document.getElementById('result');
const ipaBar = document.getElementById('ipa-bar');

let currentUrl = '';

// IPA dictionary
const ipaDicts = {};
let ipaRequestId = 0;

async function fetchIPADict(lang) {
  if (ipaDicts[lang]) return ipaDicts[lang];
  const res = await fetch(languages[lang].ipa);
  const text = await res.text();
  const map = new Map();
  for (const line of text.split('\n')) {
    const tab = line.indexOf('\t');
    if (tab !== -1) map.set(line.substring(0, tab), line.substring(tab + 1));
  }
  ipaDicts[lang] = map;
  return map;
}

async function showIPA(term, lang) {
  const requestId = ++ipaRequestId;
  ipaBar.textContent = '\u2026';
  ipaBar.hidden = false;
  try {
    const dict = await fetchIPADict(lang);
    if (requestId !== ipaRequestId) return;
    const ipa = dict.get(term);
    if (ipa) {
      ipaBar.textContent = ipa;
    } else {
      ipaBar.hidden = true;
    }
  } catch {
    if (requestId === ipaRequestId) ipaBar.hidden = true;
  }
}

function getWiktionaryUrl(term, lang) {
  const formatted = term.replace(/ /g, '_');
  const section = languages[lang].section;
  return `https://en.wiktionary.org/wiki/${formatted}${section ? '#' + section : ''}`;
}

function getBablaUrl(term, lang) {
  const formatted = term.replace(/ /g, '-');
  return languages[lang].babla + formatted;
}

function updateUrlParams(word, lang) {
  const params = new URLSearchParams(window.location.search);
  if (word) params.set('word', word);
  else params.delete('word');
  params.set('lang', lang);
  history.replaceState(null, '', '?' + params.toString());
}

function lookup() {
  const term = lookupInput.value.trim().toLowerCase();
  if (!term) return;
  lookupInput.value = term;

  const lang = languageSelect.value;
  const url = getWiktionaryUrl(term, lang);

  if (url === currentUrl) {
    // Force reload same URL
    iframe.contentWindow.location.replace(url);
  } else {
    iframe.src = url;
    currentUrl = url;
  }

  iframe.hidden = false;
  updateUrlParams(term, lang);
  bablaTab.href = getBablaUrl(term, lang);
  showIPA(term, lang);

  // Defer blur so it doesn't interfere with the submit event on mobile
  setTimeout(() => lookupInput.blur(), 0);
}

function clearSearch() {
  lookupInput.value = '';
  clearBtn.hidden = true;
  ipaBar.hidden = true;
  lookupInput.focus();
}

// Input events
lookupInput.addEventListener('input', () => {
  clearBtn.hidden = !lookupInput.value;
});

lookupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  lookup();
});

clearBtn.addEventListener('click', clearSearch);

languageSelect.addEventListener('change', () => {
  localStorage.setItem('lang', languageSelect.value);
  const term = lookupInput.value.trim();
  updateUrlParams(term, languageSelect.value);
  if (term && !iframe.hidden) lookup();
});

// Init from URL params, then localStorage, then default (en)
const params = new URLSearchParams(window.location.search);
const initWord = params.get('word');
const initLang = params.get('lang') || localStorage.getItem('lang');

if (initLang && languages[initLang]) {
  languageSelect.value = initLang;
}

if (initWord) {
  lookupInput.value = initWord;
  clearBtn.hidden = false;
  lookup();
} else {
  lookupInput.focus();
}

// Legal panels
const legalOverlay = document.getElementById('legal-overlay');

function closeLegalPanels() {
  document.querySelectorAll('.legal-panel').forEach((p) => p.hidden = true);
  legalOverlay.hidden = true;
}

document.querySelectorAll('.legal-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const panel = document.getElementById(link.dataset.panel);
    const wasHidden = panel.hidden;
    closeLegalPanels();
    if (wasHidden) {
      panel.hidden = false;
      legalOverlay.hidden = false;
    }
  });
});

legalOverlay.addEventListener('pointerdown', closeLegalPanels);

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// PWA install prompt
let deferredPrompt;
const installBtn = document.getElementById('install-btn');
const installDot = document.getElementById('install-dot');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
  installDot.hidden = false;
});

installBtn.addEventListener('click', (e) => {
  e.preventDefault();
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(() => {
    deferredPrompt = null;
    installBtn.hidden = true;
    installDot.hidden = true;
  });
});

window.addEventListener('appinstalled', () => {
  installBtn.hidden = true;
  installDot.hidden = true;
  deferredPrompt = null;
});

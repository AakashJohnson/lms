import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const LANGUAGES = [
  { code: 'sa', label: 'संस्कृत [Sanskrit]' },
  { code: 'sat', label: 'ᱥᱟᱱᱛᱟᱲᱤ [Santali]' },
  { code: 'ne', label: 'नेपाली [Nepali]' },
  { code: 'ru', label: 'русский [Russian]' },
  { code: 'es', label: 'español [Spanish]' },
  { code: 'fr', label: 'français [French]' },
  { code: 'zh', label: '汉语 [Chinese]' },
  { code: 'ar', label: 'العربية [Arabic]' },
  { code: 'pt', label: 'português [Portuguese]' },
  { code: 'de', label: 'Deutsch [German]' },
  { code: 'ja', label: '日本語 [Japanese]' },
  { code: 'ko', label: '한국어 [Korean]' },
  { code: 'it', label: 'italiano [Italian]' },
  { code: 'tr', label: 'Türkçe [Turkish]' },
  { code: 'ms', label: 'Melayu [Malay]' },
  { code: 'sw', label: 'kiswahili [Swahili]' },
  { code: 'en', label: 'English [English]' },
  { code: 'hi', label: 'हिंदी [Hindi]' },
];

export default function AnuvadiniLanguageSwitcher({ currentLanguage = 'en', onLanguageChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedLanguage = LANGUAGES.find((l) => l.code === currentLanguage);
  const selectedLabel = selectedLanguage
    ? selectedLanguage.label.split('[')[1]?.replace(']', '') || selectedLanguage.label
    : 'English';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter((l) => l.label.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="anu-lang-wrap">
      <button type="button" className="anu-lang-pill" onClick={() => setOpen((v) => !v)}>
        <img src="/ankuvadini.png" alt="Anuvadini" className="anu-lang-logo" />
        <span className="anu-lang-current">{selectedLabel}</span>
        <ChevronDown className="anu-lang-chevron" />
        <span className="anu-lang-divider" />
        <span className="anu-lang-action"><img src="/translate-icon.svg" alt="Translate" /></span>
      </button>

      {open && (
        <div className="anu-lang-dropdown">
          <input
            className="anu-lang-search"
            placeholder="Search language..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="anu-lang-list">
            {filtered.map((lang) => (
              <button
                key={lang.code}
                type="button"
                className="anu-lang-item"
                onClick={() => {
                  onLanguageChange?.(lang.code);
                  setOpen(false);
                }}
              >
                {lang.label}
              </button>
            ))}
          </div>
          <div className="anu-lang-footer">
            <span>Translated by</span>
            <img src="/ankuvadini.png" alt="Anuvadini" />
          </div>
        </div>
      )}
    </div>
  );
}

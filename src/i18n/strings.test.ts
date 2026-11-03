import { translate, translationCoverage, UI_LANGUAGES } from './strings';

describe('interface strings (§20.1)', () => {
  it('translates and falls back to English', () => {
    expect(translate('es', 'tab.home')).toBe('Inicio');
    expect(translate('ko', 'tab.home')).toBe('Home');
    expect(translate('en', 'settings.title')).toBe('Settings');
  });
  it('Spanish covers every interface string but is not marked reviewed', () => {
    expect(translationCoverage('es')).toBe(1);
    expect(UI_LANGUAGES.find((l) => l.id === 'es')?.reviewed).toBe(false);
  });
});

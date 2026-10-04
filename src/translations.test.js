import { expect, test } from 'vitest';
import { supportedLanguages, translate, translations } from './translations';

test('English is available and provides every translated interface label', () => {
  expect(supportedLanguages).toContainEqual({ code: 'en', name: 'English' });
  expect(Object.keys(translations.de).filter((key) => !translations.en[key])).toEqual([]);
  expect(translate('en', 'questionProgress', { current: 2, total: 10 })).toBe('Question 2 of 10');
});

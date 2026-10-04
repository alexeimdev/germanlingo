import { beforeEach, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { verbs } from './data/verbs';

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('verbwerk-preferences', JSON.stringify({ language: 'de', theme: 'light' }));
});

test('flags incomplete auxiliary choices individually without marking the participle wrong', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Vergangenheitsformen' }));
  await user.click(screen.getByRole('button', { name: 'Niveau A1' }));

  await user.click(screen.getByRole('button', { name: 'Prüfen' }));
  const auxiliaryGroup = screen.getByRole('group', { name: 'Perfekt-Hilfsverb wählen' });
  expect(auxiliaryGroup.getAttribute('aria-invalid')).toBe('true');
  for (const auxiliary of ['ist', 'hat']) {
    expect(screen.getByRole('button', { name: auxiliary }).getAttribute('aria-invalid')).toBe('false');
    expect(screen.getByRole('button', { name: auxiliary }).classList.contains('auxiliary-choice-error')).toBe(false);
    expect(screen.getByRole('button', { name: auxiliary }).classList.contains('auxiliary-choice-correct')).toBe(false);
  }

  await user.type(screen.getByRole('textbox', { name: 'Präsens' }), 'beginnt');
  await user.type(screen.getByRole('textbox', { name: 'Präteritum' }), 'begann');
  const participle = screen.getByRole('textbox', { name: 'Partizip Perfekt' });
  await user.type(participle, 'begonnen');
  await user.click(screen.getByRole('button', { name: 'Prüfen' }));

  expect(participle.getAttribute('aria-invalid')).toBe('false');
  expect(participle.classList.contains('form-input-incorrect')).toBe(false);
  expect(auxiliaryGroup.getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByRole('button', { name: 'hat' }).getAttribute('aria-invalid')).toBe('false');
  expect(screen.getByRole('button', { name: 'ist' }).getAttribute('aria-invalid')).toBe('false');
  expect(screen.getByRole('button', { name: 'hat' }).classList.contains('auxiliary-choice-error')).toBe(false);
  expect(screen.getByRole('button', { name: 'ist' }).classList.contains('auxiliary-choice-error')).toBe(false);
});

test('flags an incomplete auxiliary selection as a group without marking a specific button wrong', async () => {
  const user = userEvent.setup();
  window.localStorage.setItem('verbwerk-progress', JSON.stringify({
    xp: 0,
    correctVerbs: [],
    reviewVerbs: ['fahren'],
  }));
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Vergangenheitsformen' }));
  await user.click(screen.getByRole('button', { name: 'Niveau A1' }));

  for (const verb of ['beginnen', 'bleiben', 'bringen', 'denken', 'dürfen', 'essen']) {
    const item = verbs.find(({ infinitive }) => infinitive === verb);
    await user.type(screen.getByRole('textbox', { name: 'Präsens' }), item.present_3sg);
    await user.type(screen.getByRole('textbox', { name: 'Präteritum' }), item.past_simple);
    await user.type(screen.getByRole('textbox', { name: 'Partizip Perfekt' }), item.past_participle);
    for (const auxiliary of item.auxiliary) {
      await user.click(screen.getByRole('button', { name: auxiliary }));
    }
    await user.click(screen.getByRole('button', { name: 'Prüfen' }));
    await user.click(screen.getByRole('button', { name: /^Weiter/ }));
  }

  expect(screen.getByRole('heading', { name: 'fahren' })).toBeTruthy();
  await user.type(screen.getByRole('textbox', { name: 'Präsens' }), 'fährt');
  await user.type(screen.getByRole('textbox', { name: 'Präteritum' }), 'fuhr');
  await user.type(screen.getByRole('textbox', { name: 'Partizip Perfekt' }), 'gefahren');
  const hatButton = screen.getByRole('button', { name: 'hat' });
  const istButton = screen.getByRole('button', { name: 'ist' });
  await user.click(hatButton);
  expect(hatButton.classList.contains('auxiliary-choice-error')).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Prüfen' }));

  const auxiliaryGroup = screen.getByRole('group', { name: 'Perfekt-Hilfsverb wählen' });
  expect(auxiliaryGroup.getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByRole('textbox', { name: 'Partizip Perfekt' }).getAttribute('aria-invalid')).toBe('false');
  expect(hatButton.getAttribute('aria-invalid')).toBe('true');
  expect(hatButton.classList.contains('auxiliary-choice-error')).toBe(true);
  expect(istButton.getAttribute('aria-invalid')).toBe('false');
  expect(istButton.classList.contains('auxiliary-choice-error')).toBe(false);
  expect(screen.getByRole('status').querySelector('.feedback-icon').textContent).toBe('×');
});

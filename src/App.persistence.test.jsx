import { beforeEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { verbs } from './data/verbs';

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('verbwerk-preferences', JSON.stringify({ language: 'de', theme: 'light' }));
});

test('persists earned progress and review marks after the app is reloaded', async () => {
  const user = userEvent.setup();
  const { unmount } = render(<App />);

  await user.click(screen.getByRole('button', { name: 'Vergangenheitsformen' }));
  await user.click(screen.getByRole('button', { name: 'Niveau A1' }));
  await user.click(screen.getByRole('button', { name: 'beginnen zur Wiederholung markieren' }));
  await user.type(screen.getByRole('textbox', { name: 'Präsens' }), 'beginnt');
  await user.type(screen.getByRole('textbox', { name: 'Präteritum' }), 'begann');
  await user.type(screen.getByRole('textbox', { name: 'Partizip Perfekt' }), 'begonnen');
  await user.click(screen.getByRole('button', { name: 'hat' }));
  await user.click(screen.getByRole('button', { name: 'Prüfen' }));

  expect(JSON.parse(window.localStorage.getItem('verbwerk-progress'))).toEqual({
    xp: 10,
    correctVerbs: ['beginnen'],
    reviewVerbs: ['beginnen'],
  });

  unmount();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Vergangenheitsformen' }));
  await user.click(screen.getByRole('button', { name: 'Niveau A1' }));
  const unfinishedA1Verbs = verbs.filter(({ level, infinitive }) => level === 'A1' && infinitive !== 'beginnen');
  expect(screen.getByRole('heading', { name: unfinishedA1Verbs[0].infinitive })).toBeTruthy();
  expect(screen.getByLabelText(`Frage 1 von ${unfinishedA1Verbs.length}`)).toBeTruthy();

  unmount();
  window.localStorage.removeItem('verbwerk-progress');
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Vergangenheitsformen' }));
  await user.click(screen.getByRole('button', { name: 'Niveau A1' }));
  expect(screen.getByRole('heading', { name: 'beginnen' })).toBeTruthy();
});

test('keeps completion isolated to the level where each verb belongs', async () => {
  const user = userEvent.setup();
  window.localStorage.setItem('verbwerk-progress', JSON.stringify({
    xp: 10,
    correctVerbs: ['beginnen'],
    reviewVerbs: [],
  }));
  render(<App />);

  await user.click(screen.getByRole('button', { name: 'Vergangenheitsformen' }));
  await user.click(screen.getByRole('button', { name: 'Niveau A1' }));
  expect(screen.getByRole('heading', { name: 'bleiben' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Übung schließen' }));
  await user.click(screen.getByRole('button', { name: 'Zurück' }));
  await user.click(screen.getByRole('button', { name: 'Vergangenheitsformen' }));
  await user.click(screen.getByRole('button', { name: 'Niveau A2' }));
  const firstA2Verb = verbs.find(({ level }) => level === 'A2');
  expect(screen.getByRole('heading', { name: firstA2Verb.infinitive })).toBeTruthy();
});

test('focuses the continue button after a correct answer and advances with Enter', async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole('button', { name: 'Vergangenheitsformen' }));
  await user.click(screen.getByRole('button', { name: 'Niveau A1' }));
  await user.type(screen.getByRole('textbox', { name: 'Präsens' }), 'beginnt');
  await user.type(screen.getByRole('textbox', { name: 'Präteritum' }), 'begann');
  await user.type(screen.getByRole('textbox', { name: 'Partizip Perfekt' }), 'begonnen');
  const auxiliaryButton = screen.getByRole('button', { name: 'hat' });
  const istButton = screen.getByRole('button', { name: 'ist' });
  expect(auxiliaryButton.getAttribute('aria-pressed')).toBe('false');
  await user.click(auxiliaryButton);
  expect(auxiliaryButton.getAttribute('aria-pressed')).toBe('true');
  expect(istButton.getAttribute('aria-pressed')).toBe('false');
  expect(auxiliaryButton.classList.contains('auxiliary-choice-correct')).toBe(false);
  expect(auxiliaryButton.classList.contains('auxiliary-choice-error')).toBe(false);
  expect(istButton.classList.contains('auxiliary-choice-correct')).toBe(false);
  expect(istButton.classList.contains('auxiliary-choice-error')).toBe(false);
  await user.click(screen.getByRole('button', { name: 'Prüfen' }));

  const continueButton = screen.getByRole('button', { name: 'Weiter' });
  expect(auxiliaryButton.classList.contains('auxiliary-choice-correct')).toBe(true);
  expect(document.activeElement).toBe(continueButton);
  expect(continueButton.textContent.trim()).toBe('Weiter');
  await user.keyboard('{Enter}');

  expect(screen.getByRole('heading', { name: 'bleiben' })).toBeTruthy();
});

test('scrolls focused answer fields into view', async () => {
  const user = userEvent.setup();
  const scrollIntoView = vi.fn();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoView,
  });
  render(<App />);

  await user.click(screen.getByRole('button', { name: 'Vergangenheitsformen' }));
  await user.click(screen.getByRole('button', { name: 'Niveau A1' }));
  await user.click(screen.getByRole('textbox', { name: 'Präsens' }));

  expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' });
  delete HTMLElement.prototype.scrollIntoView;
});

test('shows saved completion when every verb in a level is already correct', async () => {
  const user = userEvent.setup();
  const firstA2Verb = verbs.find(({ level }) => level === 'A2');
  window.localStorage.setItem('verbwerk-progress', JSON.stringify({
    xp: 70,
    correctVerbs: [
      ...verbs.filter(({ level }) => level === 'A1').map(({ infinitive }) => infinitive),
      firstA2Verb.infinitive,
    ],
    reviewVerbs: ['beginnen'],
  }));
  render(<App />);

  await user.click(screen.getByRole('button', { name: 'Vergangenheitsformen' }));
  await user.click(screen.getByRole('button', { name: 'Niveau A1' }));
  expect(screen.getByRole('heading', { name: 'Diese Auswahl ist abgeschlossen!' })).toBeTruthy();
  expect(screen.queryByText('Alle richtigen Antworten für diese Auswahl sind gespeichert.')).toBeNull();
  expect(screen.queryByText('RUNDE ABGESCHLOSSEN')).toBeNull();

  await user.click(screen.getByRole('button', { name: /^Neu starten/ }));
  expect(screen.getByRole('heading', { name: 'beginnen' })).toBeTruthy();
  expect(screen.getByLabelText(`Frage 1 von ${verbs.filter(({ level }) => level === 'A1').length}`)).toBeTruthy();
  expect(JSON.parse(window.localStorage.getItem('verbwerk-progress'))).toEqual({
    xp: 70,
    correctVerbs: [firstA2Verb.infinitive],
    reviewVerbs: ['beginnen'],
  });
});

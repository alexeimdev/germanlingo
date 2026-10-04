import { beforeEach, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { verbs } from './data/verbs';

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('verbwerk-preferences', JSON.stringify({ language: 'de', theme: 'light' }));
  window.localStorage.setItem('verbwerk-progress', JSON.stringify({
    xp: 0,
    correctVerbs: [],
    reviewVerbs: ['beginnen'],
  }));
});

test('app opens directly to practice and supports level selection', async () => {
  const user = userEvent.setup();
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Üben' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Startseite' })).toBeNull();
  expect(document.querySelector('header.topbar')).toBeNull();
  expect(screen.getByRole('button', { name: 'Vergangenheitsformen' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: /Unregelmäßige Verben, leicht gemacht/ })).toBeNull();

  await user.click(screen.getByRole('button', { name: 'Vergangenheitsformen' }));
  expect(screen.getByRole('heading', { name: 'Wähle dein Niveau' })).toBeTruthy();
  const availableLevels = [...new Set(verbs.map(({ level }) => level))].sort();
  for (const level of availableLevels) {
    expect(screen.getByRole('button', { name: `Niveau ${level}` })).toBeTruthy();
  }
  expect(screen.getByRole('button', { name: 'Alle Niveaus' })).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'Niveau A1' }));
  expect(document.querySelector('header.topbar')).toBeNull();
  expect(screen.getByRole('button', { name: 'Übung schließen' }).textContent).toBe('×');
  expect(screen.getByRole('button', { name: 'Übung schließen' }).parentElement.classList.contains('practice-toolbar')).toBe(true);
  expect(screen.getByLabelText(`Frage 1 von ${verbs.filter(({ level }) => level === 'A1').length}`)).toBeTruthy();
  const verbHeading = screen.getByRole('heading', { name: 'beginnen' });
  const favoriteButton = verbHeading.querySelector('.verb-favorite-button');
  expect(favoriteButton).toBeTruthy();
  expect(favoriteButton.querySelector('svg')).toBeTruthy();
  expect(favoriteButton.getAttribute('aria-pressed')).toBe('true');
  await user.click(favoriteButton);
  expect(favoriteButton.getAttribute('aria-pressed')).toBe('false');
  await user.click(favoriteButton);
  expect(favoriteButton.getAttribute('aria-pressed')).toBe('true');
  expect(verbHeading.querySelector('.question-verb').textContent).toBe('beginnen');
  const exercisePanel = document.querySelector('.practice-exercise-panel');
  expect(exercisePanel).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'Übung schließen' }));
  expect(screen.getByRole('heading', { name: 'Wähle dein Niveau' })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Zurück' }));
  expect(screen.getByRole('heading', { name: 'Üben' })).toBeTruthy();
});

test('level selection starts rounds with only the selected levels', async () => {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: 'Vergangenheitsformen' }));

  await user.click(screen.getByRole('button', { name: 'Niveau A2' }));
  expect(screen.getByLabelText(`Frage 1 von ${verbs.filter(({ level }) => level === 'A2').length}`)).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'Übung schließen' }));
  await user.click(screen.getByRole('button', { name: 'Zurück' }));
  await user.click(screen.getByRole('button', { name: 'Vergangenheitsformen' }));
  await user.click(screen.getByRole('button', { name: 'Niveau C2' }));
  expect(screen.getByLabelText(`Frage 1 von ${verbs.filter(({ level }) => level === 'C2').length}`)).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'Übung schließen' }));
  await user.click(screen.getByRole('button', { name: 'Zurück' }));
  await user.click(screen.getByRole('button', { name: 'Vergangenheitsformen' }));
  await user.click(screen.getByRole('button', { name: 'Alle Niveaus' }));
  expect(screen.getByLabelText(`Frage 1 von ${verbs.length}`)).toBeTruthy();
});

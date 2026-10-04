import { beforeEach, expect, test } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App, { isAnswerCorrect } from './App';
import { verbs } from './data/verbs';

beforeEach(() => {
  window.localStorage.clear();
});

test('requires all three verb forms before advancing', async () => {
  const user = userEvent.setup();

  render(<App />);

  expect(screen.queryByText(/present tense clue/i)).toBeNull();
  expect(screen.queryByText(/a little practice goes a long way/i)).toBeNull();
  window.localStorage.setItem('verbwerk-preferences', JSON.stringify({ language: 'de', theme: 'light' }));
  expect(screen.getByRole('heading', { name: /irregular verbs, made simple/i })).toBeTruthy();
  expect(screen.queryByRole('group', { name: /choose a tense/i })).toBeNull();
  expect(screen.queryByRole('button', { name: 'ging' })).toBeNull();
  const verbStar = screen.getByRole('button', { name: 'Mark beginnen for review' });
  expect(verbStar.textContent).toBe('☆');
  await user.click(verbStar);
  expect(verbStar.textContent).toBe('★');
  expect(verbStar.getAttribute('aria-pressed')).toBe('true');
  await user.click(verbStar);
  expect(screen.getByRole('heading', { name: /unregelmäßige verben, leicht gemacht/i })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: /^check$/i }));
  const istButton = screen.getByRole('button', { name: 'ist' });
  const verbStar = screen.getByRole('button', { name: 'beginnen zur Wiederholung markieren' });
  expect(istButton.getAttribute('aria-invalid')).toBe('true');
  expect(hatButton.getAttribute('aria-invalid')).toBe('true');

  const presentInput = screen.getByRole('textbox', { name: /present/i });
  const prateritumInput = screen.getByRole('textbox', { name: /präteritum/i });
  const perfektInput = screen.getByRole('textbox', { name: /perfekt/i });
  expect(presentInput.required).toBe(true);
  expect(prateritumInput.required).toBe(true);
  expect(perfektInput.required).toBe(true);
  expect(presentInput.getAttribute('aria-invalid')).toBe('true');
  expect(prateritumInput.getAttribute('aria-invalid')).toBe('true');
  expect(perfektInput.getAttribute('aria-invalid')).toBe('true');
  expect(screen.queryByText('Enter this form.')).toBeNull();
  expect(screen.queryByText('beginnt')).toBeNull();
  const perfektInput = screen.getByRole('textbox', { name: /partizip perfekt/i });
  expect(screen.getByRole('tooltip').textContent).toContain('beginnt');
  expect(screen.queryByText('begann')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Hint for Present' }));

  await user.click(hatButton);
  expect(istButton.getAttribute('aria-pressed')).toBe('false');
  expect(hatButton.getAttribute('aria-pressed')).toBe('true');
  expect(istButton.getAttribute('aria-invalid')).toBe('false');
  await user.click(screen.getByRole('button', { name: 'Hinweis für Präsens' }));

  await user.type(presentInput, ' BEGINNT ');
  await user.click(screen.getByRole('button', { name: 'Hinweis für Präsens' }));
  expect(presentInput.getAttribute('aria-invalid')).toBe('false');
  expect(presentInput.classList.contains('form-input-correct')).toBe(false);
  expect(presentInput.classList.contains('form-input-incorrect')).toBe(false);
  await user.type(prateritumInput, 'begann');
  expect(prateritumInput.getAttribute('aria-invalid')).toBe('false');
  await user.click(screen.getByRole('button', { name: /^check$/i }));
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.getByRole('button', { name: /^check$/i })).toBeTruthy();
  expect(presentInput.disabled).toBe(true);
  expect(prateritumInput.disabled).toBe(true);
  expect(perfektInput.disabled).toBe(false);

  await user.type(perfektInput, 'begonnen');
  await user.click(screen.getByRole('button', { name: /^check$/i }));
  await user.click(screen.getByRole('button', { name: /^prüfen$/i }));
  expect(screen.getByRole('status').textContent).toMatch(/Richtig!/i);
  expect(screen.getByRole('button', { name: /^prüfen$/i })).toBeTruthy();
  expect(JSON.parse(window.localStorage.getItem('verbwerk-progress')).correctVerbs).toContain('beginnen');
  expect(screen.getByRole('button', { name: /^next\b/i }).disabled).toBe(false);
  expect(screen.getByRole('status').querySelector('.feedback-icon').textContent).toBe('✓');
  await user.click(screen.getByRole('button', { name: /^next\b/i }));

  expect(screen.getByRole('heading', { name: /bleiben/ })).toBeTruthy();
  expect(screen.getByLabelText(`Question 2 of ${verbs.length}`)).toBeTruthy();
  expect(screen.getByRole('button', { name: /^check$/i })).toBeTruthy();
});

  expect(screen.getByRole('button', { name: /^weiter\b/i }).disabled).toBe(false);
  await user.click(screen.getByRole('button', { name: /^weiter\b/i }));

  render(<App />);
  expect(screen.getByLabelText(`Frage 2 von ${verbs.length}`)).toBeTruthy();
  expect(screen.getByRole('button', { name: /^prüfen$/i })).toBeTruthy();
  await user.type(screen.getByRole('textbox', { name: /präteritum/i }), 'begann');
  await user.click(screen.getByRole('button', { name: /^check$/i }));
  expect(screen.queryByRole('status')).toBeNull();

  await user.type(screen.getByRole('textbox', { name: /perfekt/i }), 'falsch');
  await user.click(screen.getByRole('button', { name: 'hat' }));
  await user.click(screen.getByRole('button', { name: /^check$/i }));

  expect(screen.getByRole('status').textContent).toMatch(/not quite/i);
  expect(screen.getByRole('status').textContent).not.toContain('hat begonnen');
  expect(screen.queryByText('hat begonnen')).toBeNull();
  expect(screen.getAllByText('0')).toHaveLength(2);
  expect(screen.getByRole('button', { name: /check again/i })).toBeTruthy();
  expect(screen.getByRole('button', { name: /check again/i }).textContent).toBe('Check again');
  expect(screen.getByRole('textbox', { name: /present/i }).disabled).toBe(true);
  expect(screen.getByRole('textbox', { name: /präteritum/i }).disabled).toBe(true);
  const perfektInput = screen.getByRole('textbox', { name: /perfekt/i });
  expect(perfektInput.disabled).toBe(false);

  await user.click(screen.getByRole('button', { name: 'Hint for Perfekt' }));
  expect(screen.getByRole('tooltip').textContent).toContain('hat begonnen');
  await user.clear(perfektInput);
  await user.type(perfektInput, 'begonnen');
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.getByRole('button', { name: /^check$/i })).toBeTruthy();
  await user.click(screen.getByRole('button', { name: /^check$/i }));

  expect(screen.getByRole('status').textContent).toMatch(/richtig/i);
  expect(screen.getByRole('button', { name: /^next\b/i })).toBeTruthy();
});

test('requires every listed auxiliary when more than one is valid', () => {
  const fahren = verbs.find((verb) => verb.infinitive === 'fahren');
  const answer = { perfekt: 'gefahren' };

  expect(isAnswerCorrect(fahren, 'perfekt', answer, ['ist'])).toBe(false);
  expect(isAnswerCorrect(fahren, 'perfekt', answer, ['hat'])).toBe(false);
  expect(isAnswerCorrect(fahren, 'perfekt', answer, ['ist', 'hat'])).toBe(true);
  expect(isAnswerCorrect(fahren, 'perfekt', answer, ['ist', 'hat', 'hat'])).toBe(false);
});

test('can mark round verbs and start a round containing only the marked words', async () => {
  const user = userEvent.setup();
  render(<App />);

  for (const [index, verb] of verbs.entries()) {
    fireEvent.change(screen.getByRole('textbox', { name: /present/i }), { target: { value: verb.present_3sg } });
    fireEvent.change(screen.getByRole('textbox', { name: /präteritum/i }), { target: { value: verb.past_simple } });
    fireEvent.change(screen.getByRole('textbox', { name: /perfekt participle/i }), { target: { value: verb.past_participle } });
    for (const auxiliary of verb.auxiliary) {
      await user.click(screen.getByRole('button', { name: auxiliary }));
    }

    await user.click(screen.getByRole('button', { name: /^check$/i }));
    if (index < verbs.length - 1) await user.click(screen.getByRole('button', { name: /^next\b/i }));
    else await user.click(screen.getByRole('button', { name: /finish round/i }));
  }

  expect(screen.getByRole('heading', { name: 'Gut gemacht!' })).toBeTruthy();
  const firstReviewVerb = verbs[0];
  const secondReviewVerb = verbs[verbs.length - 1];
  await user.click(screen.getByRole('button', { name: `Mark ${firstReviewVerb.infinitive} for review` }));
  await user.click(screen.getByRole('button', { name: `Mark ${secondReviewVerb.infinitive} for review` }));
  expect(screen.getByRole('button', { name: `Remove ${firstReviewVerb.infinitive} for review` }).getAttribute('aria-pressed')).toBe('true');

  expect(JSON.parse(window.localStorage.getItem('verbwerk-progress')).reviewVerbs).toEqual([
    firstReviewVerb.infinitive,
    secondReviewVerb.infinitive,
  ]);
  await user.click(screen.getByRole('button', { name: /practice marked verbs \(2\)/i }));
  expect(screen.getByLabelText('Question 1 of 2')).toBeTruthy();
  expect(screen.getByRole('heading', { name: new RegExp(firstReviewVerb.infinitive) })).toBeTruthy();

  fireEvent.change(screen.getByRole('textbox', { name: /present/i }), { target: { value: firstReviewVerb.present_3sg } });
  fireEvent.change(screen.getByRole('textbox', { name: /präteritum/i }), { target: { value: firstReviewVerb.past_simple } });
  fireEvent.change(screen.getByRole('textbox', { name: /perfekt participle/i }), { target: { value: firstReviewVerb.past_participle } });
  await user.click(screen.getByRole('button', { name: firstReviewVerb.auxiliary[0] }));
  await user.click(screen.getByRole('button', { name: /^check$/i }));
  await user.click(screen.getByRole('button', { name: /^next\b/i }));

  expect(screen.getByLabelText('Question 2 of 2')).toBeTruthy();
  expect(screen.getByRole('heading', { name: new RegExp(secondReviewVerb.infinitive) })).toBeTruthy();
});

test('can reset saved progress and review marks', async () => {
  const user = userEvent.setup();
  window.localStorage.setItem('verbwerk-progress', JSON.stringify({
    xp: 35,
    correctVerbs: ['beginnen', 'bleiben'],
    reviewVerbs: ['gehen'],
  }));

  render(<App />);

  expect(document.querySelector('.daily-progress-ring strong').textContent).toBe('35');
  await user.click(screen.getByRole('button', { name: 'Reset progress' }));
  await user.click(screen.getByRole('button', { name: 'Reset' }));

  expect(JSON.parse(window.localStorage.getItem('verbwerk-progress'))).toEqual({
    xp: 0,
    correctVerbs: [],
    reviewVerbs: [],
  });
  expect(document.querySelector('.daily-progress-ring strong').textContent).toBe('0');
  expect(screen.getByRole('heading', { name: /beginnen/ })).toBeTruthy();
});

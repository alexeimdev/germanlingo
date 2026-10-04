import { expect, test } from 'vitest';
import { isAnswerCorrect } from './App';
import { verbs } from './data/verbs';

test('requires all listed auxiliaries for a Perfekt answer', () => {
  const fahren = verbs.find((verb) => verb.infinitive === 'fahren');
  const answer = { perfekt: 'gefahren' };

  expect(fahren.auxiliary).toEqual(['hat', 'ist']);
  expect(isAnswerCorrect(fahren, 'perfekt', answer, ['hat'])).toBe(false);
  expect(isAnswerCorrect(fahren, 'perfekt', answer, ['ist'])).toBe(false);
  expect(isAnswerCorrect(fahren, 'perfekt', answer, ['hat', 'ist'])).toBe(true);
  expect(isAnswerCorrect(fahren, 'perfekt', answer, ['hat', 'ist', 'hat'])).toBe(false);
});

test('accepts the listed auxiliary for verbs with one auxiliary', () => {
  const beginnen = verbs.find((verb) => verb.infinitive === 'beginnen');
  const answer = { perfekt: 'begonnen' };

  expect(beginnen.auxiliary).toEqual(['hat']);
  expect(isAnswerCorrect(beginnen, 'perfekt', answer, ['hat'])).toBe(true);
  expect(isAnswerCorrect(beginnen, 'perfekt', answer, [])).toBe(false);
});

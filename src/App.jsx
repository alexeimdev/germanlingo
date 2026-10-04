import { useEffect, useRef, useState } from 'react';
import { verbs } from './data/verbs';
import { supportedLanguages, translate } from './translations';
import './App.css';

const roundStartIndex = 0;
const defaultRoundLength = verbs.length;
const defaultRoundVerbIndices = Array.from({ length: defaultRoundLength }, (_, index) => index);
const availableVerbLevels = [...new Set(verbs.map(({ level }) => level))].sort();
const progressStorageKey = 'verbwerk-progress';
const preferencesStorageKey = 'verbwerk-preferences';
const defaultPreferences = { language: 'de', theme: 'light' };
const emptySavedProgress = { xp: 0, correctVerbs: [], reviewVerbs: [] };

function readPreferences() {
  if (typeof window === 'undefined') return null;

  try {
    const stored = JSON.parse(window.localStorage.getItem(preferencesStorageKey) || 'null');
    if (!stored || !supportedLanguages.some(({ code }) => code === stored.language)) return null;

    return {
      language: stored.language,
      theme: stored.theme === 'dark' ? 'dark' : 'light',
    };
  } catch {
    return null;
  }
}

function writePreferences(preferences) {
  try {
    window.localStorage.setItem(preferencesStorageKey, JSON.stringify(preferences));
  } catch {
    return;
  }
}

function readSavedProgress() {
  if (typeof window === 'undefined') return emptySavedProgress;

  try {
    const stored = JSON.parse(window.localStorage.getItem(progressStorageKey) || '{}');
    const knownVerbs = new Set(verbs.map(({ infinitive }) => infinitive));
    const validVerbList = (list) => Array.isArray(list)
      ? [...new Set(list.filter((name) => knownVerbs.has(name)))]
      : [];

    return {
      xp: Number.isFinite(stored.xp) && stored.xp >= 0 ? stored.xp : 0,
      correctVerbs: validVerbList(stored.correctVerbs),
      reviewVerbs: validVerbList(stored.reviewVerbs),
    };
  } catch {
    return emptySavedProgress;
  }
}

function writeSavedProgress(progress) {
  try {
    window.localStorage.setItem(progressStorageKey, JSON.stringify(progress));
  } catch {
    return;
  }
}

function getAnswer(verb, tense) {
  if (tense === 'present') return verb.present_3sg;
  if (tense === 'prateritum') return verb.past_simple;

  const auxiliary = verb.auxiliary.join(' / ');
  return `${auxiliary} ${verb.past_participle}`;
}

function normalizeAnswer(answer) {
  return answer.trim().toLocaleLowerCase('de-DE').replace(/\s*\/\s*/g, ' / ').replace(/\s+/g, ' ');
}

export function isAnswerCorrect(verb, key, answers, selectedAuxiliaries = []) {
  if (key === 'perfekt') {
    const allowedAuxiliaries = verb.auxiliary;
    return normalizeAnswer(answers.perfekt) === normalizeAnswer(verb.past_participle)
      && selectedAuxiliaries.length === allowedAuxiliaries.length
      && allowedAuxiliaries.every((auxiliary) => selectedAuxiliaries.includes(auxiliary));
  }

  return normalizeAnswer(answers[key]) === normalizeAnswer(getAnswer(verb, key));
}

const tenseForms = [
  { key: 'present' },
  { key: 'prateritum' },
  { key: 'perfekt' },
];
const emptyAnswers = { present: '', prateritum: '', perfekt: '' };

function App() {
  const [initialPreferences] = useState(readPreferences);
  const [preferences, setPreferences] = useState(initialPreferences ?? defaultPreferences);
  const [activePage, setActivePage] = useState('practice');
  const [pageDirection, setPageDirection] = useState('forward');
  const [showSetupWizard, setShowSetupWizard] = useState(initialPreferences === null);
  const [wizardStep, setWizardStep] = useState(0);
  const [roundVerbIndices, setRoundVerbIndices] = useState(defaultRoundVerbIndices);
  const [roundLevel, setRoundLevel] = useState(null);
  const [roundPosition, setRoundPosition] = useState(0);
  const [answers, setAnswers] = useState(emptyAnswers);
  const [selectedAuxiliaries, setSelectedAuxiliaries] = useState([]);
  const [submittedAnswers, setSubmittedAnswers] = useState(null);
  const [checkAttempted, setCheckAttempted] = useState(false);
  const [changedFields, setChangedFields] = useState(() => new Set());
  const [activeHint, setActiveHint] = useState(null);
  const [score, setScore] = useState(0);
  const [roundComplete, setRoundComplete] = useState(false);
  const [savedProgress, setSavedProgress] = useState(readSavedProgress);
  const continueButtonRef = useRef(null);
  const fieldScrollTimerRef = useRef(null);

  const t = (key, values) => translate(preferences.language, key, values);

  useEffect(() => {
    document.documentElement.lang = preferences.language;
    document.documentElement.dir = preferences.language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences]);

  useEffect(() => {
    writeSavedProgress(savedProgress);
  }, [savedProgress]);

  const roundLength = roundVerbIndices.length;
  const currentVerbIndex = roundVerbIndices[roundPosition] ?? defaultRoundVerbIndices[0];
  const verb = verbs[currentVerbIndex];
  const correctAnswers = Object.fromEntries(tenseForms.map(({ key }) => [key, getAnswer(verb, key)]));
  const auxiliaryOptions = ['ist', 'hat'];
  const correctCount = submittedAnswers === null
    ? 0
    : tenseForms.filter(({ key }) => isAnswerCorrect(verb, key, submittedAnswers.answers, submittedAnswers.perfectAuxiliaries)).length;
  const allFormsCorrect = submittedAnswers !== null && correctCount === tenseForms.length;
  const isCurrentVerbMarked = savedProgress.reviewVerbs.includes(verb.infinitive);

  useEffect(() => {
    if (allFormsCorrect && !roundComplete) continueButtonRef.current?.focus();
  }, [allFormsCorrect, roundComplete]);

  useEffect(() => () => window.clearTimeout(fieldScrollTimerRef.current), []);

  function keepFocusedFieldVisible(event) {
    const field = event.currentTarget;
    if (typeof field.scrollIntoView !== 'function') return;

    window.clearTimeout(fieldScrollTimerRef.current);
    field.scrollIntoView({ block: 'center', behavior: 'smooth' });
    fieldScrollTimerRef.current = window.setTimeout(() => {
      field.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 350);
  }

  function updatePreference(key, value) {
    setPreferences((currentPreferences) => {
      const nextPreferences = { ...currentPreferences, [key]: value };
      writePreferences(nextPreferences);
      return nextPreferences;
    });
  }

  function finishSetupWizard() {
    writePreferences(preferences);
    setShowSetupWizard(false);
    setWizardStep(0);
    navigateToPage('practice');
  }

  function navigateToPage(page, direction = 'forward') {
    setPageDirection(direction);
    setActivePage(page);
  }

  function startRoundWithIndices(indices) {
    setRoundVerbIndices(indices);
    setRoundPosition(0);
    setAnswers(emptyAnswers);
    setSelectedAuxiliaries([]);
    setSubmittedAnswers(null);
    setCheckAttempted(false);
    setChangedFields(new Set());
    setActiveHint(null);
    setScore(0);
    setRoundComplete(false);
  }

  function updateSavedProgress(update) {
    setSavedProgress(update);
  }

  function submitAnswers(event) {
    event.preventDefault();
    if (allFormsCorrect) {
      continueRound();
      return;
    }
    setCheckAttempted(true);
    setChangedFields(new Set());
    if (tenseForms.some(({ key }) => answers[key].trim() === '') || selectedAuxiliaries.length === 0) return;

    const answerSet = { answers: { ...answers }, perfectAuxiliaries: [...selectedAuxiliaries] };
    setSubmittedAnswers(answerSet);

    if (tenseForms.every(({ key }) => isAnswerCorrect(verb, key, answerSet.answers, answerSet.perfectAuxiliaries))) {
      setScore((currentScore) => currentScore + 1);
      updateSavedProgress((currentProgress) => ({
        ...currentProgress,
        xp: currentProgress.xp + 10,
        correctVerbs: currentProgress.correctVerbs.includes(verb.infinitive)
          ? currentProgress.correctVerbs
          : [...currentProgress.correctVerbs, verb.infinitive],
      }));
    }
  }

  function continueRound() {
    if (submittedAnswers === null) return;

    if (roundPosition + 1 >= roundLength) {
      setRoundComplete(true);
      return;
    }

    setRoundPosition((currentPosition) => currentPosition + 1);
    setAnswers(emptyAnswers);
    setSelectedAuxiliaries([]);
    setSubmittedAnswers(null);
    setCheckAttempted(false);
    setChangedFields(new Set());
    setActiveHint(null);
  }

  function restartRound() {
    setRoundPosition(0);
    setAnswers(emptyAnswers);
    setSelectedAuxiliaries([]);
    setSubmittedAnswers(null);
    setCheckAttempted(false);
    setChangedFields(new Set());
    setActiveHint(null);
    setScore(0);
    setRoundComplete(false);
  }

  function toggleReviewVerb(infinitive) {
    updateSavedProgress((currentProgress) => ({
      ...currentProgress,
      reviewVerbs: currentProgress.reviewVerbs.includes(infinitive)
        ? currentProgress.reviewVerbs.filter((name) => name !== infinitive)
        : [...currentProgress.reviewVerbs, infinitive],
    }));
  }

  function startMarkedRound() {
    const markedIndices = savedProgress.reviewVerbs
      .map((infinitive) => verbs.findIndex((item) => item.infinitive === infinitive))
      .filter((index) => index >= 0);
    if (markedIndices.length === 0) return;

    setRoundVerbIndices(markedIndices);
    setRoundPosition(0);
    setAnswers(emptyAnswers);
    setSelectedAuxiliaries([]);
    setSubmittedAnswers(null);
    setCheckAttempted(false);
    setChangedFields(new Set());
    setActiveHint(null);
    setScore(0);
    setRoundComplete(false);
  }

  function startAllVerbsRound() {
    setRoundLevel(null);
    startRoundWithIndices(defaultRoundVerbIndices);
  }

  function startLevelRound(level) {
    const indices = verbs
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => (level === 'all' || item.level === level)
        && !savedProgress.correctVerbs.includes(item.infinitive))
      .map(({ index }) => index);
    setRoundLevel(level);
    startRoundWithIndices(indices);
    if (indices.length === 0) setRoundComplete(true);
    navigateToPage('exercise');
  }

  function restartCompletedLevel() {
    const levelIndices = verbs
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => roundLevel === 'all' || item.level === roundLevel)
      .map(({ index }) => index);
    const levelVerbs = new Set(levelIndices.map((index) => verbs[index].infinitive));
    updateSavedProgress((currentProgress) => ({
      ...currentProgress,
      correctVerbs: currentProgress.correctVerbs.filter((name) => !levelVerbs.has(name)),
    }));
    startRoundWithIndices(levelIndices);
  }

  return (
    <div className="app-shell">
      <main className="main-content">
        <div key={activePage} className={`page-transition page-transition-${pageDirection}`}>
        <>
            {activePage !== 'exercise' && activePage !== 'practice' && <header className="topbar">
              <div className="topbar-leading">
                <button
                  type="button"
                  className="home-button"
                  onClick={() => navigateToPage('practice', 'backward')}
                >
                  {t(activePage === 'levels' ? 'back' : 'practice')}
                </button>
                <strong className="page-title">{t(
                  activePage === 'levels' ? 'pastTense'
                      : activePage === 'wordList' ? 'wordList'
                        : activePage === 'progress' ? 'progressNav' : 'preferences',
                )}</strong>
              </div>
            </header>}

        {activePage === 'practice' && (
          <section className="selection-page">
            <header className="selection-heading">
              <h1>{t('practice')}</h1>
            </header>
            <div className="home-menu">
              <button className="home-menu-item" type="button" onClick={() => navigateToPage('levels')}>
                <span className="home-menu-icon" aria-hidden="true">✳</span>
                <span>{t('pastTense')}</span>
                <span className="home-menu-arrow" aria-hidden="true">→</span>
              </button>
            </div>
          </section>
        )}

        {activePage === 'levels' && (
          <section className="selection-page">
            <header className="selection-heading">
              <h1>{t('selectLevel')}</h1>
              <p>{t('pastTense')}</p>
            </header>
            <div className="level-menu" role="group" aria-label={t('selectLevel')}>
              {Array.from({ length: Math.ceil(availableVerbLevels.length / 2) }, (_, rowIndex) => (
                <div className="level-menu-row" key={availableVerbLevels[rowIndex * 2]}>
                  {availableVerbLevels.slice(rowIndex * 2, rowIndex * 2 + 2).map((level) => (
                    <button className={`home-menu-item level-menu-item level-menu-${level[0].toLowerCase()}`} key={level} type="button" onClick={() => startLevelRound(level)}>
                      <span className="home-menu-icon" aria-hidden="true">{level}</span>
                      <span>{t('levelLabel', { level })}</span>
                    </button>
                  ))}
                </div>
              ))}
              <div className="level-menu-row level-menu-all-row">
                <button className="home-menu-item level-menu-item level-menu-all" type="button" onClick={() => startLevelRound('all')}>
                  <span className="home-menu-icon" aria-hidden="true">✦</span>
                  <span>{t('allLevels')}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {activePage === 'exercise' && <div className="lesson-layout">
          <section className="lesson-column" aria-label="Verb practice">
            <div className="practice-toolbar">
              <button
                type="button"
                className="close-practice-button"
                aria-label={t('closePractice')}
                title={t('closePractice')}
                onClick={() => navigateToPage('levels', 'backward')}
              >
                ×
              </button>
              {roundLength > 0 && (
                <div className="lesson-progress" aria-label={t('questionProgress', { current: roundComplete ? roundLength : roundPosition + 1, total: roundLength })}>
                  <div className="progress-track"><span style={{ width: `${(roundComplete ? roundLength : roundPosition + 1) / roundLength * 100}%` }} /></div>
                  <span className="progress-count">{roundComplete ? roundLength : roundPosition + 1}<span> / {roundLength}</span></span>
                </div>
              )}
            </div>

            {!roundComplete ? (
              <div className="exercise-panel practice-exercise-panel">
                <div className="question-copy">
                  <p className="question-kicker">{t('questionPrompt')}</p>
                  <h2 className="verb-question-heading" dir="ltr" aria-label={verb.infinitive}>
                    <button
                      type="button"
                      className={`review-star-button verb-favorite-button${isCurrentVerbMarked ? ' review-star-marked' : ''}`}
                      aria-label={t(isCurrentVerbMarked ? 'removeFromReview' : 'markForReview', { name: verb.infinitive })}
                      aria-pressed={isCurrentVerbMarked}
                      onClick={() => toggleReviewVerb(verb.infinitive)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m12 2.75 2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.31l-5.7 3 1.09-6.35-4.62-4.5 6.38-.93L12 2.75Z" />
                      </svg>
                    </button>
                    <span className="question-verb">{verb.infinitive}</span>
                  </h2>
                </div>

                <form className={`forms-exercise${submittedAnswers !== null ? ' forms-exercise-answered' : ''}`} onSubmit={submitAnswers} aria-label={t('questionPrompt')} noValidate>
                  <div className="verb-form-fields">
                    {tenseForms.map(({ key }) => {
                      const label = t(key);
                      const validationAnswers = submittedAnswers?.answers ?? answers;
                      const validationAuxiliaries = submittedAnswers?.perfectAuxiliaries ?? selectedAuxiliaries;
                      const fieldChecked = submittedAnswers !== null || (checkAttempted && !changedFields.has(key));
                      const auxiliarySelectionIsCorrect = validationAuxiliaries.length === verb.auxiliary.length
                        && verb.auxiliary.every((auxiliary) => validationAuxiliaries.includes(auxiliary));
                      const auxiliaryFieldChecked = submittedAnswers !== null
                        || (checkAttempted && !changedFields.has('perfekt'));
                      const fieldValueIsCorrect = key === 'perfekt'
                        ? normalizeAnswer(validationAnswers.perfekt) === normalizeAnswer(verb.past_participle)
                        : isAnswerCorrect(verb, key, validationAnswers, validationAuxiliaries);
                      const isCorrect = fieldChecked
                        && fieldValueIsCorrect
                        && (key !== 'perfekt' || auxiliarySelectionIsCorrect);
                      const hasError = fieldChecked && !fieldValueIsCorrect;
                      const fieldClass = isCorrect
                        ? 'verb-form-input form-input-correct'
                        : hasError ? 'verb-form-input form-input-incorrect' : 'verb-form-input';

                      return (
                        <div className={`verb-form-field${hasError ? ' verb-form-field-error' : ''}`} key={key}>
                          <label htmlFor={`answer-${key}`}>
                            <span>{label}</span>
                          </label>
                          <div
                            className={`verb-form-control ${key === 'perfekt' ? 'perfekt-control' : ''}`}
                            onBlur={(event) => {
                              if (activeHint === key && !event.currentTarget.contains(event.relatedTarget)) setActiveHint(null);
                            }}
                          >
                            {key === 'perfekt' && (
                              <div
                                className="auxiliary-buttons"
                                role="group"
                                aria-label={t('chooseAuxiliary')}
                                aria-invalid={checkAttempted && !auxiliarySelectionIsCorrect}
                              >
                                {auxiliaryOptions.map((auxiliary) => {
                                  const isAuxiliarySelected = validationAuxiliaries.includes(auxiliary);
                                  const auxiliaryHasError = auxiliaryFieldChecked
                                    && isAuxiliarySelected
                                    && !auxiliarySelectionIsCorrect;
                                  const auxiliaryIsCorrect = auxiliaryFieldChecked
                                    && auxiliarySelectionIsCorrect
                                    && isAuxiliarySelected;

                                  return (
                                    <button
                                      key={auxiliary}
                                      type="button"
                                      className={`auxiliary-choice${auxiliaryHasError ? ' auxiliary-choice-error' : auxiliaryIsCorrect ? ' auxiliary-choice-correct' : ''}`}
                                      aria-pressed={isAuxiliarySelected}
                                      aria-invalid={auxiliaryHasError}
                                      disabled={isCorrect}
                                      onClick={() => {
                                        setSelectedAuxiliaries((current) => current.includes(auxiliary)
                                          ? current.filter((selected) => selected !== auxiliary)
                                          : [...current, auxiliary]);
                                        setChangedFields((current) => new Set(current).add('perfekt'));
                                        setSubmittedAnswers(null);
                                      }}
                                    >
                                      {auxiliary}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            <input
                              id={`answer-${key}`}
                              className={fieldClass}
                              type="text"
                              autoComplete="off"
                              spellCheck="false"
                              aria-label={key === 'perfekt' ? t('perfektParticiple') : undefined}
                              required
                              value={answers[key]}
                              onFocus={keepFocusedFieldVisible}
                              onChange={(event) => {
                                setAnswers((currentAnswers) => ({ ...currentAnswers, [key]: event.target.value.toLocaleLowerCase('de-DE') }));
                                setChangedFields((current) => new Set(current).add(key));
                                setSubmittedAnswers(null);
                              }}
                              disabled={isCorrect}
                              aria-invalid={hasError}
                            />
                            <button
                              type="button"
                              className="field-hint-button"
                              aria-label={t('hintFor', { label })}
                              aria-expanded={activeHint === key}
                              aria-describedby={activeHint === key ? `hint-${key}` : undefined}
                              title={t('showHint', { label })}
                              onClick={() => setActiveHint((current) => current === key ? null : key)}
                              onKeyDown={(event) => { if (event.key === 'Escape') setActiveHint(null); }}
                            >
                              ?
                            </button>
                            {activeHint === key && <span id={`hint-${key}`} className="hint-tooltip" role="tooltip">{correctAnswers[key]}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {submittedAnswers !== null && (
                    <div className={allFormsCorrect ? 'answer-feedback feedback-correct' : 'answer-feedback feedback-incorrect'} role="status">
                      <div className="feedback-icon">{allFormsCorrect ? '✓' : '×'}</div>
                      <div>
                        <strong>{allFormsCorrect ? t('correctTitle') : t('incorrectTitle')}</strong>
                        <span>{allFormsCorrect ? t('correctText') : t('correctCount', { count: correctCount })}</span>
                      </div>
                    </div>
                )}
                <div className="exercise-footer">
                  <button type="submit" className="continue-button" ref={continueButtonRef}>
                    {submittedAnswers === null
                      ? t('check')
                      : allFormsCorrect
                        ? roundPosition + 1 === roundLength ? t('finishRound') : t('next')
                        : t('checkAgain')}
                  </button>
                </div>
                </form>

              </div>
            ) : (
              <div className="exercise-panel practice-exercise-panel completion-panel" role="status">
                <div className="completion-icon">✦</div>
                <h2>{roundLength === 0 ? t('levelAlreadyComplete') : t('correctTitle')}</h2>
                {roundLength > 0 && <p>{t('scoreSummary', { score, total: roundLength })}</p>}
                {roundLength > 0 && <section className="round-review-picker" aria-label={t('saveRoundVerbs')}>
                  <h3>{t('saveRoundVerbs')}</h3>
                  <ul>
                    {roundVerbIndices.map((index) => {
                      const item = verbs[index];
                      const isMarked = savedProgress.reviewVerbs.includes(item.infinitive);

                      return (
                        <li className="round-review-row" key={item.infinitive}>
                          <button
                            type="button"
                            className={`review-star-button${isMarked ? ' review-star-marked' : ''}`}
                            aria-label={t(isMarked ? 'removeFromReview' : 'markForReview', { name: item.infinitive })}
                            aria-pressed={isMarked}
                            onClick={() => toggleReviewVerb(item.infinitive)}
                          >
                            {isMarked ? '★' : '☆'}
                          </button>
                          <span>{item.infinitive}</span>
                          <small>{item.present_3sg}</small>
                        </li>
                      );
                    })}
                  </ul>
                </section>}
                {savedProgress.reviewVerbs.length > 0 && (
                  <button type="button" className="continue-button review-round-button" onClick={startMarkedRound}>
                    {t('practiceMarked', { count: savedProgress.reviewVerbs.length })}
                  </button>
                )}
                {roundLength > 0
                  ? <button type="button" className="continue-button restart-button" onClick={restartRound}>{t('practiceAgain')} <span className="restart-icon" aria-hidden="true">↻</span></button>
                  : <button type="button" className="continue-button restart-button" onClick={restartCompletedLevel}>{t('restartCompletedSelection')} <span className="restart-icon" aria-hidden="true">↻</span></button>}
              </div>
            )}

          </section>

        </div>}

        {activePage === 'progress' && (
          <section className="dashboard-page aside-section" id="progress">
              <div className="aside-heading"><h2>{t('progressTitle')}</h2><span className="today-label">{t('saved')}</span></div>
              <div className="daily-progress"><div className="daily-progress-ring"><strong>{savedProgress.xp}</strong><span>XP</span></div><div><strong>{t('completedVerbs', { count: savedProgress.correctVerbs.length })}</strong><span>{t('progressSaved')}</span></div></div>
              <div className="daily-goal"><div><span>{t('learningGoal')}</span><strong>{Math.min(savedProgress.xp, 50)} <span>/ 50 XP</span></strong></div><div className="daily-track"><span style={{ width: `${Math.min(savedProgress.xp * 2, 100)}%` }} /></div></div>
          </section>
        )}

        {activePage === 'preferences' && (
          <section className="dashboard-page aside-section preferences-section" id="preferences">
              <div className="aside-heading"><h2>{t('preferences')}</h2></div>
              <label htmlFor="preferred-language">{t('languageSetting')}</label>
              <select
                id="preferred-language"
                value={preferences.language}
                onChange={(event) => updatePreference('language', event.target.value)}
              >
                {supportedLanguages.map(({ code, name }) => <option value={code} key={code}>{name}</option>)}
              </select>
              <div className="preference-label">{t('themeSetting')}</div>
              <div className="theme-options" role="group" aria-label={t('themeSetting')}>
                <button type="button" aria-pressed={preferences.theme === 'light'} onClick={() => updatePreference('theme', 'light')}>{t('lightTheme')}</button>
                <button type="button" aria-pressed={preferences.theme === 'dark'} onClick={() => updatePreference('theme', 'dark')}>{t('darkTheme')}</button>
              </div>
              <button type="button" className="setup-again-button" onClick={() => { setWizardStep(0); setShowSetupWizard(true); }}>{t('setupAgain')}</button>
          </section>
        )}

        {activePage === 'wordList' && (
          <section className="dashboard-page aside-section word-preview" id="word-list">
              <div className="aside-heading"><h2>{t('reviewList')}</h2><span className="word-count">{t('reviewCount', { count: savedProgress.reviewVerbs.length })}</span></div>
              {savedProgress.reviewVerbs.length > 0 ? (
                <>
                  <ul className="verb-list">
                    {savedProgress.reviewVerbs.map((name, index) => {
                      const item = verbs.find((candidate) => candidate.infinitive === name);
                      return (
                        <li key={name} className="verb-row review-verb-row">
                          <span className="verb-index">{String(index + 1).padStart(2, '0')}</span>
                          <span className="verb-name">{name}</span>
                          <span className="verb-meaning">{item?.present_3sg}</span>
                          <button
                            type="button"
                            className="review-star-button review-star-marked"
                            aria-label={t('removeFromReview', { name })}
                            aria-pressed="true"
                            onClick={() => toggleReviewVerb(name)}
                          >
                            ★
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <button type="button" className="review-list-action" onClick={() => { startMarkedRound(); navigateToPage('exercise'); }}>{t('practiceMarked', { count: savedProgress.reviewVerbs.length })}</button>
                  <button type="button" className="review-list-secondary" onClick={() => { startAllVerbsRound(); navigateToPage('exercise'); }}>{t('practiceFull')}</button>
                </>
              ) : <p className="aside-note">{t('emptyReview')}</p>}
          </section>
        )}
        </>
        </div>
      </main>
      {showSetupWizard && (
        <div className="setup-wizard-backdrop">
          <section className="setup-wizard" role="dialog" aria-modal="true" aria-labelledby="setup-wizard-title">
            <div className="eyebrow"><span className="eyebrow-dot" /> {t('wizardStep', { current: wizardStep + 1 })}</div>
            <h2 id="setup-wizard-title">{t(wizardStep === 0 ? 'wizardTitle' : wizardStep === 1 ? 'wizardThemeTitle' : 'wizardReadyTitle')}</h2>
            <p>{t(wizardStep === 0 ? 'wizardIntro' : wizardStep === 1 ? 'wizardThemeBody' : 'wizardReadyBody')}</p>
            {wizardStep === 0 && (
              <div className="wizard-language-options" role="group" aria-label={t('languageSetting')}>
                {supportedLanguages.map(({ code, name }) => (
                  <button
                    type="button"
                    key={code}
                    aria-pressed={preferences.language === code}
                    onClick={() => setPreferences((current) => ({ ...current, language: code }))}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            {wizardStep === 1 && (
              <div className="theme-options wizard-theme-options" role="group" aria-label={t('themeSetting')}>
                <button type="button" aria-pressed={preferences.theme === 'light'} onClick={() => setPreferences((current) => ({ ...current, theme: 'light' }))}>{t('lightTheme')}</button>
                <button type="button" aria-pressed={preferences.theme === 'dark'} onClick={() => setPreferences((current) => ({ ...current, theme: 'dark' }))}>{t('darkTheme')}</button>
              </div>
            )}
            {wizardStep === 2 && (
              <div className="wizard-summary">
                <span>{t('languageSetting')}</span><strong>{supportedLanguages.find(({ code }) => code === preferences.language)?.name}</strong>
                <span>{t('themeSetting')}</span><strong>{t(preferences.theme === 'dark' ? 'darkTheme' : 'lightTheme')}</strong>
              </div>
            )}
            <div className="wizard-actions">
              {wizardStep > 0 && <button type="button" className="wizard-back" onClick={() => setWizardStep((step) => step - 1)}>{t('back')}</button>}
              <button type="button" className="continue-button wizard-next" onClick={() => wizardStep < 2 ? setWizardStep((step) => step + 1) : finishSetupWizard()}>
                {t(wizardStep < 2 ? 'wizardNext' : 'startLearning')}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;

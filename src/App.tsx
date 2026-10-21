import { useEffect, useState } from 'react';
import { auth, api } from '@appdeploy/client';
import {
  ArrowUpRight,
  Terminal,
  ShieldCheck,
  Check,
  ChevronRight,
  Clock,
  BookOpen,
  RotateCcw,
  LogOut,
  Activity,
  Layers,
  Search,
  Lightbulb,
  Eye,
  X,
  ArrowLeft,
} from 'lucide-react';
import { exercises } from './exercises';
import InstallLab from './InstallLab';

type User = { userId: string; name?: string; email?: string };
type Progress = {
  id: string;
  revision: number;
  attempts: number;
  hints: number;
  revealed: boolean;
  passed: string[];
  history: { command: string; feedback: string; score: number }[];
  completed: boolean;
  score: number;
};
const blank = (id: string): Progress => ({
  id,
  revision: 0,
  attempts: 0,
  hints: 0,
  revealed: false,
  passed: [],
  history: [],
  completed: false,
  score: 0,
});
const topics = ['All exercises', ...new Set(exercises.map(e => e.topic))];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [progress, setProgress] = useState<Progress[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [topic, setTopic] = useState('All exercises');
  const [query, setQuery] = useState('');
  const [command, setCommand] = useState('');
  const [resetting, setResetting] = useState(false);
  const [view, setView] = useState('exercises');
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const load = async () => {
    const response = await api.get('/api/progress');
    setProgress(response.data.progress);
  };
  useEffect(() => {
    (async () => {
      try {
        const current = await auth.getUser();
        setUser(current);
        if (current) await load();
      } catch {
        setProblem(
          'Could not load your saved progress. Use Retry to reconnect.'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const signIn = async () => {
    setProblem('');
    try {
      const signed = await auth.signIn();
      setUser(signed.user);
      setLoading(true);
      await load();
    } catch (err) {
      const code = (err as { code?: string }).code;
      setProblem(
        code === 'popup_blocked'
          ? 'Allow popups for this site, then try sign-in again.'
          : code === 'popup_closed'
            ? 'Sign-in was cancelled. Select Sign in to try again.'
            : 'Sign-in or progress loading failed. Please retry.'
      );
    } finally {
      setLoading(false);
    }
  };
  const signOut = async () => {
    await auth.signOut();
    setUser(null);
    setProgress([]);
    setSelected(null);
    setCommand('');
    setProblem('');
  };
  const current = exercises.find(e => e.id === selected);
  const state = progress.find(p => p.id === selected) || blank(selected || '');
  const action = async (kind: string) => {
    if (!current || busy) return;
    if (kind === 'submit' && !command.trim()) {
      setProblem('Enter a command or script before submitting.');
      return;
    }
    setBusy(true);
    setProblem('');
    try {
      const response = await api.post('/api/progress/' + current.id, {
        action: kind,
        command,
        revision: state.revision,
        requestId: crypto.randomUUID(),
      });
      setProgress(prev => [
        ...prev.filter(p => p.id !== current.id),
        response.data,
      ]);
      if (kind === 'submit' || kind === 'reset') setCommand('');
      setResetting(false);
    } catch {
      setProblem(
        'Progress was not confirmed. Reload saved progress before submitting again.'
      );
    } finally {
      setBusy(false);
    }
  };
  const open = (id: string) => {
    setSelected(id);
    setCommand('');
    setProblem('');
    setResetting(false);
    window.scrollTo(0, 0);
  };
  const completed = progress.filter(p => p.completed).length;
  const attempts = progress.reduce((n, p) => n + p.attempts, 0);
  const hints = progress.reduce((n, p) => n + p.hints, 0);
  const activeTopics = topics.slice(1).map(t => {
    const entries = exercises.filter(e => e.topic === t);
    const practiced = entries.filter(e =>
      progress.some(p => p.id === e.id && p.attempts > 0)
    );
    const score = practiced.length
      ? Math.round(
          practiced.reduce(
            (n, e) => n + (progress.find(p => p.id === e.id)?.score || 0),
            0
          ) / practiced.length
        )
      : null;
    return {
      topic: t,
      count: entries.length,
      practiced: practiced.length,
      score,
    };
  });
  const filtered = exercises.filter(
    e =>
      (topic === 'All exercises' || topic === e.topic) &&
      (e.title + ' ' + e.signal + ' ' + e.topic)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!onlyIncomplete || !progress.find(p => p.id === e.id)?.completed)
  );
  const errorBox = problem && (
    <div role="alert" className="error">
      {problem}{' '}
      {user && (
        <button
          onClick={async () => {
            try {
              await load();
              setProblem('');
            } catch {
              setProblem('Connection failed. Please retry.');
            }
          }}
        >
          Retry loading saved progress
        </button>
      )}
    </div>
  );
  if (loading)
    return (
      <div className="loading">
        <Terminal size={36} />
        <p>Loading your workspace…</p>
      </div>
    );
  if (!user)
    return (
      <div className="login-page">
        <InstallLab />
        <div className="login-brand">
          <span className="logo">
            <Terminal size={22} />
          </span>{' '}
          PLATFORM / LAB
        </div>
        <main className="login-panel">
          <span className="eyebrow">YOUR NEXT ON-CALL STARTS HERE</span>
          <h1>
            Build confidence.
            <br />
            <span>One incident at a time.</span>
          </h1>
          <p>
            Ten realistic platform engineering challenges. Investigate the
            evidence, test your commands, and practise a safer recovery.
          </p>
          <div className="login-tags">
            <span>
              <ShieldCheck size={17} /> Private progress
            </span>
            <span>
              <Terminal size={17} /> Simulated commands
            </span>
            <span>
              <Layers size={17} /> 10 scenarios
            </span>
          </div>
          <button className="primary" onClick={signIn}>
            Sign in to your lab <ArrowUpRight size={18} />
          </button>
          {errorBox}
          <small>
            Commands never run against a real shell or cluster. All
            infrastructure is fictional.
          </small>
        </main>
        <div className="login-terminal">
          <div>
            <i />
            <i />
            <i />
            <span>copper-lab / incident-01</span>
          </div>
          <pre>
            {
              '$ oc get pods -n copper-lab\n\nNAME                READY   STATUS\nledger-api-7c9      0/1     CrashLoopBackOff\n\n$ Your investigation starts here_'
            }
          </pre>
          <p>
            <Activity size={16} /> A safe place to work through real problems.
          </p>
        </div>
      </div>
    );

  return (
    <div className="shell">
      <InstallLab />
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={e => {
            e.preventDefault();
            setSelected(null);
            setView('exercises');
          }}
        >
          <span className="logo">
            <Terminal size={22} />
          </span>
          <span>
            PLATFORM<span className="brand-sub">PRACTICE LAB</span>
          </span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <button
          className={view === 'exercises' ? 'nav active' : 'nav'}
          onClick={() => {
            setView('exercises');
            setSelected(null);
          }}
        >
          <Layers size={19} /> Exercise library <span>10</span>
        </button>
        <button
          className={view === 'progress' ? 'nav active' : 'nav'}
          onClick={() => {
            setView('progress');
            setSelected(null);
          }}
        >
          <Activity size={19} /> My progress
        </button>
        <div className="sidebar-note">
          <ShieldCheck size={21} />
          <strong>Safe by design</strong>
          <p>
            Fictional infrastructure.
            <br />
            Simulated responses.
            <br />
            Your progress stays private.
          </p>
        </div>
        <div className="account">
          <div className="avatar">
            {(user.name || user.email || 'E').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <strong>{user.name || 'Platform engineer'}</strong>
            <small>Personal workspace</small>
          </div>
          <button aria-label="Sign out" title="Sign out" onClick={signOut}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span>
            Workspace <ChevronRight size={14} />{' '}
            {current
              ? 'Exercise ' +
                String(exercises.indexOf(current) + 1).padStart(2, '0')
              : view === 'progress'
                ? 'My progress'
                : 'Exercise library'}
          </span>
          <span className="private">
            <span /> Private workspace
          </span>
        </header>
        {errorBox}
        {current ? (
          <>
            <button
              className="back"
              onClick={() => {
                setSelected(null);
                setResetting(false);
              }}
            >
              <ArrowLeft size={16} /> Back to exercises
            </button>
            <div className="detail-head">
              <div>
                <span className="eyebrow">
                  {current.topic} / {current.minutes} MIN
                </span>
                <h1>{current.title}</h1>
                <p>
                  {current.signal} <span className="dot">·</span>{' '}
                  {current.difficulty}
                </p>
              </div>
              <span className={state.completed ? 'pill done' : 'pill'}>
                {state.completed ? 'Completed' : 'In progress'}
              </span>
            </div>
            <div className="detail-grid">
              <div className="detail-main">
                <section className="panel">
                  <div className="section-label">01 / THE INCIDENT</div>
                  <h2>Read the situation</h2>
                  <p>{current.scenario}</p>
                  <ul className="symptoms">
                    {current.symptoms.map(s => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                  <div className="code-header">
                    <Terminal size={15} /> Evidence / fictional environment
                  </div>
                  <pre className="evidence">{current.evidence}</pre>
                </section>
                <section className="panel">
                  <div className="section-label">02 / YOUR RESPONSE</div>
                  <h2>Investigate. Repair. Verify.</h2>
                  <p>{current.challenge}</p>
                  <label className="input-label" htmlFor="commands">
                    Commands or script
                  </label>
                  <textarea
                    id="commands"
                    value={command}
                    maxLength={8000}
                    onChange={e => setCommand(e.target.value)}
                    placeholder="oc logs ledger-api-7c9 -n copper-lab --previous"
                    spellCheck={false}
                  />
                  <div className="submit-row">
                    <span>Text simulation only. No commands execute.</span>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => action('submit')}
                    >
                      {busy ? 'Saving…' : 'Submit commands'}
                      <ChevronRight size={17} />
                    </button>
                  </div>
                  {state.history.length > 0 && (
                    <div className="feedback" role="status">
                      <div className="section-label">
                        LATEST SIMULATED RESPONSE
                      </div>
                      <pre>
                        {state.history[state.history.length - 1].feedback}
                      </pre>
                    </div>
                  )}
                </section>
                {state.history.length > 0 && (
                  <section className="panel">
                    <h2>Attempt history</h2>
                    {state.history
                      .slice()
                      .reverse()
                      .map((h, i) => (
                        <details key={i}>
                          <summary>
                            Attempt {state.attempts - i} <span>{h.score}%</span>
                          </summary>
                          <pre>{h.command}</pre>
                          <pre>{h.feedback}</pre>
                        </details>
                      ))}
                  </section>
                )}
              </div>
              <aside className="detail-side">
                <section className="panel">
                  <div className="section-label">COMPLETION CHECK</div>
                  <div className="score">
                    {state.score}
                    <small>/100</small>
                  </div>
                  <p>
                    {state.completed
                      ? 'All objectives covered.'
                      : 'Complete each objective to finish.'}
                  </p>
                  <ul className="checks">
                    {current.checks.map(c => (
                      <li key={c.label}>
                        <span
                          className={
                            state.passed.includes(c.label)
                              ? 'check yes'
                              : 'check'
                          }
                        >
                          {state.passed.includes(c.label) && (
                            <Check size={13} />
                          )}
                        </span>
                        {c.label}
                      </li>
                    ))}
                  </ul>
                  <small>{current.completion}</small>
                  <div className="mini-stats">
                    <span>{state.attempts} attempts</span>
                    <span>{state.hints}/3 hints</span>
                  </div>
                  <p className="scoring">
                    Equal credit per objective. Each hint costs 5 points.
                    Viewing the solution caps your score at 40. Completion
                    tracks all objectives, including assisted work. Scores
                    reflect command patterns, not a live environment.
                  </p>
                </section>
                <section className="panel">
                  <h3>
                    <Lightbulb size={18} /> Need a direction?
                  </h3>
                  <p>Reveal one hint at a time.</p>
                  {current.hints.slice(0, state.hints).map((h, i) => (
                    <div className="hint" key={h}>
                      <b>Hint {i + 1}</b>
                      <p>{h}</p>
                    </div>
                  ))}
                  <button
                    className="secondary wide"
                    disabled={busy || state.hints === 3}
                    onClick={() => action('hint')}
                  >
                    {state.hints === 3
                      ? 'All hints revealed'
                      : 'Reveal hint ' + (state.hints + 1)}
                  </button>
                </section>
                <section className="panel">
                  <h3>
                    <BookOpen size={18} /> Explained solution
                  </h3>
                  {state.revealed ? (
                    <>
                      <p>{current.solution}</p>
                      <pre>{current.commands}</pre>
                    </>
                  ) : (
                    <>
                      <p>
                        Review the recovery steps and the reasoning behind them.
                      </p>
                      <button
                        className="secondary wide"
                        disabled={busy}
                        onClick={() => action('solution')}
                      >
                        <Eye size={16} /> Show solution
                      </button>
                    </>
                  )}
                </section>
                <button className="reset" onClick={() => setResetting(true)}>
                  <RotateCcw size={15} /> Reset this exercise
                </button>
              </aside>
            </div>
          </>
        ) : (
          <>
            <div className="page-heading">
              <div>
                <span className="eyebrow">PRACTISE WITH PURPOSE</span>
                <h1>
                  {view === 'progress'
                    ? 'Your progress, in focus.'
                    : 'Ready for the next incident?'}
                </h1>
                <p>
                  {view === 'progress'
                    ? 'See what you have covered and where to practise next.'
                    : 'Realistic failures. A safe environment. Better operational judgement.'}
                </p>
              </div>
              <div className="edition">
                <span className="status-dot" /> SRE PRACTICE TRACK{' '}
                <small>10 hands-on exercises</small>
              </div>
            </div>
            <div className="stats">
              <div>
                <span className="stat-label">
                  EXERCISES COMPLETED <Check size={17} />
                </span>
                <strong>
                  {String(completed).padStart(2, '0')}
                  <small>/ 10</small>
                </strong>
                <div className="progress-track">
                  <i style={{ width: completed * 10 + '%' }} />
                </div>
              </div>
              <div>
                <span className="stat-label">
                  COMMAND ATTEMPTS <Terminal size={17} />
                </span>
                <strong>{String(attempts).padStart(2, '0')}</strong>
                <small>Every attempt builds understanding</small>
              </div>
              <div>
                <span className="stat-label">
                  HINTS REVEALED <Lightbulb size={17} />
                </span>
                <strong>{String(hints).padStart(2, '0')}</strong>
                <small>Support when you need direction</small>
              </div>
            </div>
            {view === 'progress' ? (
              <>
                <section className="panel">
                  <div className="section-label">TOPIC BREAKDOWN</div>
                  <h2>Where to focus next</h2>
                  <p>
                    Weak topics have a practice score below 70. Unpractised
                    topics need a first attempt.
                  </p>
                  <div className="topic-progress">
                    {activeTopics.map(t => (
                      <button
                        key={t.topic}
                        onClick={() => {
                          setTopic(t.topic);
                          setView('exercises');
                        }}
                      >
                        <span>
                          <strong>{t.topic}</strong>
                          <small>
                            {t.practiced} of {t.count} exercises attempted
                          </small>
                        </span>
                        <span
                          className={
                            t.score !== null && t.score < 70
                              ? 'weak'
                              : 'topic-score'
                          }
                        >
                          {t.score === null
                            ? 'Not practised'
                            : t.score +
                              '% · ' +
                              (t.score < 70 ? 'Needs practice' : 'On track')}
                        </span>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                  </div>
                </section>
                <section className="panel">
                  <h2>Exercise results</h2>
                  {exercises.map(e => {
                    const p = progress.find(p => p.id === e.id);
                    return (
                      <button
                        className="result-row"
                        key={e.id}
                        onClick={() => {
                          setView('exercises');
                          open(e.id);
                        }}
                      >
                        <span>{e.title}</span>
                        <span>
                          {p?.completed
                            ? 'Completed'
                            : p?.attempts
                              ? 'In progress'
                              : 'Not started'}{' '}
                          · {p?.score || 0}%<ChevronRight size={15} />
                        </span>
                      </button>
                    );
                  })}
                </section>
              </>
            ) : (
              <>
                <section className="featured">
                  <div>
                    <span className="eyebrow">YOUR NEXT CHALLENGE</span>
                    <h2>
                      {exercises.find(
                        e => !progress.find(p => p.id === e.id)?.completed
                      )?.title || 'Make your recovery repeatable'}
                    </h2>
                    <p>
                      Follow the evidence from the first symptom to a verified
                      recovery.
                    </p>
                    <button
                      onClick={() =>
                        open(
                          exercises.find(
                            e => !progress.find(p => p.id === e.id)?.completed
                          )?.id || exercises[0].id
                        )
                      }
                    >
                      Start practising <ArrowUpRight size={18} />
                    </button>
                  </div>
                  <div className="featured-art" aria-hidden="true">
                    <div className="art-square">
                      <Terminal size={44} />
                    </div>
                    <span className="art-tag">
                      <span /> SIMULATION READY
                    </span>
                  </div>
                </section>
                <div className="library-heading">
                  <div>
                    <h2>
                      Exercise library <span>10</span>
                    </h2>
                    <p>Choose a failure. Work the problem.</p>
                  </div>
                  <label className="search">
                    <Search size={17} />
                    <input
                      aria-label="Search exercises"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Search exercises…"
                    />
                  </label>
                </div>
                <div className="filters">
                  {topics.map(t => (
                    <button
                      className={t === topic ? 'selected' : ''}
                      key={t}
                      onClick={() => setTopic(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <label className="incomplete">
                  <input
                    type="checkbox"
                    checked={onlyIncomplete}
                    onChange={e => setOnlyIncomplete(e.target.checked)}
                  />{' '}
                  Hide completed exercises
                </label>
                <div className="exercise-grid">
                  {filtered.map(e => {
                    const p = progress.find(p => p.id === e.id);
                    return (
                      <button
                        className="exercise-card"
                        key={e.id}
                        onClick={() => open(e.id)}
                      >
                        <div className="card-top">
                          <span className="exercise-number">
                            {String(exercises.indexOf(e) + 1).padStart(2, '0')}
                          </span>
                          <span
                            className={
                              p?.completed
                                ? 'card-state complete'
                                : p?.attempts
                                  ? 'card-state started'
                                  : 'card-state'
                            }
                          >
                            {p?.completed ? (
                              <>
                                <Check size={13} /> Completed
                              </>
                            ) : p?.attempts ? (
                              'In progress'
                            ) : (
                              'Not started'
                            )}
                          </span>
                        </div>
                        <span className="card-topic">{e.topic}</span>
                        <h3>{e.title}</h3>
                        <p>{e.signal}</p>
                        <div className="card-bottom">
                          <span>
                            {e.difficulty}
                            <span className="dot">·</span>
                            <Clock size={13} /> {e.minutes} min
                          </span>
                          <ArrowUpRight size={19} />
                        </div>
                      </button>
                    );
                  })}
                </div>
                {filtered.length === 0 && (
                  <div className="empty">
                    No matching exercises. Change your search or filters.
                  </div>
                )}
              </>
            )}
          </>
        )}
        <footer>
          <span>PLATFORM PRACTICE LAB</span>
          <span>Fictional systems. Practical experience.</span>
        </footer>
      </main>
      {resetting && (
        <div className="modal-shade">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <button
              className="close"
              aria-label="Close reset dialog"
              onClick={() => setResetting(false)}
            >
              <X size={19} />
            </button>
            <RotateCcw size={28} />
            <h2 id="reset-title">Reset this exercise?</h2>
            <p>
              This removes your attempts, hints, solution reveal, score, and
              completion for this exercise.
            </p>
            <div>
              <button className="secondary" onClick={() => setResetting(false)}>
                Keep progress
              </button>
              <button
                className="primary"
                disabled={busy}
                onClick={() => action('reset')}
              >
                Confirm reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { useApp, StudioTab } from '../context/AppContext';
import {
  ActiveDoc,
  Question,
  StudyPlan,
  ShortNotes,
  Attempt
} from '../types';
import {
  apiCreateMaterial,
  apiExplain,
  apiCreateQuiz,
  apiSubmitQuiz
} from '../services/api';
import {
  syncActiveStreak,
  recordAttempt,
  recordStudyMaterial
} from '../services/storage';

const SAMPLE_STUDY_MATERIAL = `Cellular respiration is a series of chemical reactions that break down glucose to produce ATP, the primary energy currency of cells.
The process consists of three main stages: glycolysis, the citric acid cycle (Krebs cycle), and oxidative phosphorylation.
Glycolysis takes place in the cytoplasm and breaks down one glucose molecule into two pyruvate molecules, generating a net gain of 2 ATP and 2 NADH.
The citric acid cycle occurs inside the mitochondrial matrix, processing acetyl-CoA to produce high-energy electron carriers (NADH and FADH2) along with carbon dioxide.
Oxidative phosphorylation takes place across the inner mitochondrial membrane, where the electron transport chain uses electrons from NADH and FADH2 to create a proton gradient that drives ATP synthesis.
Photosynthesis, on the other hand, converts light energy into chemical energy stored in glucose within chloroplasts.`;

const SW = new Set(
  'the and for that with this from are was were have has had not but you your can will they their them which what when where who how why does did its into than then also such been being more most other some any all one two use used using about over under between each per del las los una uno con por para que como mas pero sus este esta estos les des une est sont pour dans qui par pas plus aux sur cette ces का की के है हैं में से और को पर यह वह एक नहीं'.split(' ')
);

function tok(s: string) {
  return (s.toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) || []).filter(
    (w) => w.length > 3 && !SW.has(w) && !/^\d+$/.test(w)
  );
}

function sents(t: string) {
  return (t.replace(/\s+/g, ' ').match(/[^.!?।]+[.!?।]*\s*/g) || []).map((x) => x.trim()).filter(Boolean);
}

function chunkText(t: string) {
  const o: Array<{ n: number; text: string }> = [];
  let c = '';
  let n = 1;
  sents(t).forEach((s) => {
    c += (c ? ' ' : '') + s;
    if (c.length > 1000) {
      o.push({ n: n++, text: c });
      c = '';
    }
  });
  if (c) o.push({ n, text: c });
  return o;
}

function analyse(pages: Array<{ n: number; text: string }>): ActiveDoc {
  const S: Array<{ t: string; p: number | string; w: string[]; set: Set<string>; topic?: string }> = [];
  const df: Record<string, number> = {};
  const tf: Record<string, number> = {};

  pages.forEach((p) => {
    sents(p.text).forEach((t) => {
      if (t.length > 25) {
        const w = tok(t);
        const st = new Set(w);
        S.push({ t, p: p.n, w, set: st });
        st.forEach((x) => {
          df[x] = (df[x] || 0) + 1;
        });
        w.forEach((x) => {
          tf[x] = (tf[x] || 0) + 1;
        });
      }
    });
  });

  const N = S.length;
  const idf = (x: string) => Math.log(1 + N / (df[x] || 1));
  const kw = Object.keys(tf)
    .filter((x) => tf[x] >= 2 && df[x] < N * 0.8)
    .sort((a, b) => (tf[b] || 0) * idf(b) - (tf[a] || 0) * idf(a));

  const topics = kw.slice(0, 6);
  S.forEach((s) => {
    s.topic = topics.filter((t) => s.set.has(t))[0];
  });

  return {
    S,
    N,
    idf,
    topics,
    kw: kw.slice(0, 14),
    used: new Set(),
    unit: 'Passage',
    title: 'Study Material',
    textSample: pages.map((p) => p.text).join('\n').slice(0, 500)
  };
}

function shuf<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const LearnView: React.FC = () => {
  const {
    studioTab,
    setStudioTab,
    go,
    t,
    lang,
    user,
    refreshProgress,
    activeDoc,
    setActiveDoc,
    backendMaterialId,
    setBackendMaterialId,
    studyPlan,
    setStudyPlan,
    shortNotes,
    setShortNotes
  } = useApp();

  const [pastedText, setPastedText] = useState('');
  const [materialStatus, setMaterialStatus] = useState<string | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Q&A state
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [explanation, setExplanation] = useState<{
    answer: string;
    sources: string[];
    originalPassages?: string[];
    notFound?: boolean;
  } | null>(null);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number | string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizGrading, setQuizGrading] = useState<any[] | null>(null);
  const [quizScore, setQuizScore] = useState<{ score: number; total: number; weak: string[] } | null>(null);
  const [backendQuizId, setBackendQuizId] = useState<string | null>(null);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  // Material processing
  const processMaterial = async (
    rawText: string,
    file: File | null = null,
    title = 'Study Material'
  ) => {
    setIsAnalysing(true);
    setMaterialStatus(t('Analysing your material…'));

    const pages = chunkText(rawText);
    const doc = analyse(pages);
    doc.title = title;
    doc.unit = file ? t('Page') : t('Passage');

    if (doc.N < 4 || doc.topics.length < 2) {
      setIsAnalysing(false);
      setMaterialStatus(t('Add more material: at least a few full sentences are needed.'));
      return;
    }

    setActiveDoc(doc);
    recordStudyMaterial(doc, user);
    syncActiveStreak(user).then(refreshProgress);

    // Sync to backend API if possible
    try {
      const payload = file || rawText;
      const res = await apiCreateMaterial(payload, title);
      if (res && res.id) {
        setBackendMaterialId(res.id);
        if (res.study_plan) setStudyPlan(res.study_plan);
        if (res.short_notes) setShortNotes(res.short_notes);
        if (res.topics && res.topics.length) {
          doc.topics = res.topics;
        }
      }
    } catch (err) {
      console.warn('Backend material sync notice (using local):', err);
    } finally {
      setIsAnalysing(false);
      setMaterialStatus(
        `${t('Material loaded.')} ${doc.N} ${t('sentences')} · ${doc.topics.length} ${t('key topics')}`
      );
    }
  };

  const handleLoadSample = () => {
    setPastedText(SAMPLE_STUDY_MATERIAL);
    processMaterial(SAMPLE_STUDY_MATERIAL, null, 'Cellular Respiration & Energy');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMaterialStatus(t('Reading your PDF…'));
    setIsAnalysing(true);

    try {
      // 1. Try backend extraction directly via FormData
      const res = await apiCreateMaterial(file, file.name.replace(/\.[^/.]+$/, ''));
      if (res && res.id) {
        setBackendMaterialId(res.id);
        if (res.study_plan) setStudyPlan(res.study_plan);
        if (res.short_notes) setShortNotes(res.short_notes);

        const syntheticDoc: ActiveDoc = {
          S: (res.sources || []).map((s: string, idx: number) => ({
            t: s,
            p: idx + 1,
            w: tok(s),
            set: new Set(tok(s)),
            topic: res.topics?.[idx % (res.topics?.length || 1)]
          })),
          N: res.section_count || 10,
          idf: () => 1,
          topics: res.topics || [],
          kw: res.topics || [],
          used: new Set(),
          unit: t('Page'),
          title: res.title || file.name,
          textSample: file.name
        };
        setActiveDoc(syntheticDoc);
        setIsAnalysing(false);
        setMaterialStatus(
          `${t('Material loaded.')} ${res.section_count || 10} ${t('sentences')} · ${
            res.topics?.length || 0
          } ${t('key topics')}`
        );
        return;
      }
    } catch (err: any) {
      console.warn('Backend PDF upload error, attempting client fallback:', err);
    }

    setIsAnalysing(false);
    setMaterialStatus(
      t(
        'Couldn’t read text from this PDF. If it is a scanned image, paste the text instead.'
      )
    );
  };

  // Q&A logic
  const handleAsk = async () => {
    const q = question.trim();
    if (!q) {
      setExplanation({
        answer: t('Please type your question or doubt above first!'),
        sources: [],
        notFound: true
      });
      return;
    }

    if (!activeDoc) {
      setExplanation({
        answer: t('Add your material first.'),
        sources: [],
        notFound: true
      });
      return;
    }

    setIsAsking(true);
    setExplanation(null);

    // 1. Try backend API grounded explanation
    if (backendMaterialId) {
      try {
        const res = await apiExplain(backendMaterialId, q, lang);
        if (res.available_in_material && res.answer) {
          setIsAsking(false);
          setExplanation({
            answer: res.answer,
            sources: res.sources || []
          });
          syncActiveStreak(user).then(refreshProgress);
          return;
        }
      } catch (e) {
        console.warn('Backend explain failed, falling back to local:', e);
      }
    }

    // 2. Local TF-IDF search
    const qt = tok(q);
    const need = Math.max(1, Math.ceil(qt.length / 2));
    const sc = activeDoc.S.map((s) => {
      let m = 0;
      let v = 0;
      qt.forEach((x) => {
        const hit =
          s.set.has(x) ||
          (x.length > 4 && s.w.some((y) => y.length > 4 && y.indexOf(x.slice(0, 5)) === 0));
        if (hit) {
          m++;
          v += activeDoc.idf(x);
        }
      });
      return { s, m, v };
    })
      .filter((r) => r.m)
      .sort((a, b) => b.v - a.v);

    setIsAsking(false);

    if (!qt.length || !sc.length || sc[0].m < need) {
      setExplanation({
        answer: t(
          'Not in your material. This question can’t be answered from what you uploaded, so I won’t guess. Try different words or add the relevant pages.'
        ),
        sources: [],
        notFound: true
      });
      return;
    }

    const top = sc.filter((r) => r.m >= need && r.v >= sc[0].v * 0.45).slice(0, 3);
    const fullText = top.map((r) => r.s.t).join(' ');
    const sources = top.map((r) => `${activeDoc.unit} ${r.s.p}`);

    setExplanation({
      answer: fullText,
      sources,
      originalPassages: top.map((r) => r.s.t)
    });
    syncActiveStreak(user).then(refreshProgress);
  };

  // Quiz logic
  const handleStartQuiz = async (kind = 'diagnostic', targetTopics?: string[]) => {
    if (!activeDoc) {
      setQuizError(t('Add your material first.'));
      return;
    }

    setQuizError(null);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizGrading(null);
    setQuizScore(null);
    setIsGeneratingQuiz(true);

    // 1. Try Backend API Quiz Generation
    if (backendMaterialId) {
      try {
        const res = await apiCreateQuiz(
          backendMaterialId,
          kind,
          5,
          targetTopics || []
        );
        if (res.questions && res.questions.length >= 2) {
          setBackendQuizId(res.quiz_id);
          setQuizQuestions(res.questions);
          setIsGeneratingQuiz(false);
          return;
        }
      } catch (e) {
        console.warn('Backend quiz creation failed, falling back to local:', e);
      }
    }

    // 2. Local Fallback Generator
    const byTopic: Record<string, typeof activeDoc.S> = {};
    activeDoc.S.forEach((s) => {
      if (s.topic && s.t.length >= 35 && s.t.length <= 260) {
        (byTopic[s.topic] = byTopic[s.topic] || []).push(s);
      }
    });

    const topics = shuf(Object.keys(byTopic));
    const generated: Question[] = [];

    for (const top of topics) {
      if (generated.length >= 5) break;
      const s = byTopic[top]?.pop();
      if (!s) continue;

      const reg = new RegExp(`(^|[^\\p{L}\\p{N}])(${top})(?![\\p{L}\\p{N}])`, 'iu');
      if (!reg.test(s.t)) continue;

      const distractors = shuf(activeDoc.kw.filter((k) => k !== top && !s.set.has(k))).slice(0, 3);
      if (distractors.length < 3) continue;

      const options = shuf([...distractors, top]);
      generated.push({
        id: 'q_' + generated.length,
        question: s.t.replace(reg, '$1_____'),
        options,
        ans: top,
        correct_index: options.indexOf(top),
        topic: top,
        p: s.p
      });
    }

    setIsGeneratingQuiz(false);

    if (generated.length < 2) {
      setQuizError(t('Add more material: at least a few full sentences are needed.'));
      return;
    }

    setQuizQuestions(generated);
  };

  const handleSubmitQuiz = async () => {
    if (!quizQuestions.length) return;

    // Validate that every question has an answer
    const unanswered = quizQuestions.some((_, idx) => quizAnswers[idx] === undefined);
    if (unanswered) {
      setQuizError(t('Answer every question before submitting.'));
      return;
    }

    setQuizError(null);

    // 1. Submit to Backend API if backend quiz ID exists
    if (backendQuizId) {
      try {
        const answersPayload: Record<string, number> = {};
        quizQuestions.forEach((q, idx) => {
          if (q.id) {
            answersPayload[q.id] = Number(quizAnswers[idx]);
          }
        });

        const res = await apiSubmitQuiz(backendQuizId, answersPayload, 4);

        const grading = quizQuestions.map((q) => {
          const rev = res.review?.find((r) => r.question_id === q.id);
          return {
            isCorrect: rev ? rev.is_correct : false,
            correctOption: rev ? rev.correct_option : '',
            sources: rev?.sources || []
          };
        });

        setQuizGrading(grading);
        setQuizSubmitted(true);
        setQuizScore({
          score: res.score,
          total: res.total,
          weak: res.weak_areas || []
        });

        const tpMap: Record<string, [number, number]> = {};
        res.review?.forEach((r) => {
          const entry = (tpMap[r.topic] = tpMap[r.topic] || [0, 0]);
          entry[1]++;
          if (r.is_correct) entry[0]++;
        });

        const attempt: Attempt = {
          d: Date.now(),
          k: 'diagnostic',
          s: res.score,
          t: res.total,
          tp: tpMap
        };

        await recordAttempt(attempt, user);
        await syncActiveStreak(user);
        await refreshProgress();
        return;
      } catch (e) {
        console.warn('Backend quiz submit error:', e);
      }
    }

    // 2. Local Grading Fallback
    let correctCount = 0;
    const tpMap: Record<string, [number, number]> = {};

    const grading = quizQuestions.map((q, idx) => {
      const selected = quizAnswers[idx];
      const isCorrect = selected === q.correct_index || selected === q.ans;
      const topicName = q.topic || 'General';

      const entry = (tpMap[topicName] = tpMap[topicName] || [0, 0]);
      entry[1]++;
      if (isCorrect) {
        correctCount++;
        entry[0]++;
      }

      return {
        isCorrect,
        correctOption: q.ans || q.options?.[q.correct_index || 0] || '',
        sources: q.p ? [`${activeDoc?.unit || 'Passage'} ${q.p}`] : []
      };
    });

    const weak = Object.keys(tpMap).filter((k) => tpMap[k][0] / tpMap[k][1] < 0.7);

    setQuizGrading(grading);
    setQuizSubmitted(true);
    setQuizScore({
      score: correctCount,
      total: quizQuestions.length,
      weak
    });

    const attempt: Attempt = {
      d: Date.now(),
      k: 'diagnostic',
      s: correctCount,
      t: quizQuestions.length,
      tp: tpMap
    };

    await recordAttempt(attempt, user);
    await syncActiveStreak(user);
    await refreshProgress();
  };

  return (
    <div className="view" data-view="learn">
      <section className="studio container" id="studio">
        <div className="head">
          <span className="eyebrow">{t('YOUR STUDY STUDIO')}</span>
          <h2>{t('Learn from your own material.')}</h2>
          <p>
            {t(
              'Upload a PDF or paste your notes. Every answer comes only from what you provide.'
            )}
          </p>
        </div>

        <div className="stu">
          <div className="tabs" role="group">
            <button
              className={studioTab === 'material' ? 'on' : ''}
              onClick={() => setStudioTab('material')}
            >
              {t('Material')}
            </button>
            <button
              className={studioTab === 'ask' ? 'on' : ''}
              onClick={() => setStudioTab('ask')}
            >
              {t('Ask')}
            </button>
            <button
              className={studioTab === 'quiz' ? 'on' : ''}
              onClick={() => {
                setStudioTab('quiz');
                if (!quizQuestions.length && activeDoc) {
                  handleStartQuiz();
                }
              }}
            >
              {t('Quiz')}
            </button>
            <button
              className={studioTab === 'plan' ? 'on' : ''}
              onClick={() => setStudioTab('plan')}
            >
              {t('Plan')}
            </button>
            <button
              className={studioTab === 'progress' ? 'on' : ''}
              onClick={() => setStudioTab('progress')}
            >
              {t('Progress')}
            </button>
          </div>

          {/* Tab 1: Material */}
          {studioTab === 'material' && (
            <div className="pn on" id="p-material">
              <div className="row" style={{ marginTop: 0, marginBottom: '12px', gap: '10px' }}>
                <label className="b2 ghost" htmlFor="pdf-input" style={{ cursor: 'pointer' }}>
                  {t('Choose a PDF')}
                </label>
                <input
                  ref={fileInputRef}
                  className="vh"
                  type="file"
                  id="pdf-input"
                  accept=".pdf,application/pdf"
                  onChange={handleFileUpload}
                />
                <button
                  className="b2 ghost"
                  type="button"
                  onClick={handleLoadSample}
                  disabled={isAnalysing}
                >
                  {t('✦ Load Sample Notes')}
                </button>
              </div>

              <p className="note">
                <span>{t('or paste study material')}</span>
              </p>

              <textarea
                className="in"
                id="paste"
                placeholder={t('Paste your notes or textbook text here…')}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
              />

              <div className="row">
                <button
                  className="b2"
                  onClick={() => processMaterial(pastedText, null, 'Pasted Notes')}
                  disabled={isAnalysing || !pastedText.trim()}
                >
                  {t('Use this material')}
                </button>
              </div>

              {materialStatus && (
                <div className="note" id="mstat" role="status">
                  <p>{materialStatus}</p>
                </div>
              )}

              {activeDoc && (
                <div style={{ marginTop: '14px' }}>
                  <div style={{ marginBottom: '8px', fontSize: '12px', color: 'var(--gold)' }}>
                    ✦ {activeDoc.topics.length} {t('key topics')}:
                  </div>
                  <div>
                    {activeDoc.topics.map((top, idx) => (
                      <span key={idx} className="chip dyn">
                        {top.charAt(0).toUpperCase() + top.slice(1)}
                      </span>
                    ))}
                  </div>

                  {shortNotes?.visual?.svg && (
                    <div
                      className="concept-map-wrap"
                      style={{
                        marginTop: '14px',
                        borderRadius: '14px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: '#0d1127'
                      }}
                      dangerouslySetInnerHTML={{ __html: shortNotes.visual.svg }}
                    />
                  )}

                  {shortNotes?.key_points && shortNotes.key_points.length > 0 && (
                    <div
                      className="keypoints-wrap"
                      style={{
                        marginTop: '12px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '12px',
                        padding: '12px 16px'
                      }}
                    >
                      <b style={{ color: 'var(--gold)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        ✦ {t('Core Principles')}
                      </b>
                      <ul style={{ margin: '8px 0 0 18px', fontSize: '12px', lineHeight: 1.6, color: 'var(--muted)' }}>
                        {shortNotes.key_points.slice(0, 5).map((kp, idx) => (
                          <li key={idx}>
                            {kp.text}{' '}
                            <i style={{ color: 'var(--gold)', fontSize: '10px' }}>
                              ({kp.citations.join(', ')})
                            </i>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Ask */}
          {studioTab === 'ask' && (
            <div className="pn on" id="p-ask">
              <div className="row" style={{ marginTop: 0 }}>
                <input
                  className="in"
                  style={{ flex: 1, minWidth: '200px' }}
                  placeholder={t('Ask something about your material…')}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAsk();
                    }
                  }}
                />
                <button className="b2" onClick={handleAsk} disabled={isAsking}>
                  {isAsking ? 'Thinking…' : t('Explain')}
                </button>
              </div>

              {!activeDoc && (
                <div className="ans no" style={{ marginTop: '16px' }}>
                  <span>{t('Add your material first.')}</span>
                  <div style={{ marginTop: '8px' }}>
                    <button className="b2 ghost" onClick={handleLoadSample}>
                      ✦ {t('✦ Load Sample Notes')}
                    </button>
                  </div>
                </div>
              )}

              {explanation && (
                <div className={`ans ${explanation.notFound ? 'no' : ''}`} style={{ marginTop: '16px' }}>
                  <b>{t('In simple words')}</b>
                  <ul>
                    <li>
                      <span className="dyn">{explanation.answer}</span>
                      {explanation.sources.length > 0 && (
                        <span className="ref">
                          <i>Source</i> {explanation.sources.join(', ')}
                        </span>
                      )}
                    </li>
                  </ul>
                  {explanation.originalPassages && (
                    <details style={{ marginTop: '10px' }}>
                      <summary>{t('Original passage')}</summary>
                      {explanation.originalPassages.map((p, i) => (
                        <p key={i} style={{ marginTop: '4px' }}>
                          {p}
                        </p>
                      ))}
                    </details>
                  )}
                  <div className="row" style={{ marginTop: '12px' }}>
                    <button
                      className="b2 ghost"
                      onClick={() => {
                        setStudioTab('quiz');
                        handleStartQuiz();
                      }}
                    >
                      {t('Start diagnostic quiz')} →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Quiz */}
          {studioTab === 'quiz' && (
            <div className="pn on" id="p-quiz">
              {!activeDoc && (
                <div className="ans no" style={{ marginTop: 0 }}>
                  <span>{t('Add your material first.')}</span>
                  <div className="row">
                    <button className="b2 ghost" onClick={() => setStudioTab('material')}>
                      {t('Choose a PDF')} / {t('Use this material')} →
                    </button>
                  </div>
                </div>
              )}

              {activeDoc && !quizQuestions.length && !isGeneratingQuiz && (
                <div className="row" style={{ marginTop: 0 }}>
                  <button className="b2" onClick={() => handleStartQuiz('diagnostic')}>
                    {t('Start diagnostic quiz')}
                  </button>
                </div>
              )}

              {isGeneratingQuiz && (
                <div className="note" style={{ padding: '16px 0' }}>
                  ✦ Generating quiz questions from your material…
                </div>
              )}

              {quizError && (
                <div className="ans no" style={{ marginTop: '12px' }}>
                  {quizError}
                </div>
              )}

              {quizQuestions.length > 0 && (
                <div>
                  <p className="note" style={{ marginBottom: '12px' }}>
                    <span>{t('Choose the best option for each question based on your material.')}</span>
                  </p>

                  {quizQuestions.map((q, idx) => {
                    const grade = quizGrading?.[idx];
                    let qClass = 'qq';
                    if (quizSubmitted && grade) {
                      qClass += grade.isCorrect ? ' ok' : ' bad';
                    }

                    return (
                      <div key={idx} className={qClass} id={`qq${idx}`}>
                        <div>
                          <b>{idx + 1}.</b>{' '}
                          <span className="dyn">{q.question || q.text}</span>{' '}
                          {q.topic && (
                            <span className="chip dyn" style={{ fontSize: '10px', marginLeft: '6px' }}>
                              {q.topic}
                            </span>
                          )}
                        </div>

                        {(q.options || q.o || []).map((opt, optIdx) => {
                          const isChecked = quizAnswers[idx] === optIdx || quizAnswers[idx] === opt;
                          return (
                            <label key={optIdx}>
                              <input
                                type="radio"
                                name={`q_${idx}`}
                                disabled={quizSubmitted}
                                checked={isChecked}
                                onChange={() => {
                                  if (!quizSubmitted) {
                                    setQuizAnswers((prev) => ({
                                      ...prev,
                                      [idx]: q.options ? optIdx : opt
                                    }));
                                  }
                                }}
                              />{' '}
                              <span className="dyn">{opt}</span>
                            </label>
                          );
                        })}

                        {quizSubmitted && grade && !grade.isCorrect && (
                          <div className="note" style={{ marginTop: '8px', color: '#a9e8c0' }}>
                            <b>{t('Correct answer')}</b>: <span className="dyn">{grade.correctOption}</span>
                            {grade.sources && grade.sources.length > 0 && (
                              <span className="ref" style={{ marginLeft: '6px' }}>
                                <i>Source</i> {grade.sources.join(', ')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {!quizSubmitted && (
                    <div className="row" style={{ marginTop: '16px' }}>
                      <button className="b2" onClick={handleSubmitQuiz}>
                        {t('Submit answers')}
                      </button>
                    </div>
                  )}

                  {quizSubmitted && quizScore && (
                    <div className="ans" style={{ marginTop: '16px' }}>
                      <b>{t('Score')}</b>:{' '}
                      <span className="dyn">
                        {quizScore.score} / {quizScore.total} (
                        {quizScore.total ? Math.round((quizScore.score / quizScore.total) * 100) : 0}%)
                      </span>
                      <br />
                      <b>{t('Weak topics')}</b>:{' '}
                      {quizScore.weak.length ? (
                        quizScore.weak.map((wt, i) => (
                          <i key={i} className="chip dyn">
                            {wt.charAt(0).toUpperCase() + wt.slice(1)}
                          </i>
                        ))
                      ) : (
                        <span>{t('No weak topics. Great work!')}</span>
                      )}
                      <div className="row" style={{ marginTop: '12px' }}>
                        <button className="b2" onClick={() => setStudioTab('plan')}>
                          {t('See revision plan')} →
                        </button>
                        {quizScore.weak.length > 0 ? (
                          <button
                            className="b2 ghost"
                            onClick={() => handleStartQuiz('weak-topic', quizScore.weak)}
                          >
                            {t('Practise weak topics')}
                          </button>
                        ) : (
                          <button className="b2 ghost" onClick={() => handleStartQuiz('diagnostic')}>
                            {t('Retake the quiz')}
                          </button>
                        )}
                        <button className="b2 ghost" onClick={() => go('progress')}>
                          {t('View progress analysis')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Plan */}
          {studioTab === 'plan' && (
            <div className="pn on" id="p-plan">
              {!activeDoc && (
                <div className="ans no">
                  <span>{t('Add your material first.')}</span>
                  <div className="row">
                    <button className="b2 ghost" onClick={() => setStudioTab('material')}>
                      {t('Choose a PDF')} / {t('Use this material')} →
                    </button>
                  </div>
                </div>
              )}

              {activeDoc && studyPlan && studyPlan.schedule && (
                <div>
                  <h3>
                    {t('Your revision plan')} — {studyPlan.title || activeDoc.title}
                  </h3>
                  <p className="note" style={{ marginBottom: '14px' }}>
                    {studyPlan.study_method || 'Follow this structured schedule to master your topics.'}
                  </p>

                  {studyPlan.schedule.map((day, idx) => (
                    <div key={idx} className="stp">
                      <b className="dyn">
                        Day {day.day}: {day.theme || day.topic || 'Revision'}
                      </b>
                      <div style={{ margin: '4px 0' }}>
                        <b>{t('Topics')}:</b>{' '}
                        {(day.topics || [day.topic || 'General']).map((tp, ti) => (
                          <i key={ti} className="chip dyn">
                            {tp}
                          </i>
                        ))}
                      </div>
                      {day.steps && (
                        <ul style={{ margin: '6px 0 0 16px', fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
                          {day.steps.map((st, si) => (
                            <li key={si}>{st}</li>
                          ))}
                        </ul>
                      )}
                      {day.sources && day.sources.length > 0 && (
                        <div style={{ marginTop: '4px' }}>
                          <span className="ref">
                            <i>Source</i> {day.sources.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="row" style={{ marginTop: '16px' }}>
                    <button
                      className="b2"
                      onClick={() => {
                        setStudioTab('quiz');
                        handleStartQuiz('diagnostic');
                      }}
                    >
                      {t('Start diagnostic quiz')} →
                    </button>
                    <button className="b2 ghost" onClick={() => setStudioTab('ask')}>
                      {t('Ask a doubt')}
                    </button>
                  </div>
                </div>
              )}

              {activeDoc && (!studyPlan || !studyPlan.schedule) && (
                <div>
                  <h3>{t('Your revision plan')}</h3>
                  <p className="note">
                    {t('Take the diagnostic quiz first. Your plan is built from your weak topics.')}
                  </p>
                  <div className="row" style={{ marginTop: '12px' }}>
                    <button
                      className="b2"
                      onClick={() => {
                        setStudioTab('quiz');
                        handleStartQuiz('diagnostic');
                      }}
                    >
                      {t('Start diagnostic quiz')} →
                    </button>
                    <button className="b2 ghost" onClick={() => setStudioTab('ask')}>
                      {t('Ask a question')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Progress */}
          {studioTab === 'progress' && (
            <div className="pn on" id="p-progress">
              <div style={{ padding: '8px 0' }}>
                <h3>{t('Study Material Mastery')}</h3>
                <p className="note">
                  {activeDoc
                    ? `${activeDoc.title} · ${activeDoc.topics.length} key topics analyzed.`
                    : t('No material loaded yet.')}
                </p>

                {activeDoc && (
                  <div style={{ marginTop: '16px' }}>
                    {activeDoc.topics.map((tp, idx) => (
                      <div key={idx} className="tb">
                        <span>{tp.charAt(0).toUpperCase() + tp.slice(1)}</span>
                        <i>
                          <b style={{ width: '85%', background: 'linear-gradient(90deg, #a48bff, #f5cd78)' }} />
                        </i>
                        <span>85%</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="row" style={{ marginTop: '18px' }}>
                  <button className="b2" onClick={() => go('progress')}>
                    {t('View overall progress analysis')} →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Feature cards */}
      <section className="features container" id="features">
        <div className="head">
          <span className="eyebrow">{t('YOUR PERSONAL TOOLKIT')}</span>
          <h2>
            {t('Everything you need to')} <span className="grad">{t('level up.')}</span>
          </h2>
          <p>{t('Less overwhelm. More clarity. A study experience that works for you.')}</p>
        </div>
        <div className="grid">
          <article
            className="fc"
            id="f-learn"
            onClick={() => setStudioTab('ask')}
            style={{ cursor: 'pointer' }}
          >
            <div className="fi2 c-v">✧</div>
            <span className="num">01 / LEARN</span>
            <h3>{t('AI Study Companion')}</h3>
            <p>
              {t(
                'Break down difficult concepts into simple explanations and learn with greater confidence.'
              )}
            </p>
            <span className="fl">
              {t('Explore learning')} <span>↗</span>
            </span>
          </article>

          <article
            className="fc"
            id="f-grow"
            onClick={() => go('progress')}
            style={{ cursor: 'pointer' }}
          >
            <div className="fi2 c-b">✦</div>
            <span className="num">02 / GROW</span>
            <h3>{t('Progress Tracker')}</h3>
            <p>
              {t('See your progress, celebrate small wins, and build study habits that last.')}
            </p>
            <span className="fl">
              {t('Track your growth')} <span>↗</span>
            </span>
          </article>
        </div>
      </section>
    </div>
  );
};

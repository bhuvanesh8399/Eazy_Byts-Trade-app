// src/pages/Home.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

const funLines = [
  'Buy low. Sell high. Drink water.',
  'Lagging? Or just “carefully backtesting” in real‑time. 😅',
  'Keyboard shortcut: CTRL+Z for bad trades (if only).',
  'HODL? Only if your coffee is strong enough.',
];

export default function Home() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [line, setLine] = useState(funLines[0]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLine(funLines[Math.floor(Math.random()*funLines.length)]);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const key = import.meta.env.VITE_NEWSAPI_KEY;
        if (key) {
          const r = await fetch(`https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=6&apiKey=${key}`);
          const j = await r.json();
          if (j?.articles?.length) {
            setNews(j.articles.map(a => ({ t: a.title, s: a.source?.name || 'News', u: a.url })));
            setLoading(false);
            return;
          }
        }
        setNews([
          { t: 'Markets steady as earnings season kicks off', s: 'MockWire', u: '#' },
          { t: 'Tech mega‑caps eye new highs', s: 'StreetMock', u: '#' },
          { t: 'Value rotation persists across global indices', s: 'FinanceMock', u: '#' },
        ]);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const quiz = [
    {
      q: 'What does PnL stand for?',
      a: ['Price & Liquidity','Profit and Loss','Position and Leverage','Premium & Limit'],
      c: 1,
    },
    {
      q: 'A market order…',
      a: ['Executes immediately at best price','Executes at your chosen price','Never executes','Is only for crypto'],
      c: 0,
    },
    {
      q: 'Diversification helps primarily with…',
      a: ['Maximizing single-stock gains','Reducing unsystematic risk','Timing the market','Improving caffeine absorption'],
      c: 1,
    },
  ];
  const [answers, setAnswers] = useState({});
  const score = useMemo(() => quiz.filter((q,i) => answers[i] === q.c).length, [answers]);

  return (
    <div className="home-root">
      <style>{homeCss}</style>
      <section className="hero">
        <div className="hero-inner">
          <div className="title">Welcome{user?.username ? `, ${user.username}` : ''}</div>
          <div className="tag">EAZY_BYTZ Trade App</div>
          <p className="lead">Paper‑trade like a pro. Realistic orders, portfolio insights, and live‑style dashboards — all in a friendly UX.</p>
          <div className="cta-row">
            <button className="cta primary" onClick={()=>nav('/dashboard')}>Open Dashboard</button>
            <button className="cta" onClick={()=>nav('/portfolio')}>View Portfolio</button>
            <button className="cta" onClick={()=>nav('/orders')}>Orders</button>
          </div>
          <div className="fun">{line}</div>
        </div>
      </section>

      <section className="grid2 container">
        <div className="card">
          <div className="card-h">What’s New</div>
          <ul className="bullets">
            <li>Sticky top bar with reveal‑on‑hover</li>
            <li>Position Calculator on Dashboard with live price pickup</li>
            <li>Orders auto‑refresh; Portfolio stats and holdings synced</li>
            <li>WS handshake and query‑token support for future live quotes</li>
          </ul>
        </div>
        <div className="card">
          <div className="card-h">Live News</div>
          {loading && <div className="muted">loading…</div>}
          <div className="news">
            {news.map((n,i)=> (
              <a key={i} href={n.u} target="_blank" rel="noreferrer" className="news-item">
                <div className="news-title">{n.t}</div>
                <div className="muted small">{n.s}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="grid2 container">
        <div className="card">
          <div className="card-h">About This Project</div>
          <p className="muted">A modern stock trading simulator with JWT auth, a Spring Boot backend, and a React + Vite frontend. It focuses on realistic order flow, a clean UI, and learning outcomes.</p>
          <ul className="bullets">
            <li>Backend: Spring Boot • JWT • WebSocket ready • SSE fallback</li>
            <li>Frontend: React • Vite • Custom design system</li>
            <li>Dev profile endpoints for quick demo data in development</li>
          </ul>
        </div>
        <div className="card">
          <div className="card-h">Creator</div>
          <div className="about">
            <div className="avatar">B</div>
            <div>
              <div className="name">Bhuvanesh</div>
              <div className="muted">B.Tech — Final Year, IT, Kalasalingam University</div>
              <div className="muted">Easy Bytes Intern</div>
            </div>
          </div>
          <p className="muted">Passionate about building usable fintech experiences and learning full‑stack engineering.</p>
        </div>
      </section>

      <section className="container card">
        <div className="card-h">Quick Quiz</div>
        <div className="quiz">
          {quiz.map((q, qi) => (
            <div className="q" key={qi}>
              <div className="qt">{qi+1}. {q.q}</div>
              <div className="qa">
                {q.a.map((a, ai) => (
                  <label key={ai} className={`pill ${answers[qi]===ai?'sel':''}`}>
                    <input type="radio" name={`q${qi}`} value={ai}
                      onChange={() => setAnswers(prev => ({...prev, [qi]: ai}))} />
                    <span>{a}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="score">Score: {score}/{quiz.length}</div>
      </section>
    </div>
  );
}

const homeCss = `
:root { --glass: rgba(255,255,255,0.08); --stroke: rgba(255,255,255,0.12); --muted: #aeb8c4; }
.home-root { color: #eaf2ff; }
.container { width: 96%; max-width: 1180px; margin: 0 auto; }
.hero { padding: 74px 0 24px; background:
  radial-gradient(800px 400px at 15% -10%, rgba(0,212,255,0.25), transparent 50%),
  linear-gradient(180deg, rgba(10,16,32,0.95), rgba(10,16,32,0.6));
  border-bottom: 1px solid var(--stroke);
}
.hero-inner { width: 96%; max-width: 980px; margin: 0 auto; text-align: center; }
.title { font-size: 40px; font-weight: 1000; letter-spacing: 1px; }
.tag { margin-top: 2px; font-size: 12px; color: var(--muted); }
.lead { margin: 12px auto 16px; color: #cfe3ff; max-width: 760px; }
.cta-row { display: inline-flex; gap: 10px; margin-top: 6px; }
.cta { padding: 10px 14px; border-radius: 12px; border: 1px solid var(--stroke); background: rgba(255,255,255,0.06); color: #eaf2ff; cursor: pointer; }
.cta.primary { background: linear-gradient(90deg, #bfe9ff, #b2fff0); color: #051019; border-color: transparent; font-weight: 900; }
.fun { margin-top: 10px; color: #9fd8ff; font-size: 13px; }

.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
.card { background: var(--glass); border: 1px solid var(--stroke); border-radius: 16px; padding: 14px; }
.card-h { font-weight: 900; margin-bottom: 8px; color: #cfe1ff; }
.bullets { margin: 8px 0 0 18px; line-height: 1.7; }

.news { display: grid; gap: 8px; }
.news-item { display: block; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid var(--stroke); border-radius: 12px; color: inherit; text-decoration: none; }
.news-item:hover { background: rgba(255,255,255,0.08); }

.about { display: flex; gap: 12px; align-items: center; margin: 6px 0 8px; }
.avatar { width: 44px; height: 44px; border-radius: 999px; display: grid; place-items: center; background: linear-gradient(135deg, #60a5fa, #34d399); color: #001018; font-weight: 1000; }
.name { font-weight: 900; }

.quiz { display: grid; gap: 10px; }
.q { background: rgba(255,255,255,0.04); border: 1px solid var(--stroke); border-radius: 12px; padding: 10px; }
.qt { font-weight: 800; margin-bottom: 6px; }
.qa { display: flex; flex-wrap: wrap; gap: 8px; }
.pill { display: inline-flex; align-items: center; gap: 6px; padding: 8px 10px; border: 1px solid var(--stroke); border-radius: 999px; cursor: pointer; background: rgba(255,255,255,0.06); }
.pill.sel { background: linear-gradient(90deg, #bfe9ff, #b2fff0); color: #071026; border-color: transparent; }
.pill input { display: none; }
.score { margin-top: 8px; font-weight: 900; }

@media (max-width: 920px) {
  .grid2 { grid-template-columns: 1fr; }
}
`;


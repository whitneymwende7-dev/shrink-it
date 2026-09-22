import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import TourGuide from "./TourGuide.jsx";
import "./App.css";

// In dev, Vite's proxy (vite.config.js) forwards /api to localhost:3001, so this stays empty.
// In production, set VITE_API_BASE_URL in Netlify's env vars to your deployed Railway URL,
// e.g. https://your-app.up.railway.app
const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const TOUR_STEPS = [
  {
    target: "url-input",
    title: "1. Paste your long URL",
    content: "Drop any long link in here — the app validates it before creating a short version.",
  },
  {
    target: "alias-input",
    title: "2. Pick a custom alias (optional)",
    content: "Leave this blank for a random short code, or choose your own memorable slug.",
  },
  {
    target: "shorten-btn",
    title: "3. Shrink it",
    content: "This calls the backend, which checks for slug collisions and stores the link.",
  },
  {
    target: "stats-btn",
    title: "4. Check click stats",
    content: "Every redirect is logged asynchronously — view total clicks and recent activity here.",
  },
];

export default function App() {
  const [longUrl, setLongUrl] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [runTour, setRunTour] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    setStats(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ longUrl, customSlug: customSlug || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "That link couldn't be shortened. Try again.");
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    if (!result) return;
    const res = await fetch(`${API_BASE}/api/links/${result.slug}/stats`);
    const data = await res.json();
    setStats(data);
  }

  return (
    <div className="app">
      <div className="app-header">
        <span className="wordmark">
          shrink it<span className="cursor">_</span>
        </span>
        <button className="tour-btn" onClick={() => setRunTour(true)}>
          How it works
        </button>
      </div>

      <h1 className="headline">Turn a long link into a short one.</h1>
      <p className="subhead">
        Paste any URL below. You'll get a short, shareable link, a QR code, and
        click tracking — no account needed.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="prompt-field">
            <span className="prompt-symbol">&gt;</span>
            <input
              data-tour="url-input"
              type="url"
              placeholder="https://example.com/your/very/long/path"
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
              required
            />
          </div>

          <div className="alias-row">
            <span className="alias-domain">custom slug /</span>
            <div className="prompt-field" data-tour="alias-input">
              <input
                type="text"
                placeholder="custom-alias (optional)"
                value={customSlug}
                onChange={(e) => setCustomSlug(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button data-tour="shorten-btn" className="shrink-btn" type="submit" disabled={loading}>
          {loading ? "Shrinking…" : "Shrink it"}
        </button>

        {error && <p className="error-msg">{error}</p>}
      </form>

      <TourGuide steps={TOUR_STEPS} run={runTour} onFinish={() => setRunTour(false)} />

      {result && (
        <div className="result-panel">
          <div className="result-top">
            <a className="result-link" href={result.shortUrl} target="_blank" rel="noreferrer">
              {result.shortUrl}
            </a>
          </div>

          <div className="result-actions">
            <button
              className="pill-btn"
              onClick={() => navigator.clipboard.writeText(result.shortUrl)}
            >
              Copy link
            </button>
            <button data-tour="stats-btn" className="pill-btn" onClick={loadStats}>
              View stats
            </button>
          </div>

          <div className="qr-wrap">
            <QRCodeSVG value={result.shortUrl} size={104} />
          </div>

          {stats && (
            <div className="stats-panel">
              <span className="stats-count">{stats.totalClicks}</span>
              total click{stats.totalClicks === 1 ? "" : "s"} · created{" "}
              {new Date(stats.createdAt).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";

/**
 * TourGuide — reusable guided walkthrough component.
 *
 * Usage:
 *   1. Add a `data-tour="stepId"` attribute to any element you want to highlight.
 *   2. Define a steps array: [{ target: "stepId", title, content }, ...]
 *   3. Render <TourGuide steps={steps} run={run} onFinish={() => setRun(false)} />
 *
 * Drop this same component into any project (shortener, SaaS platform, etc.) —
 * only the `steps` array changes per project.
 */
export default function TourGuide({ steps, run, onFinish }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!run) return;
    setStepIndex(0);
  }, [run]);

  useEffect(() => {
    if (!run) return;
    const step = steps[stepIndex];
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Recompute after scroll settles
    const timeout = setTimeout(() => {
      setRect(el.getBoundingClientRect());
    }, 300);
    return () => clearTimeout(timeout);
  }, [stepIndex, run, steps]);

  if (!run || !steps.length) return null;

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  function next() {
    if (isLast) {
      onFinish?.();
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function skip() {
    onFinish?.();
  }

  return (
    <div ref={overlayRef} style={overlayStyle}>
      {rect && (
        <div
          style={{
            position: "fixed",
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            borderRadius: 8,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
            border: "2px solid #f2b84b",
            transition: "all 0.25s ease",
            pointerEvents: "none",
            zIndex: 10000,
          }}
        />
      )}

      {rect && (
        <div
          style={{
            position: "fixed",
            top: Math.min(rect.bottom + 16, window.innerHeight - 160),
            left: Math.max(16, Math.min(rect.left, window.innerWidth - 320)),
            width: 300,
            background: "#1b1e24",
            border: "1px solid #2e333b",
            borderRadius: 8,
            padding: 16,
            boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
            zIndex: 10001,
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            color: "#eceef2",
          }}
        >
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: "#8d94a1", marginBottom: 6 }}>
            Step {stepIndex + 1} of {steps.length}
          </div>
          <h4 style={{ margin: "0 0 8px", fontWeight: 600 }}>{step.title}</h4>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: "#c3c7ce", lineHeight: 1.4 }}>{step.content}</p>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={skip} style={ghostBtn}>
              Skip
            </button>
            <button onClick={next} style={primaryBtn}>
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const overlayStyle = { position: "fixed", inset: 0, zIndex: 9999 };
const primaryBtn = {
  background: "#f2b84b",
  color: "#1a1305",
  border: "none",
  borderRadius: 6,
  padding: "6px 14px",
  fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: 600,
  cursor: "pointer",
};
const ghostBtn = {
  background: "transparent",
  border: "none",
  color: "#8d94a1",
  fontFamily: "'Space Grotesk', sans-serif",
  cursor: "pointer",
};

import { useState, useEffect } from "react";
import { getQuizHistory, getSkillBreakdown } from "../lib/scores.js";
import "./Dashboard.css";

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  const [skills, setSkills] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getQuizHistory(), getSkillBreakdown()]).then(
      ([hist, sk]) => {
        setHistory(hist);
        setSkills(sk);
        setLoading(false);
      }
    );
  }, []);

  if (loading) return <p>Loading dashboard…</p>;

  const totalSessions = history.length;
  const avgScore = totalSessions
    ? Math.round(history.reduce((s, h) => s + h.score_pct, 0) / totalSessions)
    : 0;

  // Recent trend (last 10 vs previous 10)
  const recent10 = history.slice(0, 10);
  const prev10 = history.slice(10, 20);
  const recentAvg = recent10.length
    ? Math.round(recent10.reduce((s, h) => s + h.score_pct, 0) / recent10.length)
    : 0;
  const prevAvg = prev10.length
    ? Math.round(prev10.reduce((s, h) => s + h.score_pct, 0) / prev10.length)
    : null;
  const trend = prevAvg !== null ? recentAvg - prevAvg : null;

  // Sort skills by weakness (lowest accuracy first)
  const skillList = Object.entries(skills)
    .map(([name, { total, correct }]) => ({
      name,
      total,
      correct,
      pct: Math.round((correct / total) * 100),
    }))
    .sort((a, b) => a.pct - b.pct);

  return (
    <div className="dashboard">
      <div className="stats-cards">
        <div className="stat-card">
          <span className="stat-value">{totalSessions}</span>
          <span className="stat-label">Sessions</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{avgScore}%</span>
          <span className="stat-label">Avg Score</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {trend !== null ? (
              <>
                {trend > 0 ? "+" : ""}
                {trend}%
              </>
            ) : (
              "—"
            )}
          </span>
          <span className="stat-label">Trend</span>
        </div>
      </div>

      {skillList.length > 0 && (
        <section className="skill-breakdown">
          <h3>Skills (weakest first)</h3>
          <div className="skill-list">
            {skillList.map((s) => (
              <div key={s.name} className="skill-row">
                <span className="skill-name">{s.name}</span>
                <div className="skill-bar-bg">
                  <div
                    className="skill-bar-fill"
                    style={{
                      width: `${s.pct}%`,
                      background: s.pct >= 80 ? "#1a7f2e" : s.pct >= 50 ? "#856404" : "#842029",
                    }}
                  />
                </div>
                <span className="skill-pct">{s.pct}%</span>
                <span className="skill-count">({s.correct}/{s.total})</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className="history">
          <h3>Recent Sessions</h3>
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Section</th>
                <th>Domain</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.completed_at).toLocaleDateString()}</td>
                  <td>{h.module === "math" ? "Math" : "R&W"}</td>
                  <td>{h.domain || "All"}</td>
                  <td>
                    <span className={`score-badge ${h.score_pct >= 80 ? "good" : h.score_pct >= 50 ? "ok" : "bad"}`}>
                      {h.correct_answers}/{h.total_questions} ({h.score_pct}%)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {totalSessions === 0 && (
        <p className="empty">No sessions yet. Complete a quiz to see your progress!</p>
      )}
    </div>
  );
}

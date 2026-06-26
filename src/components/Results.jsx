import { useEffect, useRef, useState } from "react";
import { saveQuizSession } from "../lib/scores.js";
import { calculateXP, updateProfile, checkAndAwardAchievements } from "../lib/gamification.js";
import "./Results.css";

export default function Results({ questions, answers, filters, timeSeconds, onRestart }) {
  const saved = useRef(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [newAchievements, setNewAchievements] = useState([]);
  const correct = answers.filter((a) => a.correct).length;
  const total = answers.length;
  const pct = Math.round((correct / total) * 100);

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;

    const xp = calculateXP({ questions, answers, timeSeconds });
    setXpEarned(xp);

    saveQuizSession({
      module: filters.module,
      domain: filters.domain,
      difficulty: filters.difficulty,
      questions,
      answers,
      timeSeconds,
      xpEarned: xp,
    });

    updateProfile(xp, timeSeconds, total).then((profile) => {
      if (profile) {
        checkAndAwardAchievements(profile).then(setNewAchievements);
      }
    });
  }, []);

  return (
    <div className="results">
      <h2>Results</h2>
      <div className="score">
        <span className="score-number">
          {correct}/{total}
        </span>
        <span className="score-pct">{pct}%</span>
      </div>

      <div className="xp-earned">
        <span className="xp-badge">+{xpEarned} XP</span>
        <span className="time-spent">{Math.floor(timeSeconds / 60)}m {timeSeconds % 60}s</span>
      </div>

      {newAchievements.length > 0 && (
        <div className="new-achievements">
          <h4>New Achievements!</h4>
          {newAchievements.map((ach) => (
            <div key={ach.id} className="achievement-toast">
              <span className="achievement-icon">{ach.icon}</span>
              <div>
                <strong>{ach.title}</strong>
                <p>{ach.description}</p>
              </div>
              <span className="achievement-xp">+{ach.xp_reward} XP</span>
            </div>
          ))}
        </div>
      )}

      <div className="results-list">
        {questions.map((q, i) => (
          <div
            key={q.id}
            className={`result-item ${answers[i]?.correct ? "correct" : "incorrect"}`}
          >
            <span className="result-icon">
              {answers[i]?.correct ? "✓" : "✗"}
            </span>
            <span className="result-skill">{q.skill}</span>
            <span className={`result-diff difficulty-${q.difficulty}`}>
              {q.difficulty === "E"
                ? "Easy"
                : q.difficulty === "M"
                  ? "Medium"
                  : "Hard"}
            </span>
          </div>
        ))}
      </div>

      <button className="restart-btn" onClick={onRestart}>
        Try Again
      </button>
    </div>
  );
}

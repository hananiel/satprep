import { useState, useEffect } from "react";
import { getProfile, getLevel, getAchievements } from "../lib/gamification.js";
import "./PlayerStats.css";

export default function PlayerStats() {
  const [profile, setProfile] = useState(null);
  const [achievements, setAchievements] = useState({ all: [], earned: [] });
  const [showAchievements, setShowAchievements] = useState(false);

  useEffect(() => {
    getProfile().then(setProfile);
    getAchievements().then(setAchievements);
  }, []);

  if (!profile) return null;

  const { level, currentXP, nextLevelXP } = getLevel(profile.xp);
  const progressPct = Math.round((currentXP / nextLevelXP) * 100);

  return (
    <div className="player-stats">
      <div className="stat-item level">
        <span className="stat-label">Lvl</span>
        <span className="stat-value">{level}</span>
      </div>

      <div className="stat-item xp-bar-container">
        <div className="xp-bar">
          <div className="xp-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="xp-text">
          {currentXP}/{nextLevelXP} XP
        </span>
      </div>

      <div className="stat-item streak">
        <span className="stat-value">
          {profile.streak_days > 0 ? "🔥" : "❄️"} {profile.streak_days}d
        </span>
      </div>

      <div className="stat-item total-xp">
        <span className="stat-value">{profile.xp} XP</span>
      </div>

      <button
        className="achievements-btn"
        onClick={() => setShowAchievements(!showAchievements)}
      >
        🏆 {achievements.earned.length}/{achievements.all.length}
      </button>

      {showAchievements && (
        <div className="achievements-panel">
          <h3>Achievements</h3>
          <div className="achievements-grid">
            {achievements.all.map((ach) => {
              const isEarned = achievements.earned.some(
                (e) => e.achievement_id === ach.id,
              );
              return (
                <div
                  key={ach.id}
                  className={`achievement-card ${isEarned ? "earned" : "locked"}`}
                >
                  <span className="ach-icon">{ach.icon}</span>
                  <strong>{ach.title}</strong>
                  <p>{ach.description}</p>
                  <span className="ach-xp">+{ach.xp_reward} XP</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

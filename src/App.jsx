import { useState, useEffect } from "react";
import { useAuth } from "./components/AuthProvider.jsx";
import Login from "./components/Login.jsx";
import Quiz from "./components/Quiz.jsx";
import Dashboard from "./components/Dashboard.jsx";
import PlayerStats from "./components/PlayerStats.jsx";
import Custodian from "./components/Custodian.jsx";
import "./App.css";

const BASE = import.meta.env.BASE_URL;

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [view, setView] = useState("practice");
  const [manifest, setManifest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    module: "math",
    domain: "",
    difficulty: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}questions/manifest.json`)
      .then((r) => r.json())
      .then(setManifest)
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE}questions/${filters.module}.json`)
      .then((r) => r.json())
      .then((data) => {
        setQuestions(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [filters.module]);

  const filtered = questions.filter((q) => {
    if (filters.domain && q.domain !== filters.domain) return false;
    if (filters.difficulty && q.difficulty !== filters.difficulty) return false;
    return true;
  });

  const currentModuleManifest = manifest?.find(
    (m) => m.module === filters.module
  );

  if (authLoading) return <div className="app"><p>Loading…</p></div>;
  if (!user) return <Login />;

  return (
    <div className="app">
      <main className="app-content">
        {view === "practice" && (
          <>
            <div className="practice-header">
              <PlayerStats />
              <button
                className="filter-toggle"
                onClick={() => setShowFilters(!showFilters)}
              >
                ⚙️ {filters.module === "math" ? "Math" : "R&W"}
                {filters.difficulty ? ` · ${filters.difficulty}` : ""}
                {filters.domain ? ` · ${filters.domain.slice(0, 15)}` : ""}
              </button>
            </div>

            {showFilters && (
              <div className="filters">
                <div className="filter-group">
                  <label>Section</label>
                  <div className="toggle-buttons">
                    <button
                      className={filters.module === "math" ? "active" : ""}
                      onClick={() => setFilters({ ...filters, module: "math", domain: "" })}
                    >
                      Math
                    </button>
                    <button
                      className={filters.module === "english" ? "active" : ""}
                      onClick={() => setFilters({ ...filters, module: "english", domain: "" })}
                    >
                      R&amp;W
                    </button>
                  </div>
                </div>

                <div className="filter-group">
                  <label>Domain</label>
                  <select
                    value={filters.domain}
                    onChange={(e) => setFilters({ ...filters, domain: e.target.value })}
                  >
                    <option value="">All</option>
                    {currentModuleManifest?.domains.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Difficulty</label>
                  <div className="toggle-buttons">
                    <button className={filters.difficulty === "" ? "active" : ""} onClick={() => setFilters({ ...filters, difficulty: "" })}>All</button>
                    <button className={filters.difficulty === "E" ? "active" : ""} onClick={() => setFilters({ ...filters, difficulty: "E" })}>Easy</button>
                    <button className={filters.difficulty === "M" ? "active" : ""} onClick={() => setFilters({ ...filters, difficulty: "M" })}>Med</button>
                    <button className={filters.difficulty === "H" ? "active" : ""} onClick={() => setFilters({ ...filters, difficulty: "H" })}>Hard</button>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <p className="loading-text">Loading…</p>
            ) : filtered.length > 0 ? (
              <Quiz questions={filtered} filters={filters} key={JSON.stringify(filters)} />
            ) : (
              <p className="loading-text">No questions match filters</p>
            )}
          </>
        )}

        {view === "stats" && <Dashboard />}
        {view === "parent" && <Custodian />}
        {view === "settings" && (
          <div className="settings-page">
            <h2>Settings</h2>
            <div className="settings-card">
              <div className="settings-row">
                <span className="settings-label">Signed in as</span>
                <span className="settings-value">{user.user_metadata?.full_name || user.email}</span>
              </div>
              <div className="settings-row">
                <span className="settings-label">User ID</span>
                <span className="settings-value settings-id">{user.id}</span>
              </div>
              <button className="sign-out-btn" onClick={signOut}>Sign out</button>
            </div>
          </div>
        )}
      </main>

      <nav className="tab-bar">
        <button className={view === "practice" ? "active" : ""} onClick={() => setView("practice")}>
          <span className="tab-icon">📝</span>
          <span className="tab-label">Practice</span>
        </button>
        <button className={view === "stats" ? "active" : ""} onClick={() => setView("stats")}>
          <span className="tab-icon">📊</span>
          <span className="tab-label">Stats</span>
        </button>
        <button className={view === "parent" ? "active" : ""} onClick={() => setView("parent")}>
          <span className="tab-icon">👁️</span>
          <span className="tab-label">Parent</span>
        </button>
        <button className={view === "settings" ? "active" : ""} onClick={() => setView("settings")}>
          <span className="tab-icon">⚙️</span>
          <span className="tab-label">Settings</span>
        </button>
      </nav>
    </div>
  );
}

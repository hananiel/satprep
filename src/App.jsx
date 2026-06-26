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
  const [view, setView] = useState("quiz"); // "quiz", "dashboard", "custodian"
  const [manifest, setManifest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [filters, setFilters] = useState({
    module: "math",
    domain: "",
    difficulty: "",
  });
  const [loading, setLoading] = useState(true);

  // Load manifest on mount
  useEffect(() => {
    fetch(`${BASE}questions/manifest.json`)
      .then((r) => r.json())
      .then(setManifest)
      .catch(console.error);
  }, []);

  // Load questions when module changes
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

  // Filter questions
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
      <header className="app-header">
        <h1>SAT Prep</h1>
        <nav className="app-nav">
          <button className={view === "quiz" ? "active" : ""} onClick={() => setView("quiz")}>Practice</button>
          <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>Dashboard</button>
          <button className={view === "custodian" ? "active" : ""} onClick={() => setView("custodian")}>Parent</button>
        </nav>
        <div className="user-info">
          <span>{user.user_metadata?.full_name || user.email}</span>
          <button className="sign-out-btn" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <PlayerStats />

      {view === "custodian" ? (
        <Custodian />
      ) : view === "dashboard" ? (
        <Dashboard />
      ) : (
      <>
      <div className="filters">
        <div className="filter-group">
          <label>Section</label>
          <div className="toggle-buttons">
            <button
              className={filters.module === "math" ? "active" : ""}
              onClick={() =>
                setFilters({ ...filters, module: "math", domain: "" })
              }
            >
              Math
            </button>
            <button
              className={filters.module === "english" ? "active" : ""}
              onClick={() =>
                setFilters({ ...filters, module: "english", domain: "" })
              }
            >
              Reading &amp; Writing
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
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Difficulty</label>
          <div className="toggle-buttons">
            <button
              className={filters.difficulty === "" ? "active" : ""}
              onClick={() => setFilters({ ...filters, difficulty: "" })}
            >
              All
            </button>
            <button
              className={filters.difficulty === "E" ? "active" : ""}
              onClick={() => setFilters({ ...filters, difficulty: "E" })}
            >
              Easy
            </button>
            <button
              className={filters.difficulty === "M" ? "active" : ""}
              onClick={() => setFilters({ ...filters, difficulty: "M" })}
            >
              Medium
            </button>
            <button
              className={filters.difficulty === "H" ? "active" : ""}
              onClick={() => setFilters({ ...filters, difficulty: "H" })}
            >
              Hard
            </button>
          </div>
        </div>
      </div>

      <p className="question-count">
        {loading ? "Loading…" : `${filtered.length} questions available`}
      </p>

      {!loading && filtered.length > 0 && (
        <Quiz questions={filtered} filters={filters} key={JSON.stringify(filters)} />
      )}
      </>
      )}
    </div>
  );
}

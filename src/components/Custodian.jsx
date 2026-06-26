import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";
import { useAuth } from "./AuthProvider.jsx";
import "./Custodian.css";

export default function Custodian() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkError, setLinkError] = useState("");
  const [linkSuccess, setLinkSuccess] = useState("");

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    const { data } = await supabase
      .from("custodian_students")
      .select("student_id, profiles!custodian_students_student_id_fkey(display_name, xp, level, streak_days, last_practice_date, total_time_seconds, total_questions_answered)")
      .eq("custodian_id", user.id);

    setStudents(data || []);
    if (data?.length && !selectedStudent) {
      setSelectedStudent(data[0].student_id);
    }
  }

  useEffect(() => {
    if (!selectedStudent) return;
    loadStudentData(selectedStudent);
  }, [selectedStudent]);

  async function loadStudentData(studentId) {
    const [{ data: sessions }, { data: achievements }] = await Promise.all([
      supabase
        .from("quiz_sessions")
        .select("*")
        .eq("user_id", studentId)
        .order("completed_at", { ascending: false })
        .limit(20),
      supabase
        .from("user_achievements")
        .select("*, achievements(*)")
        .eq("user_id", studentId),
    ]);

    setStudentData({ sessions: sessions || [], achievements: achievements || [] });
  }

  async function handleLinkStudent(e) {
    e.preventDefault();
    setLinkError("");
    setLinkSuccess("");

    // First, set own role to custodian if not already
    await supabase
      .from("profiles")
      .update({ role: "custodian" })
      .eq("id", user.id);

    // Find student by email - look them up in auth (via profiles)
    // Since we can't query auth.users, student must share their user ID
    // For now, use the ID directly (we'll improve UX later with invite codes)
    const studentId = linkEmail.trim();
    if (!studentId) {
      setLinkError("Please enter the student's user ID");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, display_name")
      .eq("id", studentId)
      .single();

    if (!profile) {
      setLinkError("No student found with that ID. Ask them to share their ID from Settings.");
      return;
    }

    const { error } = await supabase.from("custodian_students").insert({
      custodian_id: user.id,
      student_id: studentId,
    });

    if (error) {
      setLinkError(error.code === "23505" ? "Already linked to this student" : error.message);
      return;
    }

    setLinkSuccess(`Linked to ${profile.display_name || "student"}!`);
    setLinkEmail("");
    loadStudents();
  }

  const currentStudentProfile = students.find((s) => s.student_id === selectedStudent)?.profiles;

  return (
    <div className="custodian">
      <h2>Parent Dashboard</h2>

      {students.length === 0 ? (
        <div className="no-students">
          <p>No students linked yet. Add your child's account to monitor their progress.</p>
        </div>
      ) : (
        <>
          {students.length > 1 && (
            <div className="student-tabs">
              {students.map((s) => (
                <button
                  key={s.student_id}
                  className={selectedStudent === s.student_id ? "active" : ""}
                  onClick={() => setSelectedStudent(s.student_id)}
                >
                  {s.profiles?.display_name || "Student"}
                </button>
              ))}
            </div>
          )}

          {currentStudentProfile && (
            <div className="student-overview">
              <div className="overview-cards">
                <div className="card">
                  <span className="card-label">Level</span>
                  <span className="card-value">{currentStudentProfile.level}</span>
                </div>
                <div className="card">
                  <span className="card-label">Total XP</span>
                  <span className="card-value">{currentStudentProfile.xp}</span>
                </div>
                <div className="card">
                  <span className="card-label">Streak</span>
                  <span className="card-value">{currentStudentProfile.streak_days}d 🔥</span>
                </div>
                <div className="card">
                  <span className="card-label">Questions</span>
                  <span className="card-value">{currentStudentProfile.total_questions_answered}</span>
                </div>
                <div className="card">
                  <span className="card-label">Practice Time</span>
                  <span className="card-value">{Math.floor(currentStudentProfile.total_time_seconds / 3600)}h {Math.floor((currentStudentProfile.total_time_seconds % 3600) / 60)}m</span>
                </div>
                <div className="card">
                  <span className="card-label">Last Active</span>
                  <span className="card-value">{currentStudentProfile.last_practice_date || "Never"}</span>
                </div>
              </div>
            </div>
          )}

          {studentData && (
            <>
              <h3>Achievements ({studentData.achievements.length})</h3>
              <div className="achievements-list">
                {studentData.achievements.map((a) => (
                  <span key={a.achievement_id} className="badge">
                    {a.achievements.icon} {a.achievements.title}
                  </span>
                ))}
                {studentData.achievements.length === 0 && <p className="muted">No achievements yet</p>}
              </div>

              <h3>Recent Sessions</h3>
              <table className="sessions-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Module</th>
                    <th>Score</th>
                    <th>Time</th>
                    <th>XP</th>
                  </tr>
                </thead>
                <tbody>
                  {studentData.sessions.map((s) => (
                    <tr key={s.id}>
                      <td>{new Date(s.completed_at).toLocaleDateString()}</td>
                      <td>{s.module}</td>
                      <td>{s.score_pct}%</td>
                      <td>{Math.floor((s.time_seconds || 0) / 60)}m</td>
                      <td>+{s.xp_earned || 0}</td>
                    </tr>
                  ))}
                  {studentData.sessions.length === 0 && (
                    <tr><td colSpan={5} className="muted">No sessions yet</td></tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      <div className="link-student-form">
        <h3>Link a Student</h3>
        <form onSubmit={handleLinkStudent}>
          <input
            type="text"
            placeholder="Student's User ID"
            value={linkEmail}
            onChange={(e) => setLinkEmail(e.target.value)}
          />
          <button type="submit">Link</button>
        </form>
        {linkError && <p className="error">{linkError}</p>}
        {linkSuccess && <p className="success">{linkSuccess}</p>}
        <p className="hint">Ask your child to go to Settings to find their User ID.</p>
      </div>
    </div>
  );
}

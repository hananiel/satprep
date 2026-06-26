import { supabase } from "./supabase.js";

export async function saveQuizSession({ module, domain, difficulty, questions, answers, timeSeconds, xpEarned }) {
  const correct = answers.filter((a) => a.correct).length;
  const total = answers.length;
  const scorePct = Math.round((correct / total) * 100);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from("quiz_sessions").insert({
    user_id: user.id,
    module,
    domain: domain || null,
    difficulty: difficulty || null,
    total_questions: total,
    correct_answers: correct,
    score_pct: scorePct,
    time_seconds: timeSeconds || 0,
    xp_earned: xpEarned || 0,
    questions: questions.map((q, i) => ({
      questionId: q.id,
      skill: q.skill,
      difficulty: q.difficulty,
      correct: answers[i].correct,
    })),
  }).select().single();

  if (error) console.error("Failed to save session:", error);
  return data;
}

export async function getQuizHistory(limit = 50) {
  const { data, error } = await supabase
    .from("quiz_sessions")
    .select("*")
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch history:", error);
    return [];
  }
  return data;
}

export async function getSkillBreakdown() {
  const { data, error } = await supabase
    .from("quiz_sessions")
    .select("questions")
    .order("completed_at", { ascending: false })
    .limit(200);

  if (error) return {};

  // Aggregate by skill
  const skills = {};
  for (const session of data) {
    for (const q of session.questions) {
      if (!skills[q.skill]) skills[q.skill] = { total: 0, correct: 0 };
      skills[q.skill].total++;
      if (q.correct) skills[q.skill].correct++;
    }
  }
  return skills;
}

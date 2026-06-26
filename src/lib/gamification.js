import { supabase } from "./supabase.js";

// XP rewards
const XP_PER_QUESTION = 5;
const XP_PER_CORRECT = 10;
const XP_HARD_BONUS = 5;
const XP_PERFECT_BONUS = 50;
const XP_PER_MINUTE = 2;

export function calculateXP({ questions, answers, timeSeconds }) {
  let xp = 0;
  answers.forEach((a, i) => {
    xp += XP_PER_QUESTION;
    if (a.correct) {
      xp += XP_PER_CORRECT;
      if (questions[i].difficulty === "H") xp += XP_HARD_BONUS;
    }
  });
  // Perfect score bonus
  if (answers.every((a) => a.correct)) xp += XP_PERFECT_BONUS;
  // Time bonus (cap at 30 min)
  xp += Math.min(Math.floor(timeSeconds / 60), 30) * XP_PER_MINUTE;
  return xp;
}

export function getLevel(xp) {
  // Each level requires progressively more XP
  // Level 1: 0, Level 2: 100, Level 3: 250, Level 4: 450...
  let level = 1;
  let threshold = 100;
  let remaining = xp;
  while (remaining >= threshold) {
    remaining -= threshold;
    level++;
    threshold = Math.floor(threshold * 1.5);
  }
  return { level, currentXP: remaining, nextLevelXP: threshold };
}

export async function updateProfile(xpEarned, timeSeconds, questionsAnswered) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get current profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Create profile if trigger didn't fire (existing users)
    await supabase.from("profiles").insert({
      id: user.id,
      display_name: user.user_metadata?.full_name || user.email,
    });
    return updateProfile(xpEarned, timeSeconds, questionsAnswered);
  }

  const today = new Date().toISOString().split("T")[0];
  const lastPractice = profile.last_practice_date;

  // Calculate streak
  let newStreak = profile.streak_days;
  if (lastPractice !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (lastPractice === yesterdayStr) {
      newStreak += 1;
    } else if (lastPractice !== today) {
      newStreak = 1; // Reset streak
    }
  }

  const newXP = profile.xp + xpEarned;
  const newLevel = getLevel(newXP).level;

  const { data } = await supabase
    .from("profiles")
    .update({
      xp: newXP,
      level: newLevel,
      streak_days: newStreak,
      last_practice_date: today,
      total_time_seconds: profile.total_time_seconds + timeSeconds,
      total_questions_answered: profile.total_questions_answered + questionsAnswered,
    })
    .eq("id", user.id)
    .select()
    .single();

  return data;
}

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

export async function checkAndAwardAchievements(profile) {
  if (!profile) return [];

  const { data: allAchievements } = await supabase
    .from("achievements")
    .select("*");

  const { data: earned } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", profile.id);

  const earnedIds = new Set((earned || []).map((e) => e.achievement_id));
  const newlyEarned = [];

  for (const ach of allAchievements || []) {
    if (earnedIds.has(ach.id)) continue;

    let qualifies = false;
    switch (ach.condition_type) {
      case "questions_answered":
        qualifies = profile.total_questions_answered >= ach.condition_value;
        break;
      case "streak":
        qualifies = profile.streak_days >= ach.condition_value;
        break;
      case "time":
        qualifies = profile.total_time_seconds >= ach.condition_value;
        break;
      // score and skill_mastery are checked per-session in Results
    }

    if (qualifies) {
      await supabase.from("user_achievements").insert({
        user_id: profile.id,
        achievement_id: ach.id,
      });
      // Award bonus XP
      if (ach.xp_reward) {
        await supabase
          .from("profiles")
          .update({ xp: profile.xp + ach.xp_reward })
          .eq("id", profile.id);
        profile.xp += ach.xp_reward;
      }
      newlyEarned.push(ach);
    }
  }

  return newlyEarned;
}

export async function getAchievements() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { all: [], earned: [] };

  const [{ data: all }, { data: earned }] = await Promise.all([
    supabase.from("achievements").select("*"),
    supabase.from("user_achievements").select("*, achievements(*)").eq("user_id", user.id),
  ]);

  return { all: all || [], earned: earned || [] };
}

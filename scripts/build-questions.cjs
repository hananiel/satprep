/**
 * Processes raw CB question bank JSON into app-ready files in public/questions/.
 * Splits by module (math, english) and normalizes the schema.
 *
 * Run: node scripts/build-questions.js
 */

const fs = require("fs");
const path = require("path");

const INPUT = path.join(__dirname, "..", "data", "cb-digital-questions.json");
const OUTPUT_DIR = path.join(__dirname, "..", "public", "questions");

const raw = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
const entries = Object.values(raw);

function normalize(q) {
  const answerOptions = (q.content.answerOptions || []).map((opt, idx) => ({
    label: String.fromCharCode(65 + idx), // A, B, C, D
    id: opt.id,
    content: opt.content,
  }));

  // Infer type if missing
  let type = q.content.type;
  if (!type) {
    if (answerOptions.length > 0) type = "mcq";
    else if (q.content.keys && q.content.keys.length > 0) type = "spr";
    else type = "unknown";
  }

  return {
    id: q.questionId,
    externalId: q.external_id,
    module: q.module,
    domain: q.primary_class_cd_desc,
    skill: q.skill_desc,
    difficulty: q.difficulty, // E, M, H
    type,
    stem: q.content.stem || "",
    stimulus: q.content.stimulus || null,
    answerOptions,
    correctAnswer: q.content.correct_answer || [],
    keys: q.content.keys || [],
    rationale: q.content.rationale || "",
  };
}

// Group by module, filter out empty questions (no stem and no options)
const byModule = {};
let skipped = 0;
for (const q of entries) {
  const n = normalize(q);
  if (!n.stem && n.answerOptions.length === 0 && n.keys.length === 0) {
    skipped++;
    continue;
  }
  const mod = n.module || "other";
  if (!byModule[mod]) byModule[mod] = [];
  byModule[mod].push(n);
}
console.log(`Skipped ${skipped} empty questions (no stem/options/keys)`);

// Write output
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

for (const [mod, questions] of Object.entries(byModule)) {
  const outPath = path.join(OUTPUT_DIR, `${mod}.json`);
  fs.writeFileSync(outPath, JSON.stringify(questions));
  console.log(`${mod}.json: ${questions.length} questions (${(Buffer.byteLength(JSON.stringify(questions)) / 1024 / 1024).toFixed(1)} MB)`);
}

// Also write a manifest
const manifest = Object.entries(byModule).map(([mod, qs]) => {
  const domains = [...new Set(qs.map((q) => q.domain))].sort();
  const skills = [...new Set(qs.map((q) => q.skill))].sort();
  return {
    module: mod,
    file: `${mod}.json`,
    count: qs.length,
    domains,
    skills,
    difficulties: { E: qs.filter((q) => q.difficulty === "E").length, M: qs.filter((q) => q.difficulty === "M").length, H: qs.filter((q) => q.difficulty === "H").length },
  };
});

fs.writeFileSync(path.join(OUTPUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log("\nmanifest.json written");
console.log("Done!");

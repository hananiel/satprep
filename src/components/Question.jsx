import { useState } from "react";
import "./Question.css";

export default function Question({ question, onAnswer, onAnswered }) {
  const [selected, setSelected] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const isCorrect = (choice) => {
    // For MCQ: correctAnswer is like ["C"], check by label
    if (question.correctAnswer?.includes(choice.label)) return true;
    // Also check by key ID
    if (question.keys?.includes(choice.id)) return true;
    return false;
  };

  const handleSelect = (choice) => {
    if (selected) return; // already answered
    setSelected(choice.label);
    setShowExplanation(true);
    const result = {
      selected: choice,
      correct: question.answerOptions.some(
        (o) => o.label === choice && isCorrect(o)
      ),
    };
    if (onAnswered) onAnswered(result);
  };

  const handleNext = () => {
    onAnswer({
      selected,
      correct: question.answerOptions.some(
        (o) => o.label === selected && isCorrect(o)
      ),
    });
  };

  const isSPR = question.type === "spr";

  return (
    <div className="question">
      <div className="question-meta">
        <span className={`difficulty difficulty-${question.difficulty}`}>
          {question.difficulty === "E"
            ? "Easy"
            : question.difficulty === "M"
              ? "Medium"
              : "Hard"}
        </span>
        <span className="skill">{question.skill}</span>
      </div>

      {question.stimulus && (
        <div
          className="stimulus"
          dangerouslySetInnerHTML={{ __html: question.stimulus }}
        />
      )}

      <div
        className="stem"
        dangerouslySetInnerHTML={{ __html: question.stem }}
      />

      {!isSPR && (
        <div className="choices">
          {question.answerOptions.map((opt) => {
            let cls = "choice";
            if (selected) {
              if (isCorrect(opt)) cls += " correct";
              else if (opt.label === selected) cls += " incorrect";
            }
            if (opt.label === selected) cls += " selected";

            return (
              <button
                key={opt.id}
                className={cls}
                onClick={() => handleSelect(opt)}
                disabled={!!selected}
              >
                <span className="choice-label">{opt.label}</span>
                <span
                  className="choice-content"
                  dangerouslySetInnerHTML={{ __html: opt.content }}
                />
              </button>
            );
          })}
        </div>
      )}

      {isSPR && <SPRInput question={question} onSubmit={handleSelect} selected={selected} />}

      {showExplanation && (
        <div className="explanation">
          <h4>Explanation</h4>
          <div dangerouslySetInnerHTML={{ __html: question.rationale }} />
        </div>
      )}
    </div>
  );
}

function SPRInput({ question, onSubmit, selected }) {
  const [value, setValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!value.trim() || selected) return;
    onSubmit(value.trim());
  };

  return (
    <form className="spr-input" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Type your answer…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!!selected}
      />
      <button type="submit" disabled={!!selected || !value.trim()}>
        Submit
      </button>
      {selected && (
        <p className="spr-answer">
          Correct answer: {question.correctAnswer?.join(", ") || question.keys?.join(", ")}
        </p>
      )}
    </form>
  );
}

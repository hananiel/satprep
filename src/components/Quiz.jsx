import { useState, useRef } from "react";
import Question from "./Question.jsx";
import Results from "./Results.jsx";
import "./Quiz.css";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Quiz({ questions, filters }) {
  const BATCH_SIZE = 10;
  const [pool] = useState(() => shuffle(questions).slice(0, BATCH_SIZE));
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [pendingAnswer, setPendingAnswer] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const startTime = useRef(Date.now());

  const handleNext = () => {
    if (!pendingAnswer) return;
    const nextAnswers = [...answers, pendingAnswer];
    setAnswers(nextAnswers);
    setPendingAnswer(null);
    if (current + 1 < pool.length) {
      setCurrent(current + 1);
    } else {
      setShowResults(true);
    }
  };

  const restart = () => {
    setCurrent(0);
    setAnswers([]);
    setPendingAnswer(null);
    setShowResults(false);
    startTime.current = Date.now();
  };

  if (showResults) {
    return (
      <Results
        questions={pool}
        answers={answers}
        filters={filters}
        timeSeconds={Math.floor((Date.now() - startTime.current) / 1000)}
        onRestart={restart}
      />
    );
  }

  const isLast = current + 1 >= pool.length;

  return (
    <div className="quiz">
      <div className="progress">
        Question {current + 1} of {pool.length}
      </div>
      <Question
        key={pool[current].id}
        question={pool[current]}
        onAnswered={setPendingAnswer}
      />
      {pendingAnswer && (
        <div className="next-bar">
          <button className="next-btn" onClick={handleNext}>
            {isLast ? "See Results" : "Next →"}
          </button>
        </div>
      )}
    </div>
  );
}

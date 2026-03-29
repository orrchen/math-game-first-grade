import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, RefreshCw, Sparkles, Star, Trophy } from "lucide-react";

const APP_NAME = "בַּלָּשֵׁי הַבִּיּוּב";
const IMAGE_ALT = APP_NAME;
const IMAGE_SRC = "/image.png";
const TOTAL_QUESTIONS = 15;
const GRID_COLS = 5;
const GRID_ROWS = 3;

type GameState = "start" | "playing" | "won";
type FeedbackType = "neutral" | "success" | "error" | "win";

type TileData = {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

type Question = {
  id: number;
  prompt: string;
  answer: number;
  choices: number[];
};

const TILE_LAYOUT: TileData[] = Array.from({ length: TOTAL_QUESTIONS }, (_, index) => {
  const col = index % GRID_COLS;
  const row = Math.floor(index / GRID_COLS);
  return {
    id: index + 1,
    x: col * (100 / GRID_COLS),
    y: row * (100 / GRID_ROWS),
    w: 100 / GRID_COLS,
    h: 100 / GRID_ROWS,
  };
});

const SUCCESS_MESSAGES = [
  "🎉 כָּל הַכָּבוֹד!",
  "🌟 נָכוֹן מְאוֹד!",
  "😊 יוֹפִי!",
  "👏 הִצְלַחְתָּ!",
  "💙 תְּשׁוּבָה נְכוֹנָה!",
  "⭐ אַלּוּף!",
];

const ERROR_MESSAGES = [
  "כִּמְעַט, נְסֶה שׁוּב 😊",
  "לֹא נוֹרָא, נְנַסֶּה שׁוּב",
  "עוֹד פַּעַם אַחַת 💪",
  "אַתָּה יָכוֹל!",
];

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne(items: string[]): string {
  return items[Math.floor(Math.random() * items.length)];
}

function createChoices(answer: number): number[] {
  const choices = new Set<number>([answer]);
  while (choices.size < 3) {
    const offset = randomInt(1, 4) * (Math.random() < 0.5 ? -1 : 1);
    const candidate = Math.max(0, Math.min(20, answer + offset));
    choices.add(candidate);
  }
  return shuffle(Array.from(choices));
}

function makeAdditionQuestion(id: number): Question {
  const a = randomInt(0, 10);
  const b = randomInt(0, 10);
  return {
    id,
    prompt: `${a} + ${b} = ?`,
    answer: a + b,
    choices: createChoices(a + b),
  };
}

function makeSubtractionMissingQuestion(id: number): Question {
  const start = randomInt(5, 20);
  const answer = randomInt(1, Math.min(10, start - 1));
  const result = start - answer;
  return {
    id,
    prompt: `${start} - ? = ${result}`,
    answer,
    choices: createChoices(answer),
  };
}

function makeAdditionMissingQuestion(id: number): Question {
  const answer = randomInt(0, 12);
  const second = randomInt(0, 12);
  return {
    id,
    prompt: `? + ${second} = ${answer + second}`,
    answer,
    choices: createChoices(answer),
  };
}

function generateQuestions(): Question[] {
  const builders = [
    makeAdditionQuestion,
    makeSubtractionMissingQuestion,
    makeAdditionMissingQuestion,
  ];
  return Array.from({ length: TOTAL_QUESTIONS }, (_, index) => {
    const build = builders[index % builders.length];
    return build(index + 1);
  });
}

function Tile({ tile }: { tile: TileData }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.35 }}
      className="tile"
      style={{
        left: `${tile.x}%`,
        top: `${tile.y}%`,
        width: `${tile.w}%`,
        height: `${tile.h}%`,
      }}
    >
      <span>{tile.id}</span>
    </motion.div>
  );
}

function AnswerButton({
  value,
  onClick,
  disabled,
}: {
  value: number;
  onClick: (value: number) => void;
  disabled: boolean;
}) {
  return (
    <button onClick={() => onClick(value)} disabled={disabled} className="answer-button">
      {value}
    </button>
  );
}

function ConfettiDots() {
  const dots = Array.from({ length: 20 }, (_, i) => i);
  return (
    <div className="confetti-layer" aria-hidden="true">
      {dots.map((dot) => (
        <motion.div
          key={dot}
          initial={{ y: -20, opacity: 0, x: `${5 + dot * 4}%` }}
          animate={{ y: "110%", opacity: [0, 1, 1, 0], rotate: 360 }}
          transition={{ duration: 2.8, delay: dot * 0.06, repeat: Infinity, repeatDelay: 1.2 }}
          className="confetti-dot"
        />
      ))}
    </div>
  );
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>("start");
  const [questions, setQuestions] = useState<Question[]>(() => generateQuestions());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [queue, setQueue] = useState<number[]>(() => shuffle(TILE_LAYOUT.map((tile) => tile.id)));
  const [removedTileIds, setRemovedTileIds] = useState<number[]>([]);
  const [feedback, setFeedback] = useState("בָּרוּךְ הַבָּא לַמִּשְׂחָק!");
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("neutral");
  const [locked, setLocked] = useState(false);

  const currentQuestion = questions[currentIndex];
  const visibleTiles = useMemo(
    () => TILE_LAYOUT.filter((tile) => !removedTileIds.includes(tile.id)),
    [removedTileIds]
  );
  const solvedCount = removedTileIds.length;
  const progress = Math.round((solvedCount / TOTAL_QUESTIONS) * 100);

  useEffect(() => {
    if (removedTileIds.length === TOTAL_QUESTIONS && gameState === "playing") {
      setGameState("won");
      setFeedback("🏆 גִּלִּיתָ אֶת כָּל הַתְּמוּנָה!");
      setFeedbackType("win");
    }
  }, [removedTileIds, gameState]);

  function startGame() {
    setGameState("playing");
    setFeedback("בְּהַצְלָחָה!");
    setFeedbackType("neutral");
  }

  function resetGame() {
    setQuestions(generateQuestions());
    setCurrentIndex(0);
    setQueue(shuffle(TILE_LAYOUT.map((tile) => tile.id)));
    setRemovedTileIds([]);
    setFeedback("בָּרוּךְ הַבָּא לַמִּשְׂחָק!");
    setFeedbackType("neutral");
    setLocked(false);
    setGameState("start");
  }

  function handleAnswer(value: number) {
    if (!currentQuestion || locked || gameState !== "playing") return;

    if (value === currentQuestion.answer) {
      setLocked(true);
      const tileToRemove = queue[0];

      if (typeof tileToRemove === "number") {
        setRemovedTileIds((prev) => [...prev, tileToRemove]);
        setQueue((prev) => prev.slice(1));
      }

      setFeedback(pickOne(SUCCESS_MESSAGES));
      setFeedbackType("success");

      const nextIndex = currentIndex + 1;
      window.setTimeout(() => {
        if (nextIndex < questions.length) {
          setCurrentIndex(nextIndex);
          setFeedback("יוֹפִי, מַמְשִׁיכִים!");
          setFeedbackType("neutral");
        }
        setLocked(false);
      }, 700);
    } else {
      setFeedback(pickOne(ERROR_MESSAGES));
      setFeedbackType("error");
    }
  }

  return (
    <div className="app-shell" dir="rtl">
      <div className="page">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
        >
          {(gameState === "start" || gameState === "won") && <ConfettiDots />}

          <div className="top-bar">
            <div>
              <div className="pill">
                <Sparkles size={16} />
                {APP_NAME}
              </div>
              <h1>מִשְׂחַק חֶשְׁבּוֹן</h1>
              <p className="subtitle">עוֹנִים נָכוֹן וּמְגַלִּים אֶת הַתְּמוּנָה.</p>
            </div>

            <button onClick={resetGame} className="reset-button">
              <RefreshCw size={16} />
              הַתְחֵל מֵחָדָשׁ
            </button>
          </div>

          <div className="layout">
            <div className="image-panel">
              <div className="image-frame">
                <img src={IMAGE_SRC} alt={IMAGE_ALT} className="main-image" />
                <AnimatePresence>
                  {visibleTiles.map((tile) => (
                    <Tile key={tile.id} tile={tile} />
                  ))}
                </AnimatePresence>
              </div>

              <div className="progress-card">
                <div className="progress-row">
                  <span>כַּמָּה גִּלִּינוּ</span>
                  <span>
                    {solvedCount} / {TOTAL_QUESTIONS}
                  </span>
                </div>
                <div className="progress-track">
                  <motion.div
                    className="progress-fill"
                    animate={{ width: `${progress}%` }}
                  />
                </div>
                <p className="progress-text">כָּל תְּשׁוּבָה נְכוֹנָה מְגַלָּה עוֹד חֵלֶק.</p>
              </div>
            </div>

            <div className="game-panel">
              {gameState === "start" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="center-screen"
                >
                  <div className="icon-badge start-badge">
                    <Play size={48} />
                  </div>
                  <h2>מוּכָנִים לְשַׂחֵק?</h2>
                  <p className="big-copy">
                    פּוֹתְרִים תַּרְגִּילִים פְּשׁוּטִים.
                    <br />
                    כָּל תְּשׁוּבָה נְכוֹנָה מְגַלָּה עוֹד חֵלֶק בַּתְּמוּנָה.
                  </p>
                  <button onClick={startGame} className="cta-button">
                    <Play size={24} />
                    בּוֹאוּ נַתְחִיל
                  </button>
                </motion.div>
              )}

              {gameState === "playing" && currentQuestion && (
                <>
                  <div>
                    <div className="question-meta">
                      <span>
                        שאלה {currentIndex + 1} מתוך {TOTAL_QUESTIONS}
                      </span>
                      <span>{progress}% גילוי</span>
                    </div>

                    <motion.div
                      key={currentQuestion.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="question-card"
                    >
                      <div className="question-label">מָה הַתְּשׁוּבָה?</div>
                      <div
                        className="question-text"
                        style={{ direction: "ltr", unicodeBidi: "plaintext" }}
                      >
                        {currentQuestion.prompt}
                      </div>
                    </motion.div>

                    <div className="answers-grid">
                      {currentQuestion.choices.map((choice) => (
                        <AnswerButton
                          key={`${currentQuestion.id}-${choice}`}
                          value={choice}
                          onClick={handleAnswer}
                          disabled={locked}
                        />
                      ))}
                    </div>
                  </div>

                  <motion.div
                    key={`${feedback}-${feedbackType}`}
                    initial={{ scale: 0.96, opacity: 0.7 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`feedback-box feedback-${feedbackType}`}
                  >
                    <div className="feedback-inner">
                      {feedbackType === "success" && <Star size={20} />}
                      <span>{feedback}</span>
                    </div>
                  </motion.div>
                </>
              )}

              {gameState === "won" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="center-screen"
                >
                  <div className="icon-badge win-badge">
                    <Trophy size={48} />
                  </div>
                  <h2>כָּל הַכָּבוֹד!</h2>
                  <p className="big-copy">
                    גִּלִּיתָ אֶת כָּל הַתְּמוּנָה!
                    <br />
                    הִצְלַחְתָּ בַּמִּשְׂחָק!
                  </p>
                  <button onClick={resetGame} className="win-button">
                    <RefreshCw size={24} />
                    עוֹד פַּעַם
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

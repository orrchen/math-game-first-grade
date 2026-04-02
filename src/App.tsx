import { AnimatePresence, motion } from "framer-motion";
import { Home, Play, RefreshCw, Sparkles, Star, Trophy, Video } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

const APP_NAME = "בַּלָּשֵׁי הַבִּיּוּב";
const IMAGE_ALT = APP_NAME;
const IMAGE_SRC = "/image.png";
const TOTAL_QUESTIONS = 15;
const GRID_COLS = 5;
const GRID_ROWS = 3;

type GameState = "start" | "playing" | "won";
type Screen = "menu" | "math-game" | "video-page";
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

type TileProps = {
  tile: TileData;
};

type AnswerButtonProps = {
  value: number;
  onClick: (value: number) => void;
  disabled: boolean;
};

const TILE_LAYOUT: TileData[] = Array.from({ length: TOTAL_QUESTIONS }, (_, index) => {
  const col = index % GRID_COLS;
  const row = Math.floor(index / GRID_COLS);
  const w = 100 / GRID_COLS;
  const h = 100 / GRID_ROWS;

  return {
    id: index + 1,
    x: col * w,
    y: row * h,
    w,
    h,
  };
});

const SUCCESS_MESSAGES = [
  "🎉 כָּל הַכָּבוֹד!",
  "🌟 נכון מאוד!",
  "😊 יופי!",
  "👏 הצלחת!",
  "💙 תשובה נכונה!",
  "⭐ אלוף!",
];

const ERROR_MESSAGES = [
  "כמעט, נסה שוב 😊",
  "לא נורא, ננסה שוב",
  "עוד פעם אחת 💪",
  "אתה יכול!",
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
  const answer = a + b;

  return {
    id,
    prompt: `${a} + ${b} = ?`,
    answer,
    choices: createChoices(answer),
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
  const total = answer + second;

  return {
    id,
    prompt: `? + ${second} = ${total}`,
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

function Tile({ tile }: TileProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.35 }}
      className="absolute flex items-center justify-center border border-amber-900 bg-gradient-to-br from-amber-700 to-yellow-600 text-3xl font-black text-white shadow"
      style={{
        left: `${tile.x}%`,
        top: `${tile.y}%`,
        width: `${tile.w}%`,
        height: `${tile.h}%`,
      }}
    >
      <span className="rounded-full bg-black/20 px-3 py-1">{tile.id}</span>
    </motion.div>
  );
}

function AnswerButton({ value, onClick, disabled }: AnswerButtonProps) {
  return (
    <button
      onClick={() => onClick(value)}
      disabled={disabled}
      className="rounded-3xl border-2 border-amber-400 bg-white px-5 py-5 text-4xl font-black text-slate-800 shadow-md transition hover:scale-105 hover:bg-amber-50 disabled:pointer-events-none disabled:opacity-70"
    >
      {value}
    </button>
  );
}

function ConfettiDots() {
  const dots = Array.from({ length: 20 }, (_, i) => i);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {dots.map((dot) => (
        <motion.div
          key={dot}
          initial={{ y: -20, opacity: 0, x: `${5 + dot * 4}%` }}
          animate={{ y: "110%", opacity: [0, 1, 1, 0], rotate: 360 }}
          transition={{ duration: 2.8, delay: dot * 0.06, repeat: Infinity, repeatDelay: 1.2 }}
          className="absolute top-0 h-3 w-3 rounded-full bg-yellow-400"
        />
      ))}
    </div>
  );
}

function MathGameScreen() {
  const [gameState, setGameState] = useState<GameState>("start");
  const [questions, setQuestions] = useState<Question[]>(() => generateQuestions());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [queue, setQueue] = useState<number[]>(() => shuffle(TILE_LAYOUT.map((tile) => tile.id)));
  const [removedTileIds, setRemovedTileIds] = useState<number[]>([]);
  const [feedback, setFeedback] = useState("בָּרוּךְ הַבָּא לְבַלָּשֵׁי הַבִּיּוּב!");
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("neutral");
  const [locked, setLocked] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

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
    <div dir="rtl" className="min-h-screen bg-[radial-gradient(circle_at_top,#d9f99d_0%,#bae6fd_35%,#ecfccb_100%)] p-4 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[32px] bg-white/80 p-4 shadow-2xl ring-1 ring-white/70 backdrop-blur sm:p-6"
        >
          {(gameState === "start" || gameState === "won") && <ConfettiDots />}

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
                <Sparkles className="h-4 w-4" />
                {APP_NAME}
              </div>
              <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">מִשְׂחַק חֶשְׁבּוֹן</h1>
              <p className="mt-1 text-base font-semibold text-slate-600 sm:text-lg">
                עוֹנִים נָכוֹן וּמְגַלִּים אֶת הַתְּמוּנָה.
              </p>
            </div>

            <button
              onClick={resetGame}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 font-bold text-white shadow-lg transition hover:scale-105 hover:bg-amber-600"
            >
              <RefreshCw className="h-4 w-4" />
              הַתְחֵל מֵחָדָשׁ
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="rounded-[28px] bg-slate-50 p-4 shadow-inner">
              <div className="relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-[24px] border-4 border-amber-200 bg-slate-200 shadow-inner">
                {!imageFailed ? (
                  <img
                    src={IMAGE_SRC}
                    alt={IMAGE_ALT}
                    className="h-full w-full object-cover"
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-700 via-cyan-700 to-slate-800 p-6 text-center text-white">
                    <div>
                      <div className="text-2xl font-black">אין תמונה כרגע</div>
                      <div className="mt-2 text-sm font-semibold opacity-90">
                        אפשר לשחק גם בלי התמונה.
                      </div>
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {visibleTiles.map((tile) => (
                    <Tile key={tile.id} tile={tile} />
                  ))}
                </AnimatePresence>
              </div>

              <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-700">
                  <span>כַּמָּה גִּלִּינוּ</span>
                  <span>
                    {solvedCount} / {TOTAL_QUESTIONS}
                  </span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500"
                    animate={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-3 text-center text-sm font-semibold text-slate-600">
                  כָּל תְּשׁוּבָה נְכוֹנָה מְגַלָּה עוֹד חֵלֶק.
                </p>
              </div>
            </div>

            <div className="flex min-h-[520px] flex-col justify-between rounded-[28px] bg-gradient-to-b from-white to-sky-50 p-5 shadow-inner">
              {gameState === "start" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex h-full flex-col items-center justify-center text-center"
                >
                  <div className="mb-4 rounded-full bg-cyan-100 p-5 text-cyan-700 shadow-md">
                    <Play className="h-12 w-12" />
                  </div>
                  <h2 className="text-4xl font-black text-slate-900">מוּכָנִים לְשַׂחֵק?</h2>
                  <p className="mt-4 max-w-md text-xl font-semibold leading-9 text-slate-700">
                    פּוֹתְרִים תַּרְגִּילִים פְּשׁוּטִים.
                    <br />
                    כָּל תְּשׁוּבָה נְכוֹנָה מְגַלָּה עוֹד חֵלֶק בַּתְּמוּנָה.
                  </p>
                  <button
                    onClick={startGame}
                    className="mt-8 inline-flex items-center gap-3 rounded-3xl bg-cyan-500 px-8 py-4 text-2xl font-black text-white shadow-xl transition hover:scale-105 hover:bg-cyan-600"
                  >
                    <Play className="h-6 w-6" />
                    בּוֹאוּ נַתְחִיל
                  </button>
                </motion.div>
              )}

              {gameState === "playing" && currentQuestion && (
                <>
                  <div>
                    <div className="mb-4 flex items-center justify-between rounded-2xl bg-amber-100 px-4 py-3 text-sm font-bold text-amber-800">
                      <span>
                        שאלה {currentIndex + 1} מתוך {TOTAL_QUESTIONS}
                      </span>
                      <span>{progress}% גילוי</span>
                    </div>

                    <motion.div
                      key={currentQuestion.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-[30px] bg-gradient-to-br from-sky-500 to-cyan-600 p-6 text-center text-white shadow-xl"
                    >
                      <div className="mb-3 text-lg font-bold opacity-90">מָה הַתְּשׁוּבָה?</div>
                      <div
                        className="text-6xl font-black tracking-wide sm:text-7xl"
                        style={{ direction: "ltr", unicodeBidi: "plaintext" }}
                      >
                        {currentQuestion.prompt}
                      </div>
                    </motion.div>

                    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                    className={`mt-6 rounded-2xl p-4 text-center text-xl font-black shadow-md ${feedbackType === "success"
                        ? "bg-emerald-100 text-emerald-700"
                        : feedbackType === "error"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {feedbackType === "success" && <Star className="h-5 w-5" />}
                      <span>{feedback}</span>
                    </div>
                  </motion.div>
                </>
              )}

              {gameState === "won" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex h-full flex-col items-center justify-center text-center"
                >
                  <div className="mb-4 rounded-full bg-yellow-100 p-5 text-yellow-700 shadow-md">
                    <Trophy className="h-12 w-12" />
                  </div>
                  <h2 className="text-5xl font-black text-slate-900">כָּל הַכָּבוֹד!</h2>
                  <p className="mt-4 max-w-md text-2xl font-bold leading-10 text-slate-700">
                    גִּלִּיתָ אֶת כָּל הַתְּמוּנָה!
                    <br />
                    הִצְלַחְתָּ בַּמִּשְׂחָק!
                  </p>
                  <button
                    onClick={resetGame}
                    className="mt-8 inline-flex items-center gap-2 rounded-3xl bg-emerald-500 px-8 py-4 text-2xl font-black text-white shadow-xl transition hover:scale-105 hover:bg-emerald-600"
                  >
                    <RefreshCw className="h-6 w-6" />
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

function MenuCard({
  title,
  subtitle,
  icon,
  onClick,
  accentClass,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
  accentClass: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full flex-col items-center rounded-[32px] border-4 border-white/70 p-8 text-center shadow-xl transition hover:scale-[1.02] ${accentClass}`}
    >
      <div className="mb-5 rounded-full bg-white/80 p-5 text-slate-800 shadow-md">{icon}</div>
      <div className="text-3xl font-black text-slate-900">{title}</div>
      <div className="mt-3 text-lg font-semibold leading-8 text-slate-700">{subtitle}</div>
      <div className="mt-6 rounded-full bg-white px-5 py-2 text-base font-black text-slate-800 shadow-sm">
        לִלְחוֹץ כָּאן
      </div>
    </button>
  );
}

function VideoPage({ onBack }: { onBack: () => void }) {
  const [videoKey, setVideoKey] = useState(0);

  function replay() {
    setVideoKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fde68a_0%,#bfdbfe_35%,#d9f99d_100%)] p-4 text-slate-800">
      <div className="mx-auto max-w-6xl rounded-[32px] bg-white/85 p-4 shadow-2xl ring-1 ring-white/70 backdrop-blur sm:p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-sm font-bold text-violet-800">
              <Video className="h-4 w-4" />
              {APP_NAME}
            </div>
            <h1 className="text-3xl font-black text-slate-900 sm:text-4xl">בַּלָּשֵׁי הַבִּיּוּב</h1>
            <p className="mt-1 text-base font-semibold text-slate-600 sm:text-lg">
              צְפוּ בַּסִּרְטוֹן וּתָמִיד אֶפְשָׁר לְהַפְעִיל מֵחָדָשׁ.
            </p>
          </div>

          <button
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 py-3 font-bold text-white shadow-lg transition hover:scale-105 hover:bg-violet-600"
          >
            <Home className="h-4 w-4" />
            חֲזֹר לַתַּפְרִיט
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="overflow-hidden rounded-[28px] bg-slate-100 shadow-inner">
            <div className="aspect-video w-full bg-slate-900">
              <iframe
                key={videoKey}
                className="h-full w-full"
                src="https://www.youtube.com/embed/YxiME0yM55M"
                title="סרטון"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>

            <div className="flex justify-center p-4">
              <button
                onClick={replay}
                className="inline-flex items-center gap-2 rounded-2xl bg-violet-500 px-6 py-3 text-lg font-black text-white shadow-lg transition hover:scale-105 hover:bg-violet-600"
              >
                <RefreshCw className="h-5 w-5" />
                נַגֵּן שׁוּב
              </button>
            </div>
          </div>

          <div className="flex rounded-[28px] bg-gradient-to-b from-white to-violet-50 p-6 shadow-inner">
            <div className="m-auto text-center">
              <div className="mb-4 inline-flex rounded-full bg-violet-100 p-5 text-violet-700 shadow-md">
                <Video className="h-12 w-12" />
              </div>
              <h2 className="text-4xl font-black text-slate-900">מָה יִהְיֶה כָּאן?</h2>
              <p className="mt-4 max-w-md text-xl font-semibold leading-9 text-slate-700">
                לַחַץ עַל "נַגֵּן שׁוּב" כְּדֵי לְהַתְחִיל אֶת הַסִּרְטוֹן מֵהַתְּחָלָה.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BlsheyHabiyuvApp() {
  const [screen, setScreen] = useState<Screen>("menu");

  if (screen === "math-game") {
    return (
      <div dir="rtl">
        <MathGameScreen />
        <button
          onClick={() => setScreen("menu")}
          className="fixed bottom-4 right-4 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-xl transition hover:scale-105"
        >
          <Home className="h-4 w-4" />
          חֲזֹר לַתַּפְרִיט
        </button>
      </div>
    );
  }

  if (screen === "video-page") {
    return (
      <div dir="rtl">
        <VideoPage onBack={() => setScreen("menu")} />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[radial-gradient(circle_at_top,#d9f99d_0%,#bae6fd_35%,#ecfccb_100%)] p-4 text-slate-800">
      <div className="mx-auto flex min-h-[100vh] max-w-6xl items-center">
        <div className="w-full rounded-[32px] bg-white/85 p-4 shadow-2xl ring-1 ring-white/70 backdrop-blur sm:p-6">
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-800">
              <Sparkles className="h-4 w-4" />
              {APP_NAME}
            </div>
            <h1 className="text-4xl font-black text-slate-900 sm:text-5xl">בַּחֲרוּ מָה לִפְתּוֹחַ</h1>
            <p className="mt-3 text-lg font-semibold text-slate-600 sm:text-xl">
              יֵשׁ כָּאן מִשְׂחַק חֶשְׁבּוֹן וְגַם עַמּוּד חָדָשׁ עִם סִרְטוֹן.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <MenuCard
              title="מִשְׂחַק חֶשְׁבּוֹן"
              subtitle="פּוֹתְרִים תַּרְגִּילִים וּמְגַלִּים אֶת הַתְּמוּנָה."
              icon={<Play className="h-12 w-12" />}
              onClick={() => setScreen("math-game")}
              accentClass="bg-gradient-to-br from-cyan-100 to-sky-50"
            />
            <MenuCard
              title="עַמּוּד סִרְטוֹן"
              subtitle="נִכְנָסִים לְעַמּוּד חָדָשׁ שֶׁיֵּשׁ בּוֹ סִרְטוֹן."
              icon={<Video className="h-12 w-12" />}
              onClick={() => setScreen("video-page")}
              accentClass="bg-gradient-to-br from-violet-100 to-fuchsia-50"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

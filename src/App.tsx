/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Users, 
  Home, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Eye, 
  HelpCircle, 
  RotateCcw, 
  Settings,
  Star,
  Coins,
  BookOpen,
  Loader2,
  Sparkles
} from 'lucide-react';
import { PREMIOS, COLORS, BORDER_COLORS, TEXT_COLORS, SUBJECTS, Subject, Question } from './constants';
import { QUESTIONS } from './questions';
import { generateQuestions } from './services/geminiService';

type Mode = 'casa' | 'clase';
type GameState = 'setup' | 'playing' | 'finished' | 'loading';

interface Team {
  id: number;
  name: string;
  level: number;
  color: string;
  borderColor: string;
  textColor: string;
  lastUpdate?: number;
}

const BackgroundShapes = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
    <div className="absolute top-10 left-10 text-6xl opacity-10 rotate-12">📐</div>
    <div className="absolute top-1/4 right-20 text-6xl opacity-10 -rotate-12">✏️</div>
    <div className="absolute bottom-20 left-1/4 text-6xl opacity-10 rotate-45">🧮</div>
    <div className="absolute bottom-1/3 right-1/4 text-6xl opacity-10 -rotate-45">⭐</div>
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-100/20 rounded-full blur-3xl" />
    <div className="absolute -top-20 -right-20 w-64 h-64 bg-sky-100/30 rounded-full blur-2xl" />
    <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-emerald-100/30 rounded-full blur-2xl" />
  </div>
);

export default function App() {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [mode, setMode] = useState<Mode>('clase');
  const [subject, setSubject] = useState<Subject>('matematiques');
  const [customTopic, setCustomTopic] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [gameQuestions, setGameQuestions] = useState<Question[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [history, setHistory] = useState<Team[][]>([]);
  const [floatingMessages, setFloatingMessages] = useState<{ id: number, text: string, teamId: number }[]>([]);

  // Setup state
  const [setupNames, setSetupNames] = useState<string[]>(['', '', '', '']);
  const [setupNameCasa, setSetupNameCasa] = useState('');

  const [lastCorrectLevel, setLastCorrectLevel] = useState(-1);

  // Get current question
  const currentQuestion = useMemo(() => {
    if (gameQuestions.length === 0) return null;
    return gameQuestions[currentQuestionIndex] || null;
  }, [gameQuestions, currentQuestionIndex]);

  // Initialize game
  const startGame = async () => {
    setGameState('loading');
    setLastCorrectLevel(-1);
    
    let initialTeams: Team[] = [];
    if (mode === 'clase') {
      initialTeams = setupNames.map((name, i) => ({
        id: i,
        name: name.trim() || `Equip ${i + 1}`,
        level: -1, // -1 means they haven't won the 100 level yet
        color: COLORS[i],
        borderColor: BORDER_COLORS[i],
        textColor: TEXT_COLORS[i]
      }));
    } else {
      initialTeams = [{
        id: 0,
        name: setupNameCasa.trim() || 'Jugador',
        level: -1,
        color: COLORS[1],
        borderColor: BORDER_COLORS[1],
        textColor: TEXT_COLORS[1]
      }];
    }
    setTeams(initialTeams);
    
    // Pick questions
    let selected: Question[] = [];
    if (subject === 'matematiques') {
      // Shuffle and pick 15 from the static file
      selected = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 15);
    } else {
      // Generate with AI
      try {
        selected = await generateQuestions(subject, customTopic);
        if (selected.length === 0) {
          // Fallback if AI fails
          alert("No hem pogut generar les preguntes. Prova de nou.");
          setGameState('setup');
          return;
        }
      } catch (error) {
        console.error(error);
        alert("Error de connexió amb la IA.");
        setGameState('setup');
        return;
      }
    }
    
    setGameQuestions(selected);
    setCurrentQuestionIndex(0);
    setGameState('playing');
    setHistory([]);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < gameQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowAnswer(false);
      setShowSteps(false);
      setUserInput('');
      setSelectedOption(null);
      setFeedback(null);
      setSelectedTeams([]);
    } else {
      // If no more questions, finish game
      setGameState('finished');
    }
  };

  const addFloatingMessage = (teamId: number) => {
    const id = Date.now() + Math.random();
    setFloatingMessages(prev => [...prev, { id, text: 'Nivell amunt! ⭐💰', teamId }]);
    setTimeout(() => {
      setFloatingMessages(prev => prev.filter(m => m.id !== id));
    }, 2000);
  };

  const updateLevels = (teamIds: number[]) => {
    setHistory(prev => [...prev, [...teams]]);
    const newTeams = teams.map(t => {
      if (teamIds.includes(t.id)) {
        addFloatingMessage(t.id);
        const newLevel = t.level + 1;
        setLastCorrectLevel(prev => Math.max(prev, newLevel));
        return { ...t, level: newLevel, lastUpdate: Date.now() };
      }
      return t;
    });
    setTeams(newTeams);

    // Check for winner
    if (newTeams.some(t => t.level === PREMIOS.length - 1)) {
      setGameState('finished');
    }
  };

  const undoLastAdjudication = () => {
    if (history.length > 0) {
      const lastState = history[history.length - 1];
      setTeams(lastState);
      setHistory(prev => prev.slice(0, -1));
    }
  };

  const validateCasa = (option?: string) => {
    if (!currentQuestion) return;
    
    const normalize = (val: string) => val.trim().toLowerCase().replace(',', '.');
    const input = normalize(option || userInput);
    const answer = normalize(currentQuestion.respuesta);

    const parseValue = (val: string): number | null => {
      if (val.includes('/')) {
        const [num, den] = val.split('/').map(Number);
        if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
      }
      const n = Number(val);
      return isNaN(n) ? null : n;
    };

    const inputVal = parseValue(input);
    const answerVal = parseValue(answer);

    // If both are numbers (or fractions), compare with small epsilon
    let isCorrect = false;
    if (inputVal !== null && answerVal !== null) {
      isCorrect = Math.abs(inputVal - answerVal) < 0.0001;
    } else {
      // Fallback to string comparison for non-numeric answers if any
      isCorrect = input === answer;
    }

    if (isCorrect) {
      setFeedback({ type: 'success', msg: 'Correcte! 🌟' });
      updateLevels([0]);
    } else {
      setFeedback({ type: 'error', msg: `Oh no! La resposta era: ${currentQuestion.respuesta}` });
    }
  };

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => b.level - a.level);
  }, [teams]);

  if (gameState === 'setup') {
    return (
      <div className="min-h-screen bg-amber-50 font-sans p-4 md:p-8 flex flex-col items-center justify-center relative">
        <BackgroundShapes />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl border-4 border-amber-200 max-w-2xl w-full"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-amber-600 text-center mb-8 flex flex-col items-center gap-2">
            <span className="text-6xl">🧮</span>
            Qui vol ser milionari matemàtic?
          </h1>

          <div className="space-y-8">
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => setMode('casa')}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${mode === 'casa' ? 'bg-amber-500 text-white shadow-lg scale-105' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
              >
                <Home size={24} /> Mode Casa
              </button>
              <button 
                onClick={() => setMode('clase')}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${mode === 'clase' ? 'bg-amber-500 text-white shadow-lg scale-105' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
              >
                <Users size={24} /> Mode Classe
              </button>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                <BookOpen size={20} /> Tria l'assignatura
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {SUBJECTS.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setSubject(sub.id)}
                    className={`p-3 rounded-xl border-2 font-bold transition-all flex flex-col items-center gap-1 ${subject === sub.id ? 'bg-amber-500 text-white border-transparent shadow-md scale-105' : 'bg-white text-slate-600 border-amber-100 hover:bg-amber-50'}`}
                  >
                    <span className="text-2xl">{sub.icon}</span>
                    <span className="text-sm">{sub.label}</span>
                  </button>
                ))}
              </div>
              {subject === 'personalitzat' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                  <input 
                    type="text"
                    placeholder="Sobre quin tema vols les preguntes?"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-amber-400 outline-none"
                  />
                </motion.div>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                <Settings size={20} /> Noms de {mode === 'clase' ? 'equips' : 'jugador'}
              </h2>
              {mode === 'clase' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {setupNames.map((name, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${COLORS[i]}`} />
                      <input 
                        type="text"
                        placeholder={`Equip ${i + 1}`}
                        value={name}
                        onChange={(e) => {
                          const newNames = [...setupNames];
                          newNames[i] = e.target.value;
                          setSetupNames(newNames);
                        }}
                        className="w-full p-3 rounded-xl border-2 border-amber-100 focus:border-amber-400 outline-none transition-colors"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <input 
                  type="text"
                  placeholder="El teu nom"
                  value={setupNameCasa}
                  onChange={(e) => setSetupNameCasa(e.target.value)}
                  className="w-full p-4 rounded-xl border-2 border-amber-100 focus:border-amber-400 outline-none transition-colors"
                />
              )}
            </div>

            <button 
              onClick={startGame}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white text-2xl font-bold rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              Començar joc! 🚀
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'loading') {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-8 text-center relative">
        <BackgroundShapes />
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <Loader2 size={80} className="text-amber-500 animate-spin" />
            <Sparkles size={30} className="text-amber-400 absolute -top-2 -right-2 animate-bounce" />
          </div>
          <h1 className="text-3xl font-bold text-amber-800">Gemini està preparant les preguntes...</h1>
          <p className="text-amber-600 font-medium">Això pot tardar uns segons. Estem creant un joc únic per a tu! ✨</p>
        </motion.div>
      </div>
    );
  }

  if (gameState === 'finished') {
    const winner = sortedTeams[0];
    const isMillionaire = winner.level === PREMIOS.length - 1;
    const hasWonSomething = winner.level >= 0;

    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 text-center relative ${isMillionaire ? 'bg-emerald-50' : 'bg-amber-50'}`}>
        <BackgroundShapes />
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`bg-white p-12 rounded-[3rem] shadow-2xl max-w-2xl w-full border-8 ${isMillionaire ? 'border-emerald-200' : 'border-amber-200'}`}
        >
          {isMillionaire ? (
            <>
              <div className="text-8xl mb-6">🏆</div>
              <h1 className="text-5xl font-black text-emerald-600 mb-4">TENIM MILIONARI!</h1>
              <p className="text-3xl font-bold text-gray-700 mb-8">
                Enhorabona, <span className={winner.textColor}>{winner.name}</span>!
              </p>
              <div className="text-6xl font-black text-amber-500 mb-12">1.000.000 €</div>
            </>
          ) : (
            <>
              <div className="text-8xl mb-6">{hasWonSomething ? '💰' : '😅'}</div>
              <h1 className="text-4xl font-black text-amber-800 mb-4">
                {hasWonSomething ? 'FI DEL JOC!' : 'QUINA LLÀSTIMA!'}
              </h1>
              <p className="text-2xl font-bold text-amber-600 mb-8">
                {mode === 'clase' 
                  ? `L'equip ${winner.name} ha arribat més lluny!` 
                  : `Has fet una bona partida, ${winner.name}!`}
              </p>
              
              <div className="bg-amber-50 p-8 rounded-3xl mb-12 border-4 border-amber-100">
                <p className="text-lg text-amber-700 mb-2 uppercase tracking-widest font-bold">Premi aconseguit</p>
                <div className="text-6xl font-black text-amber-600">
                  {hasWonSomething ? PREMIOS[winner.level].toLocaleString() : 0} €
                </div>
                {hasWonSomething && (
                  <p className="mt-4 text-amber-500 font-bold">
                    Has arribat fins a la pregunta {winner.level + 1}
                  </p>
                )}
              </div>
            </>
          )}
          
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => {
                setGameState('playing');
                setTeams(teams.map(t => ({ ...t, level: -1 })));
                setLastCorrectLevel(-1);
                if (subject === 'matematiques') {
                  setGameQuestions([...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 15));
                  setCurrentQuestionIndex(0);
                  setHistory([]);
                } else {
                  startGame();
                }
              }}
              className={`py-4 px-8 text-white text-xl font-bold rounded-2xl transition-all flex items-center justify-center gap-2 ${isMillionaire ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'}`}
            >
              <RotateCcw size={24} /> Tornar a jugar
            </button>
            <button 
              onClick={() => setGameState('setup')}
              className="py-4 px-8 bg-gray-100 text-gray-600 text-xl font-bold rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <Settings size={24} /> Canviar configuració
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col lg:grid lg:grid-cols-[1fr_380px_280px] overflow-hidden relative">
      <BackgroundShapes />
      {/* Floating Messages Layer */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {floatingMessages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.5 }}
              animate={{ opacity: 1, y: -100, scale: 1.2 }}
              exit={{ opacity: 0 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-xl border-2 border-amber-400 text-amber-600 font-bold text-xl flex items-center gap-2"
            >
              {msg.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Column 1: Question & Controls */}
      <div className="p-4 md:p-6 flex flex-col gap-4 overflow-y-auto border-r border-slate-100">
        <div className="flex justify-between items-center">
          <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 text-slate-500 font-bold flex items-center gap-2">
            <HelpCircle size={18} /> Pregunta {currentQuestionIndex + 1}
          </div>
          <div className="flex gap-2">
            {mode === 'clase' && history.length > 0 && (
              <button 
                onClick={undoLastAdjudication}
                className="bg-white p-2 rounded-full shadow-sm border border-slate-200 text-slate-500 hover:text-rose-500 transition-colors"
                title="Desfer última adjudicació"
              >
                <RotateCcw size={20} />
              </button>
            )}
            <button 
              onClick={() => setGameState('setup')}
              className="bg-white p-2 rounded-full shadow-sm border border-slate-200 text-slate-500 hover:text-amber-500 transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {currentQuestion ? (
          <motion.div 
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-4"
          >
            <div className="text-slate-400 font-bold uppercase tracking-widest text-xs">{currentQuestion.categoria}</div>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-800 max-w-3xl leading-tight">
              {currentQuestion.enunciado}
            </h2>

            {mode === 'clase' && currentQuestion.opciones && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                {currentQuestion.opciones.map((opt, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl border-2 border-slate-100 text-left flex items-center gap-3 shadow-sm">
                    <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-400">
                      {['A', 'B', 'C', 'D'][i]}
                    </span>
                    <span className="text-xl font-bold text-slate-700">{opt}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="w-full max-w-xl space-y-4">
              {mode === 'casa' && !showAnswer && (
                <div className="flex flex-col gap-4">
                  {currentQuestion.opciones ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentQuestion.opciones.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setSelectedOption(opt);
                            validateCasa(opt);
                          }}
                          className="p-4 text-xl font-bold bg-white border-4 border-slate-100 rounded-2xl hover:border-amber-400 hover:bg-amber-50 transition-all text-slate-700 shadow-sm active:scale-95 flex items-center gap-3"
                        >
                          <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm text-slate-400">
                            {['A', 'B', 'C', 'D'][i]}
                          </span>
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Escriu la teua resposta..."
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && validateCasa()}
                        className="flex-1 p-4 text-xl rounded-2xl border-4 border-slate-100 focus:border-amber-400 outline-none transition-all"
                      />
                      <button 
                        onClick={() => validateCasa()}
                        className="px-8 bg-amber-500 text-white font-bold rounded-2xl hover:bg-amber-600 transition-all shadow-md active:scale-95"
                      >
                        Comprovar
                      </button>
                    </div>
                  )}
                  {feedback && (
                    <div className="space-y-2">
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3 rounded-xl font-bold flex items-center justify-center gap-2 ${feedback.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}
                      >
                        {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                        {feedback.msg}
                      </motion.div>
                      {feedback.type === 'error' && (
                        <button 
                          onClick={() => {
                            setShowAnswer(true);
                            setFeedback(null);
                          }}
                          className="w-full py-2 text-slate-500 font-bold hover:text-slate-700 transition-colors underline"
                        >
                          No ho sé, mostrar la resposta i passar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => setShowAnswer(true)}
                  className={`w-full py-4 rounded-2xl font-bold text-xl flex items-center justify-center gap-2 transition-all ${showAnswer ? 'bg-slate-100 text-slate-400 cursor-default' : 'bg-sky-500 text-white hover:bg-sky-600 shadow-md active:scale-95'}`}
                >
                  <Eye size={24} /> {showAnswer ? 'Resposta mostrada' : 'Mostrar resposta'}
                </button>

                {showAnswer && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-50 border-4 border-emerald-200 p-6 rounded-3xl"
                  >
                    <div className="text-emerald-600 font-bold text-sm uppercase mb-1">Resposta correcta</div>
                    <div className="text-4xl font-black text-emerald-700">{currentQuestion.respuesta}</div>
                    
                    <div className="mt-4">
                      <button 
                        onClick={() => setShowSteps(!showSteps)}
                        className="text-emerald-600 font-bold flex items-center gap-1 mx-auto hover:underline"
                      >
                        {showSteps ? 'Ocultar passos' : 'Mostrar passos'}
                      </button>
                      <AnimatePresence>
                        {showSteps && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="mt-4 text-emerald-800 bg-white/50 p-4 rounded-xl text-left italic">
                              {currentQuestion.pasos}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}

                {showAnswer && mode === 'clase' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-3xl shadow-lg border-2 border-slate-100 space-y-4"
                  >
                    <h3 className="text-lg font-bold text-slate-700">Quins equips han encertat?</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {teams.map(team => (
                        <button 
                          key={team.id}
                          onClick={() => {
                            setSelectedTeams(prev => 
                              prev.includes(team.id) ? prev.filter(id => id !== team.id) : [...prev, team.id]
                            );
                          }}
                          className={`p-3 rounded-xl font-bold border-2 transition-all flex items-center justify-between ${selectedTeams.includes(team.id) ? `${team.color} text-white border-transparent scale-105 shadow-md` : `bg-white ${team.textColor} ${team.borderColor} hover:bg-slate-50`}`}
                        >
                          {team.name}
                          {selectedTeams.includes(team.id) && <CheckCircle2 size={18} />}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          updateLevels([]);
                          handleNextQuestion();
                        }}
                        className="flex-1 py-3 bg-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-300 transition-all"
                      >
                        Cap
                      </button>
                      <button 
                        onClick={() => {
                          updateLevels(selectedTeams);
                          handleNextQuestion();
                        }}
                        className="flex-[2] py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-md"
                      >
                        Confirmar i Següent
                      </button>
                    </div>
                  </motion.div>
                )}

                {(mode === 'casa' && (feedback?.type === 'success' || showAnswer)) && (
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => {
                        if (feedback?.type === 'error' && mode === 'casa') {
                          setGameState('finished');
                        } else {
                          handleNextQuestion();
                        }
                      }}
                      className={`w-full py-4 text-white text-xl font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 ${
                        (feedback?.type === 'error' && mode === 'casa') 
                          ? 'bg-rose-500 hover:bg-rose-600' 
                          : 'bg-emerald-500 hover:bg-emerald-600'
                      }`}
                    >
                      {(feedback?.type === 'error' && mode === 'casa') ? 'Finalitzar joc' : 'Següent pregunta'} <ChevronRight size={24} />
                    </button>
                    {feedback?.type === 'success' && (
                      <button 
                        onClick={() => setGameState('finished')}
                        className="text-slate-400 font-bold hover:text-slate-600 transition-colors"
                      >
                        M'ho quede (Plantar-se)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            Carregant preguntes...
          </div>
        )}
      </div>

      {/* Column 2: Classification */}
      <div className="p-4 md:p-6 flex flex-col gap-4 overflow-y-auto border-r border-slate-100 bg-white/40">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Trophy className="text-amber-500" /> Classificació
        </h3>
        <div className="space-y-3">
          {sortedTeams.map((team, index) => (
            <motion.div 
              key={team.id}
              layout
              className={`p-4 rounded-2xl border-2 ${team.borderColor} bg-white shadow-sm relative overflow-hidden`}
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-slate-100 text-slate-500 w-6 h-6 rounded-full flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className={`font-bold ${team.textColor}`}>{team.name}</span>
                </div>
                <span className="font-black text-slate-700">
                  {team.level >= 0 ? PREMIOS[team.level].toLocaleString() : 0} €
                </span>
              </div>
              
              {/* Coin Progress Line */}
              <div className="flex gap-1 flex-wrap">
                {PREMIOS.map((_, i) => (
                  <div 
                    key={i} 
                    className={`text-lg transition-all duration-500 ${i <= team.level ? 'grayscale-0 scale-110' : 'grayscale opacity-20'}`}
                    title={`${PREMIOS[i]} €`}
                  >
                    💰
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Column 3: Prize Ladder */}
      <div className="p-4 md:p-6 flex flex-col gap-4 overflow-y-auto bg-white">
        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Star className="text-amber-500" /> Escala
        </h3>
        <div className="flex flex-col-reverse gap-1">
          {PREMIOS.map((premio, i) => {
            const teamsAtThisLevel = teams.filter(t => t.level === i);
            const isCurrentLevel = teams.some(t => t.level === i);
            
            return (
              <div 
                key={i}
                className={`relative flex items-center p-1.5 rounded-xl border-2 transition-all ${isCurrentLevel ? 'bg-amber-50 border-amber-200 shadow-sm' : 'border-transparent'}`}
              >
                <div className={`w-7 text-[10px] font-bold ${isCurrentLevel ? 'text-amber-600' : 'text-slate-300'}`}>
                  {i + 1}
                </div>
                <div className={`flex-1 font-black leading-none ${isCurrentLevel ? 'text-amber-700 text-base' : 'text-slate-400 text-sm'}`}>
                  {premio.toLocaleString()} €
                </div>
                
                {/* Team Markers on Ladder */}
                <div className="flex -space-x-2">
                  {teamsAtThisLevel.map(team => (
                    <motion.div 
                      key={team.id}
                      layoutId={`team-marker-${team.id}`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`w-7 h-7 rounded-full ${team.color} border-2 border-white shadow-md flex items-center justify-center text-white font-black text-[10px] z-10`}
                      title={team.name}
                    >
                      {team.name[0].toUpperCase()}
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="p-1 text-center text-slate-300 font-bold text-[10px] uppercase tracking-widest">
            Eixida
          </div>
        </div>
      </div>
    </div>
  );
}

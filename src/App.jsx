import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Trophy, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { videos } from './data/videos';
import './index.css';

const App = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  
  const videoRef = useRef(null);
  const currentVideo = videos[currentIndex];

  const startVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = currentVideo.startTime;
      videoRef.current.play();
      setIsPlaying(true);
      setShowQuiz(false);
      setHasAnswered(false);
      setSelectedOption(null);
    }
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    setShowQuiz(true);
  };

  const handleOptionClick = (option) => {
    if (hasAnswered) return;
    
    setSelectedOption(option);
    setHasAnswered(true);
    
    if (option.isCorrect) {
      setScore(prev => prev + 10);
    }
  };

  const nextVideo = () => {
    const nextIdx = (currentIndex + 1) % videos.length;
    setCurrentIndex(nextIdx);
    setShowQuiz(false);
    setHasAnswered(false);
    setSelectedOption(null);
    // Auto start next video
    setTimeout(() => {
      setIsPlaying(true);
    }, 100);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const checkTime = () => {
      if (video.currentTime >= currentVideo.endTime) {
        video.pause();
        handleVideoEnd();
      }
    };

    video.addEventListener('timeupdate', checkTime);
    return () => video.removeEventListener('timeupdate', checkTime);
  }, [currentIndex, currentVideo.endTime]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Play className="text-white fill-white" size={20} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Voscreen <span className="text-indigo-400">Türkçe</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="score-badge flex items-center gap-2">
            <Trophy size={18} />
            <span>{score} Puan</span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-4xl relative">
        {/* Video Stage */}
        <div className="video-container glass-card mb-8">
          <video
            ref={videoRef}
            src={currentVideo.url}
            onEnded={handleVideoEnd}
            playsInline
          />
          
          {!isPlaying && !showQuiz && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={startVideo}
                className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-indigo-500/50"
              >
                <Play fill="white" size={32} />
              </motion.button>
            </div>
          )}

          {isPlaying && (
            <div className="status-indicator">
              <span className="px-3 py-1 bg-red-500/80 rounded-full text-xs font-bold animate-pulse">İZLENİYOR</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/10 h-1.5 rounded-full mb-8 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${((currentIndex + 1) / videos.length) * 100}%` }}
            className="h-full bg-indigo-500"
          />
        </div>

        {/* Quiz Section */}
        <AnimatePresence mode="wait">
          {showQuiz && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="quiz-container glass-card"
            >
              <div className="text-center mb-4">
                <p className="text-text-muted text-sm uppercase tracking-widest font-semibold mb-2">Çeviriyi Tahmin Et</p>
                <h3 className="text-xl font-medium">Bu cümlede ne denildi?</h3>
              </div>

              <div className="options-grid">
                {currentVideo.options.map((option, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={!hasAnswered ? { scale: 1.02 } : {}}
                    whileTap={!hasAnswered ? { scale: 0.98 } : {}}
                    onClick={() => handleOptionClick(option)}
                    disabled={hasAnswered}
                    className={`btn ${
                      !hasAnswered 
                        ? 'btn-outline' 
                        : option.isCorrect 
                          ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                          : selectedOption === option 
                            ? 'bg-red-500/20 border-red-500/50 text-red-400' 
                            : 'btn-outline opacity-50'
                    }`}
                  >
                    {hasAnswered && option.isCorrect && <CheckCircle2 size={20} />}
                    {hasAnswered && !option.isCorrect && selectedOption === option && <XCircle size={20} />}
                    {option.text}
                  </motion.button>
                ))}
              </div>

              {hasAnswered && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 flex flex-col items-center gap-4"
                >
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 w-full text-center">
                    <p className="text-indigo-400 font-mono text-lg italic">"{currentVideo.script}"</p>
                  </div>
                  
                  <button 
                    onClick={nextVideo}
                    className="btn btn-primary w-full md:w-auto"
                  >
                    Sonraki Video
                    <ArrowRight size={20} />
                  </button>
                </motion.div>
              )}

              {!hasAnswered && (
                <button 
                  onClick={startVideo}
                  className="mt-4 text-text-muted hover:text-white flex items-center gap-2 text-sm transition-colors"
                >
                  <RotateCcw size={16} />
                  Tekrar İzle
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-auto py-6 text-text-muted text-sm text-center">
        <p>© 2026 Voscreen Clone • İngilizce Öğrenme Platformu</p>
      </footer>
    </div>
  );
};

export default App;

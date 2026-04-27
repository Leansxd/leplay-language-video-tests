import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, RotateCcw, Trophy, CheckCircle2, XCircle,
  ArrowRight, Film, Captions, CaptionsOff
} from 'lucide-react';
import videosData from './data/videos.json';
import './index.css';

const App = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | playing | quiz
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [subtitles, setSubtitles] = useState(false); // altyazı kapalı varsayılan

  const timerRef = useRef(null);
  const videos = videosData;
  const currentVideo = videos[currentIndex];
  const duration = Math.ceil(currentVideo.endTime - currentVideo.startTime);

  const getVideoId = (url) => {
    const m = url.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/);
    return m ? m[1] : null;
  };

  const videoId = getVideoId(currentVideo.url);

  // cc_load_policy=1 altyazı açık, 0 kapalı
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&start=${Math.floor(currentVideo.startTime)}&end=${Math.ceil(currentVideo.endTime)}&rel=0&modestbranding=1&iv_load_policy=3&cc_load_policy=${subtitles ? 1 : 0}&hl=en`
    : null;

  const handleStart = () => {
    setPhase('playing');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPhase('quiz'), duration * 1000);
  };

  const handleReplay = () => {
    clearTimeout(timerRef.current);
    setPhase('idle');
    setHasAnswered(false);
    setSelectedOption(null);
    setTimeout(handleStart, 80);
  };

  const handleOptionClick = (option) => {
    if (hasAnswered) return;
    setSelectedOption(option);
    setHasAnswered(true);
    if (option.isCorrect) setScore(p => p + 10);
  };

  const nextVideo = () => {
    clearTimeout(timerRef.current);
    setCurrentIndex(p => (p + 1) % videos.length);
    setPhase('idle');
    setHasAnswered(false);
    setSelectedOption(null);
  };

  const getOptionClass = (option) => {
    if (!hasAnswered) return 'option-btn';
    if (option.isCorrect) return 'option-btn correct';
    if (selectedOption === option) return 'option-btn wrong';
    return 'option-btn dimmed';
  };

  const progress = ((currentIndex + 1) / videos.length) * 100;

  return (
    <div className="app-wrapper">
      {/* ── HEADER ── */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">
            <Film color="white" size={20} />
          </div>
          <h1 className="logo-title">Voscreen <span>Türkçe</span></h1>
        </div>
        <div className="header-right">
          <div className="score-pill">
            <Trophy size={16} />
            {score} Puan
          </div>
          <div className="counter-pill">{currentIndex + 1} / {videos.length}</div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="main">

        {/* VIDEO */}
        <div className="video-wrap">
          {phase === 'playing' && embedUrl && (
            <iframe
              key={`${currentIndex}-${subtitles}`}
              src={embedUrl}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}

          {/* Bekleme */}
          {phase === 'idle' && (
            <div className="overlay overlay-idle">
              <motion.button
                className="play-btn"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={handleStart}
              >
                <Play fill="white" size={36} />
              </motion.button>
              <span className="overlay-label">Başlamak için tıkla</span>
            </div>
          )}

          {/* Quiz kapağı */}
          {phase === 'quiz' && (
            <div className="overlay overlay-quiz">
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                ↓ Soruyu cevapla
              </span>
            </div>
          )}

          {/* Canlı badge */}
          {phase === 'playing' && (
            <div className="live-badge">
              <span style={{ width: 6, height: 6, background: 'white', borderRadius: '50%', display: 'inline-block' }} />
              CANLI
            </div>
          )}
        </div>

        {/* KONTROLLER SATIRI: İlerleme + Altyazı toggle */}
        <div className="controls-row">
          <div className="progress-bar-wrap">
            <motion.div
              className="progress-bar-fill"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <button
            className={`subtitle-toggle${subtitles ? ' active' : ''}`}
            onClick={() => setSubtitles(s => !s)}
            title={subtitles ? 'Altyazıyı Kapat' : 'Altyazıyı Aç'}
          >
            {subtitles ? <Captions size={15} /> : <CaptionsOff size={15} />}
            {subtitles ? 'Altyazı Açık' : 'Altyazı Kapalı'}
          </button>
        </div>

        {/* QUIZ */}
        <AnimatePresence mode="wait">
          {phase === 'quiz' && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
              className="quiz-card"
            >
              <p className="quiz-label">Çeviriyi Tahmin Et</p>
              <h3 className="quiz-question">Bu cümlede ne denildi?</h3>

              <div className="options-grid">
                {currentVideo.options.map((option, idx) => (
                  <motion.button
                    key={idx}
                    className={getOptionClass(option)}
                    onClick={() => handleOptionClick(option)}
                    disabled={hasAnswered}
                    whileHover={!hasAnswered ? { y: -2 } : {}}
                    whileTap={!hasAnswered ? { y: 0 } : {}}
                  >
                    {hasAnswered && option.isCorrect && <CheckCircle2 size={18} style={{ flexShrink: 0 }} />}
                    {hasAnswered && !option.isCorrect && selectedOption === option && <XCircle size={18} style={{ flexShrink: 0 }} />}
                    {option.text}
                  </motion.button>
                ))}
              </div>

              {hasAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="feedback-box">
                    <p className="feedback-label">Orijinal Cümle</p>
                    <p className="feedback-script">"{currentVideo.script}"</p>
                  </div>
                </motion.div>
              )}

              <div className="actions-row">
                <button className="btn-replay" onClick={handleReplay}>
                  <RotateCcw size={15} />
                  Tekrar İzle
                </button>

                {hasAnswered && (
                  <motion.button
                    className="btn-next"
                    onClick={nextVideo}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                  >
                    Sonraki Video
                    <ArrowRight size={18} />
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="footer">
        © 2026 Voscreen Türkçe · İngilizce Öğrenme Platformu
      </footer>
    </div>
  );
};

export default App;

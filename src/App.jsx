import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, RotateCcw, Trophy, CheckCircle2, XCircle,
  ArrowRight, Film, Captions, CaptionsOff
} from 'lucide-react';
import videosData from './data/videos.json';
import './index.css';

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};


function loadYTApi() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) { resolve(window.YT); return; }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
  });
}

const getVideoId = (url) => {
  const m = url.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/);
  return m ? m[1] : null;
};

export default function App() {
  const [videos] = useState(() => shuffle(videosData));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState('idle');
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [subtitles, setSubtitles] = useState(false);

  const ytPlayer = useRef(null);
  const timerRef = useRef(null);
  const phaseRef = useRef('idle');
  const containerRef = useRef(null);

  const currentVideo = videos[currentIndex];
  const videoId = getVideoId(currentVideo.url);


  const setPhaseSync = (p) => {
    phaseRef.current = p;
    setPhase(p);
  };


  const startTimeChecker = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!ytPlayer.current || phaseRef.current !== 'playing') return;
      const t = ytPlayer.current.getCurrentTime();
      if (t >= currentVideo.endTime) {
        clearInterval(timerRef.current);
        ytPlayer.current.pauseVideo();
        setPhaseSync('quiz');
      }
    }, 100);
  }, [currentVideo.endTime]);


  useEffect(() => {
    let cancelled = false;

    loadYTApi().then((YT) => {
      if (cancelled) return;


      if (ytPlayer.current) {
        ytPlayer.current.destroy();
        ytPlayer.current = null;
      }

      ytPlayer.current = new YT.Player('yt-player-container', {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          controls: 0,
          disablekb: 1,
          cc_load_policy: subtitles ? 1 : 0,
          start: Math.floor(currentVideo.startTime),
        },
        events: {
          onReady: (e) => {
            e.target.seekTo(currentVideo.startTime, true);
            e.target.pauseVideo();
          },
          onStateChange: (e) => {
            const YTState = window.YT.PlayerState;

            if (e.data === YTState.PLAYING && phaseRef.current === 'playing') {
              clearInterval(timerRef.current);
              timerRef.current = setInterval(() => {
                if (!ytPlayer.current || phaseRef.current !== 'playing') return;
                const t = ytPlayer.current.getCurrentTime();
                if (t >= currentVideo.endTime) {
                  clearInterval(timerRef.current);
                  ytPlayer.current.pauseVideo();
                  setPhaseSync('quiz');
                }
              }, 100);
            }
            if (e.data === YTState.ENDED && phaseRef.current === 'playing') {
              clearInterval(timerRef.current);
              setPhaseSync('quiz');
            }
          },
          onError: (e) => {
            console.error('YouTube Player Error:', e.data);
            alert('Bu video oynatılamıyor (Embed kısıtlaması olabilir). Lütfen başka bir videoya geçin.');
            nextVideo();
          }
        }
      });
    });

    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
    };
  }, [currentIndex, subtitles]);

  const handleStart = useCallback(() => {
    if (!ytPlayer.current) return;
    ytPlayer.current.seekTo(currentVideo.startTime, true);
    ytPlayer.current.playVideo();
    setPhaseSync('playing');
  }, [currentVideo.startTime]);

  const handleReplay = useCallback(() => {
    clearInterval(timerRef.current);
    setPhaseSync('idle');
    setHasAnswered(false);
    setSelectedOption(null);
    if (ytPlayer.current) {
      ytPlayer.current.seekTo(currentVideo.startTime, true);
      ytPlayer.current.pauseVideo();
    }
  }, [currentVideo.startTime]);

  const handleOptionClick = useCallback((option) => {
    if (hasAnswered) return;
    setSelectedOption(option);
    setHasAnswered(true);
    if (option.isCorrect) setScore(p => p + 10);
  }, [hasAnswered]);

  const nextVideo = useCallback(() => {
    clearInterval(timerRef.current);
    setCurrentIndex(p => (p + 1) % videos.length);
    setPhaseSync('idle');
    setHasAnswered(false);
    setSelectedOption(null);
  }, [videos.length]);

  const getOptionClass = (option) => {
    if (!hasAnswered) return 'option-btn';
    if (option.isCorrect) return 'option-btn correct';
    if (selectedOption === option) return 'option-btn wrong';
    return 'option-btn dimmed';
  };

  const progress = videos.length > 0 ? ((currentIndex + 1) / videos.length) * 100 : 0;

  if (videos.length === 0) {
    return (
      <div className="app-wrapper">
        <header className="header">
          <div className="logo">
            <div className="logo-icon"><Film color="white" size={20} /></div>
            <h1 className="logo-title">Voscreen <span>Türkçe</span></h1>
          </div>
        </header>
        <main className="main" style={{ textAlign: 'center', marginTop: '4rem' }}>
          <div className="quiz-card">
            <h3 style={{ marginBottom: '1rem' }}>Henüz video eklenmemiş!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Başlamak için terminale şu komutu yazarak video ekleyin:
            </p>
            <code style={{
              display: 'block',
              background: '#000',
              padding: '1rem',
              borderRadius: '8px',
              marginTop: '1rem',
              color: '#818cf8',
              fontSize: '0.8rem'
            }}>
              node scripts/processor.js "YOUTUBE_URL"
            </code>
          </div>
        </main>
      </div>
    );
  }
  return (
    <div className="app-wrapper">
      <header className="header">
        <div className="logo">
          <div className="logo-icon"><Film color="white" size={20} /></div>
          <h1 className="logo-title">Learn <span>English</span></h1>
        </div>
        <div className="header-right">
          <div className="level-badge">Seviye: B1</div>
          <div className="score-pill"><Trophy size={16} />{score} Puan</div>
          <div className="counter-pill">{currentIndex + 1} / {videos.length}</div>
        </div>
      </header>

      <main className="main">
        <div className="video-wrap">
          {}
          <div
            id="yt-player-container"
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              opacity: phase === 'quiz' ? 0 : 1,
              transition: 'opacity 0.3s',
            }}
          />

          {}
          {phase === 'quiz' && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 15,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(10px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '24px'
            }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: 'rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1rem',
                border: '1px solid rgba(99,102,241,0.5)',
                boxShadow: '0 0 20px rgba(99,102,241,0.3)'
              }}>
                <CheckCircle2 color="#818cf8" size={28} />
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>Dinleme Tamamlandı</h2>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem' }}>Aşağıdaki şıklardan doğru çeviriyi seçin ↓</span>
            </div>
          )}

          {}
          {phase === 'idle' && (
            <div className="overlay overlay-idle" style={{ zIndex: 20 }}>
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

          {phase === 'playing' && (
            <div className="live-badge">
              <span style={{ width: 6, height: 6, background: 'white', borderRadius: '50%', display: 'inline-block' }} />
              CANLI
            </div>
          )}
        </div>

        {}
        <div className="controls-row">
          <div className="progress-bar-wrap">
            <motion.div className="progress-bar-fill" animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
          </div>
          <button className={`subtitle-toggle${subtitles ? ' active' : ''}`} onClick={() => setSubtitles(s => !s)}>
            {subtitles ? <Captions size={15} /> : <CaptionsOff size={15} />}
            {subtitles ? 'Altyazı Açık' : 'Altyazı Kapalı'}
          </button>
        </div>

        {}
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
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="feedback-box">
                    <p className="feedback-label">Orijinal Cümle</p>
                    <p className="feedback-script">"{currentVideo.script}"</p>
                  </div>
                </motion.div>
              )}

              <div className="actions-row">
                <button className="btn-replay" onClick={handleReplay}>
                  <RotateCcw size={15} /> Tekrar İzle
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
                    Sonraki Video <ArrowRight size={18} />
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      
    </div>
  );
}

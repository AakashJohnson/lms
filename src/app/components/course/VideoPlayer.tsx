import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, FastForward, Rewind, PictureInPicture, Settings, RotateCcw, RotateCw, Keyboard, Eye, EyeOff, Sun, Moon } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  title?: string;
  lastPosition?: number;
  onProgress?: (currentTime: number, duration: number, watchedSeconds: number) => void;
  onComplete?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  autoPlay?: boolean;
  paused?: boolean;
  seekTo?: number | null;
  chapters?: Array<{ time: number; title: string }>;
}

const SPEED_STORAGE_KEY = 'video_playback_speed_preference';
const VOLUME_STORAGE_KEY = 'video_volume_preference';
const DOUBLE_TAP_DELAY = 300;
const PROGRESS_SAVE_INTERVAL = 5000;

export function VideoPlayer({
  src,
  title,
  lastPosition = 0,
  onProgress,
  onComplete,
  onTimeUpdate,
  autoPlay = false,
  paused = false,
  seekTo = null,
  chapters = [],
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasPausedRef = useRef(false);
  const onProgressRef = useRef(onProgress);
  const onCompleteRef = useRef(onComplete);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const watchedSecondsRef = useRef(0);
  const lastIntervalSaveRef = useRef<{ src: string; second: number } | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused && !video.paused) {
      video.pause();
      wasPausedRef.current = true;
    } else if (!paused && wasPausedRef.current && video.paused) {
      video.play();
      wasPausedRef.current = false;
    }
  }, [paused]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || seekTo === null || Number.isNaN(seekTo)) return;
    video.currentTime = Math.max(0, seekTo);
    video.play().catch(() => {});
  }, [seekTo]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [completeFired, setCompleteFired] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [lastTapSide, setLastTapSide] = useState<'left' | 'right' | null>(null);
  const [seekFeedback, setSeekFeedback] = useState<{ side: 'left' | 'right'; count: number; time?: number } | null>(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  const [showLoopControls, setShowLoopControls] = useState(false);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    watchedSecondsRef.current = watchedSeconds;
  }, [watchedSeconds]);

  useEffect(() => {
    const savedSpeed = localStorage.getItem(SPEED_STORAGE_KEY);
    if (savedSpeed) {
      const speed = parseFloat(savedSpeed);
      if (speed >= 0.5 && speed <= 2) {
        setPlaybackRate(speed);
        if (videoRef.current) videoRef.current.playbackRate = speed;
      }
    }
    const savedVolume = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (savedVolume) {
      const vol = parseFloat(savedVolume);
      setVolume(vol);
      if (videoRef.current) videoRef.current.volume = vol;
      setIsMuted(vol === 0);
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setVideoError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setWatchedSeconds(0);
    watchedSecondsRef.current = 0;
    lastIntervalSaveRef.current = null;
    setCompleteFired(false);
    setLoopStart(null);
    setLoopEnd(null);
    setIsLooping(false);

    const onLoaded = () => {
      if (lastPosition > 0 && lastPosition < video.duration - 2) {
        video.currentTime = lastPosition;
      }
      if (autoPlay) {
        video.play().catch(() => {});
      }
    };
    video.addEventListener('loadedmetadata', onLoaded);
    return () => video.removeEventListener('loadedmetadata', onLoaded);
  }, [src, lastPosition, autoPlay]);

  useEffect(() => {
    if (!isPlaying) return;
    saveTimerRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.currentTime <= 0) return;
      const currentSecond = Math.floor(video.currentTime);
      const lastSave = lastIntervalSaveRef.current;
      if (lastSave?.src === src && Math.abs(currentSecond - lastSave.second) < 4) return;
      lastIntervalSaveRef.current = { src, second: currentSecond };
      onProgressRef.current?.(video.currentTime, video.duration, watchedSecondsRef.current);
    }, PROGRESS_SAVE_INTERVAL);
    return () => {
      if (saveTimerRef.current) {
        clearInterval(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [isPlaying, src]);

  useEffect(() => {
    return () => {
      const video = videoRef.current;
      if (video && video.currentTime > 0) {
        onProgressRef.current?.(video.currentTime, video.duration, watchedSecondsRef.current);
      }
    };
  }, [src]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          skip(-10);
          showSeekFeedback('left', 10);
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          skip(10);
          showSeekFeedback('right', 10);
          break;
        case 'arrowup':
          e.preventDefault();
          setVolume(v => Math.min(1, v + 0.1));
          if (videoRef.current) videoRef.current.volume = Math.min(1, video.volume + 0.1);
          break;
        case 'arrowdown':
          e.preventDefault();
          setVolume(v => Math.max(0, v - 0.1));
          if (videoRef.current) videoRef.current.volume = Math.max(0, video.volume - 0.1);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'p':
          e.preventDefault();
          togglePiP();
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          const percent = parseInt(e.key) * 10;
          video.currentTime = (percent / 100) * video.duration;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    onTimeUpdateRef.current?.(video.currentTime);
    if (isPlaying) {
      setWatchedSeconds(prev => {
        const next = prev + 0.25;
        watchedSecondsRef.current = next;
        return next;
      });
    }

    if (isLooping && loopEnd !== null && video.currentTime >= loopEnd) {
      video.currentTime = loopStart || 0;
    }

    if (!completeFired && video.duration > 0 && video.currentTime / video.duration >= 0.9) {
      setCompleteFired(true);
      onProgressRef.current?.(video.currentTime, video.duration, watchedSecondsRef.current);
      onCompleteRef.current?.();
    }
  }, [isPlaying, completeFired, isLooping, loopStart, loopEnd]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setVideoError(null);
    }
  };

  const handleVideoError = () => {
    const video = videoRef.current;
    if (!video) return;
    let errorMsg = 'Failed to load video';
    if (video.error) {
      switch (video.error.code) {
        case 1: errorMsg = 'Video loading aborted'; break;
        case 2: errorMsg = 'Network error'; break;
        case 3: errorMsg = 'Video decoding failed'; break;
        case 4: errorMsg = 'Format not supported'; break;
      }
    }
    setVideoError(errorMsg);
    setIsBuffering(false);
  };

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
        setIsPlaying(true);
      } catch { setIsPlaying(false); }
    } else {
      video.pause();
      setIsPlaying(false);
      onProgressRef.current?.(video.currentTime, video.duration, watchedSecondsRef.current);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.volume = v;
    setVolume(v);
    setIsMuted(v === 0);
    localStorage.setItem(VOLUME_STORAGE_KEY, v.toString());
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    const video = videoRef.current;
    if (!bar || !video) return;
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    video.currentTime = pct * video.duration;
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPip(false);
      } else {
        await video.requestPictureInPicture();
        setIsPip(true);
      }
    } catch (e) {
      console.log('PiP not supported');
    }
  };

  const skip = (secs: number) => {
    if (videoRef.current) videoRef.current.currentTime += secs;
  };

  const changePlaybackSpeed = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      setShowSpeedMenu(false);
      localStorage.setItem(SPEED_STORAGE_KEY, rate.toString());
    }
  };

  const setLoopPoint = (point: 'start' | 'end') => {
    const video = videoRef.current;
    if (!video) return;
    if (point === 'start') {
      setLoopStart(video.currentTime);
      setShowLoopControls(true);
    } else {
      setLoopEnd(video.currentTime);
      if (loopStart !== null) {
        setIsLooping(true);
      }
    }
  };

  const clearLoop = () => {
    setLoopStart(null);
    setLoopEnd(null);
    setIsLooping(false);
    setShowLoopControls(false);
  };

  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const rect = video.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const videoWidth = rect.width;
    const now = Date.now();
    const side = clickX < videoWidth / 2 ? 'left' : 'right';

    if (now - lastTapTime < DOUBLE_TAP_DELAY && lastTapSide === side) {
      e.stopPropagation();
      if (side === 'left') skip(-10);
      else skip(10);
      showSeekFeedback(side, 10);
      setLastTapTime(0);
      setLastTapSide(null);
    } else {
      setLastTapTime(now);
      setLastTapSide(side);
      togglePlay();
    }
  };

  const handleVideoTouch = (e: React.TouchEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const rect = video.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    const touchX = touch.clientX - rect.left;
    const videoWidth = rect.width;
    const now = Date.now();
    const side = touchX < videoWidth / 2 ? 'left' : 'right';

    if (now - lastTapTime < DOUBLE_TAP_DELAY && lastTapSide === side) {
      e.preventDefault();
      if (side === 'left') skip(-10);
      else skip(10);
      showSeekFeedback(side, 10);
      setLastTapTime(0);
      setLastTapSide(null);
    } else {
      setLastTapTime(now);
      setLastTapSide(side);
    }
  };

  const showSeekFeedback = (side: 'left' | 'right', time: number) => {
    if (seekFeedbackTimer.current) clearTimeout(seekFeedbackTimer.current);
    setSeekFeedback({ side, count: 1, time });
    seekFeedbackTimer.current = setTimeout(() => setSeekFeedback(null), 800);
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const goToChapter = (time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time;
    setShowChapters(false);
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const fmtFull = (s: number) => {
    if (!isFinite(s)) return '0:00:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}` : `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? Math.min(100, pct + 10) : 0;

  return (
    <div
      ref={containerRef}
      className="relative bg-black rounded-xl overflow-hidden group select-none"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      style={{ filter: `brightness(${brightness}%) contrast(${contrast}%)` }}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full aspect-video"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onError={handleVideoError}
        onEnded={() => { setIsPlaying(false); onProgressRef.current?.(duration, duration, watchedSecondsRef.current); onCompleteRef.current?.(); }}
        onClick={handleVideoClick}
        onTouchEnd={handleVideoTouch}
        playsInline
        controlsList="nodownload"
        onContextMenu={e => e.preventDefault()}
      />

      {seekFeedback && (
        <div className={`absolute top-1/2 -translate-y-1/2 ${seekFeedback.side === 'left' ? 'left-8' : 'right-8'} pointer-events-none z-30`}>
          <div className="bg-black/80 backdrop-blur-sm rounded-full p-4 animate-bounce">
            {seekFeedback.side === 'left' ? (
              <Rewind className="w-12 h-12 text-white" />
            ) : (
              <FastForward className="w-12 h-12 text-white" />
            )}
          </div>
          <div className="text-white text-center mt-2 font-bold text-lg bg-black/60 rounded-lg px-3 py-1">
            {seekFeedback.side === 'left' ? '-' : '+'}{seekFeedback.time || 10}s
          </div>
        </div>
      )}

      {isBuffering && !videoError && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 pointer-events-none">
          <div className="text-center px-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-white font-bold text-lg mb-2">Video Error</p>
            <p className="text-gray-400 text-sm">{videoError}</p>
          </div>
        </div>
      )}

      <div className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

        {title && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-indigo-600/90 to-purple-600/90 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-full backdrop-blur pointer-events-none flex items-center gap-2 shadow-lg">
            <Play className="w-3 h-3" />
            {title}
          </div>
        )}

        <div className="relative px-4 pb-4 space-y-3">
          <div
            ref={progressRef}
            className="w-full h-2.5 bg-white/20 rounded-full cursor-pointer group/progress hover:h-3.5 transition-all relative"
            onClick={handleSeek}
          >
            <div className="absolute inset-0 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-white/20 rounded-full" style={{ width: `${bufferedPct}%` }} />
            </div>
            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full relative" style={{ width: `${pct}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg ring-2 ring-indigo-500/50 opacity-0 group-hover/progress:opacity-100 transition-opacity scale-75 group-hover/progress:scale-100" />
            </div>
            {chapters.map((ch, i) => (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white/60 rounded-full hover:bg-white hover:scale-150 transition-all cursor-pointer"
                style={{ left: `${(ch.time / duration) * 100}%` }}
                title={ch.title}
                onClick={(e) => { e.stopPropagation(); goToChapter(ch.time); }}
              />
            ))}
            {isLooping && loopStart !== null && (
              <div
                className="absolute top-0 bottom-0 bg-yellow-500/40 rounded-full"
                style={{ left: `${(loopStart / duration) * 100}%`, width: `${((loopEnd! - loopStart) / duration) * 100}%` }}
              />
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={togglePlay} className="text-white hover:text-indigo-400 transition-colors p-2 rounded-full hover:bg-white/10">
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>

            <div className="flex items-center gap-1">
              <button onClick={() => skip(-10)} className="text-white/80 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10 flex items-center gap-0.5" title="Back 10s">
                <Rewind className="w-4 h-4" />
                <span className="text-[9px] font-bold hidden sm:inline">10</span>
              </button>
              <button onClick={() => skip(10)} className="text-white/80 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10 flex items-center gap-0.5" title="Forward 10s">
                <FastForward className="w-4 h-4" />
                <span className="text-[9px] font-bold hidden sm:inline">10</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button onClick={toggleMute} className="text-white/80 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range" min="0" max="1" step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-20 accent-indigo-500 h-1.5"
              />
            </div>

            <span className="text-white/90 text-xs font-mono">
              <span className="text-indigo-300">{fmt(currentTime)}</span>
              <span className="text-white/40 mx-1">/</span>
              <span className="text-white/70">{fmtFull(duration)}</span>
            </span>

            <div className="flex-1" />

            <div className="relative">
              <button onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowSettings(false); setShowChapters(false); }} className="text-white/80 hover:text-white transition-colors text-xs font-bold px-2 py-1.5 rounded hover:bg-white/10 flex items-center gap-1">
                <span className="bg-indigo-500/80 px-2 py-0.5 rounded">{playbackRate}x</span>
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 backdrop-blur rounded-xl shadow-2xl border border-gray-700 py-1 min-w-[90px] z-50">
                  {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackSpeed(rate)}
                      className={`w-full px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors flex items-center justify-between ${
                        playbackRate === rate ? 'text-indigo-400 font-bold' : 'text-white/80'
                      }`}
                    >
                      {rate}x {playbackRate === rate && <span className="text-indigo-400">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {chapters.length > 0 && (
              <div className="relative">
                <button onClick={() => { setShowChapters(!showChapters); setShowSpeedMenu(false); setShowSettings(false); }} className="text-white/80 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10" title="Chapters">
                  <div className="w-5 h-5 flex items-center justify-center text-xs font-bold border border-white/40 rounded">C</div>
                </button>
                {showChapters && (
                  <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 backdrop-blur rounded-xl shadow-2xl border border-gray-700 py-2 min-w-[200px] max-h-[300px] overflow-y-auto z-50">
                    <div className="px-3 py-2 text-xs font-bold text-white/60 uppercase border-b border-gray-700">Chapters</div>
                    {chapters.map((ch, i) => (
                      <button
                        key={i}
                        onClick={() => goToChapter(ch.time)}
                        className={`w-full px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors flex items-center gap-2 ${currentTime >= ch.time && currentTime < (chapters[i + 1]?.time || duration) ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/80'}`}
                      >
                        <span className="text-xs text-white/40 font-mono">{fmt(ch.time)}</span>
                        <span className="truncate">{ch.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="relative">
              <button onClick={() => { setShowSettings(!showSettings); setShowSpeedMenu(false); setShowChapters(false); }} className="text-white/80 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10">
                <Settings className="w-4 h-4" />
              </button>
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-900/95 backdrop-blur rounded-xl shadow-2xl border border-gray-700 p-4 min-w-[220px] z-50 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/60 font-medium">Brightness</span>
                      <span className="text-xs text-indigo-400 font-mono">{brightness}%</span>
                    </div>
                    <input type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} className="w-full accent-indigo-500" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/60 font-medium">Contrast</span>
                      <span className="text-xs text-indigo-400 font-mono">{contrast}%</span>
                    </div>
                    <input type="range" min="50" max="150" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value))} className="w-full accent-indigo-500" />
                  </div>
                  {showLoopControls && (
                    <div className="pt-2 border-t border-gray-700 space-y-2">
                      <div className="text-xs text-white/60 font-medium">Loop Section</div>
                      <div className="flex gap-2">
                        <button onClick={() => setLoopPoint('start')} className="flex-1 px-2 py-1.5 bg-yellow-500/20 text-yellow-400 text-xs rounded hover:bg-yellow-500/30 flex items-center justify-center gap-1">
                          <RotateCcw className="w-3 h-3" /> Start
                        </button>
                        <button onClick={() => setLoopPoint('end')} className="flex-1 px-2 py-1.5 bg-yellow-500/20 text-yellow-400 text-xs rounded hover:bg-yellow-500/30 flex items-center justify-center gap-1">
                          <RotateCw className="w-3 h-3" /> End
                        </button>
                      </div>
                      {isLooping && (
                        <button onClick={clearLoop} className="w-full px-2 py-1.5 bg-red-500/20 text-red-400 text-xs rounded hover:bg-red-500/30">
                          Clear Loop
                        </button>
                      )}
                    </div>
                  )}
                  <button onClick={() => { setShowLoopControls(true); setShowSettings(false); }} className="w-full px-3 py-2 bg-indigo-600/20 text-indigo-400 text-xs rounded hover:bg-indigo-600/30 flex items-center justify-center gap-2">
                    <RotateCw className="w-3 h-3" /> Add Loop Points
                  </button>
                </div>
              )}
            </div>

            <button onClick={togglePiP} className="text-white/80 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10" title="Picture-in-Picture">
              <PictureInPicture className="w-4 h-4" />
            </button>

            <button onClick={() => setShowKeyboardShortcuts(true)} className="text-white/80 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10 hidden sm:flex" title="Keyboard Shortcuts">
              <Keyboard className="w-4 h-4" />
            </button>

            <button onClick={toggleFullscreen} className="text-white/80 hover:text-white transition-colors p-1.5 rounded hover:bg-white/10">
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {showKeyboardShortcuts && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowKeyboardShortcuts(false)}>
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-700 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Keyboard Shortcuts</h3>
              <button onClick={() => setShowKeyboardShortcuts(false)} className="text-white/60 hover:text-white">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Space / K', 'Play/Pause'],
                ['← / J', 'Back 10s'],
                ['→ / L', 'Forward 10s'],
                ['↑', 'Volume Up'],
                ['↓', 'Volume Down'],
                ['M', 'Mute'],
                ['F', 'Fullscreen'],
                ['P', 'Picture-in-Picture'],
                ['0-9', 'Jump to %'],
              ].map(([key, action]) => (
                <div key={key} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-white/60">{action}</span>
                  <kbd className="bg-gray-800 text-white px-2 py-1 rounded text-xs font-mono">{key}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

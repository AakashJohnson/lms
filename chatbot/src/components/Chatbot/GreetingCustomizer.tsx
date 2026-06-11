import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare } from 'lucide-react';
import './GreetingCustomizer.css';

interface GreetingCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  onGreetingChange: (greeting: GreetingSettings) => void;
  currentGreeting: GreetingSettings;
}

export interface GreetingSettings {
  message: string;
  animation: string;
  showEmoji: boolean;
  emoji: string;
  delay: number;
}

const GreetingCustomizer: React.FC<GreetingCustomizerProps> = ({
  isOpen,
  onClose,
  onGreetingChange,
  currentGreeting
}) => {
  const greetingPresets = [
    {
      message: "Hello! I am Anuvadini chatbot. How can I help you today?",
      animation: "bounce",
      showEmoji: true,
      emoji: "🤖",
      delay: 1000
    },
    {
      message: "Welcome! I'm your AI assistant ready to help you.",
      animation: "fadeIn",
      showEmoji: true,
      emoji: "👋",
      delay: 800
    },
    {
      message: "Hi there! What can I assist you with today?",
      animation: "slideIn",
      showEmoji: true,
      emoji: "😊",
      delay: 1200
    },
    {
      message: "Greetings! Your personal AI companion is here to help.",
      animation: "pulse",
      showEmoji: true,
      emoji: "✨",
      delay: 1000
    },
    {
      message: "Good day! I'm here to make your experience amazing.",
      animation: "bounce",
      showEmoji: true,
      emoji: "🌟",
      delay: 1500
    }
  ];

  const animations = [
    { name: 'Bounce', value: 'bounce' },
    { name: 'Fade In', value: 'fadeIn' },
    { name: 'Slide In', value: 'slideIn' },
    { name: 'Pulse', value: 'pulse' },
    { name: 'Scale', value: 'scale' },
    { name: 'Rotate', value: 'rotate' }
  ];

  const emojis = [
    '🤖', '👋', '😊', '✨', '🌟', '💬', '🎯', '🚀', 
    '💡', '🎉', '👍', '❤️', '🔥', '⚡', '🌈', '🎊'
  ];

  const handleSettingChange = (key: keyof GreetingSettings, value: string | number | boolean) => {
    const newSettings = {
      ...currentGreeting,
      [key]: value
    };
    onGreetingChange(newSettings);
  };

  const handlePresetSelect = (preset: GreetingSettings) => {
    onGreetingChange(preset);
  };

  const getAnimationVariants = (animationType: string) => {
    switch (animationType) {
      case 'bounce':
        return {
          initial: { y: -20, opacity: 0 },
          animate: { 
            y: 0, 
            opacity: 1,
            transition: { 
              type: "spring" as const, 
              stiffness: 400, 
              damping: 10
            }
          }
        };
      case 'fadeIn':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1, transition: { duration: 0.8 } }
        };
      case 'slideIn':
        return {
          initial: { x: -50, opacity: 0 },
          animate: { x: 0, opacity: 1, transition: { duration: 0.6 } }
        };
      case 'pulse':
        return {
          initial: { scale: 0.8, opacity: 0 },
          animate: { 
            scale: 1, 
            opacity: 1,
            transition: { 
              duration: 0.6
            }
          }
        };
      case 'scale':
        return {
          initial: { scale: 0, opacity: 0 },
          animate: { scale: 1, opacity: 1, transition: { duration: 0.5 } }
        };
      case 'rotate':
        return {
          initial: { rotate: -180, opacity: 0 },
          animate: { rotate: 0, opacity: 1, transition: { duration: 0.7 } }
        };
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1, transition: { duration: 0.5 } }
        };
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="greeting-customizer-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="greeting-customizer-modal"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title">
                <MessageSquare size={20} />
                <h3>Greeting Customization</h3>
              </div>
              <button className="close-btn" onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            <div className="greeting-preview">
              <h4>Preview</h4>
              <div className="preview-container">
                <motion.div
                  key={`${currentGreeting.message}-${currentGreeting.animation}`}
                  className="preview-greeting"
                  {...getAnimationVariants(currentGreeting.animation)}
                >
                  {currentGreeting.showEmoji && (
                    <span className="preview-emoji">{currentGreeting.emoji}</span>
                  )}
                  <span className="preview-text">{currentGreeting.message}</span>
                </motion.div>
              </div>
            </div>

            <div className="greeting-controls">
              <div className="control-group">
                <label>Custom Message</label>
                <div className="textarea-container">
                  <textarea
                    value={currentGreeting.message}
                    onChange={(e) => handleSettingChange('message', e.target.value)}
                    placeholder="Enter your custom greeting message..."
                    className="greeting-textarea"
                    rows={3}
                  />
                </div>
              </div>

              <div className="control-row">
                <div className="control-group">
                  <label>Animation</label>
                  <select
                    value={currentGreeting.animation}
                    onChange={(e) => handleSettingChange('animation', e.target.value)}
                    className="animation-select"
                  >
                    {animations.map((anim) => (
                      <option key={anim.value} value={anim.value}>
                        {anim.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="control-group">
                  <label>Delay (ms)</label>
                  <input
                    type="number"
                    min="0"
                    max="5000"
                    step="100"
                    value={currentGreeting.delay}
                    onChange={(e) => handleSettingChange('delay', parseInt(e.target.value))}
                    className="delay-input"
                  />
                </div>
              </div>

              <div className="control-group">
                <div className="emoji-toggle">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={currentGreeting.showEmoji}
                      onChange={(e) => handleSettingChange('showEmoji', e.target.checked)}
                      className="toggle-input"
                    />
                    <span className="toggle-slider"></span>
                    Show Emoji
                  </label>
                </div>
              </div>

              {currentGreeting.showEmoji && (
                <div className="control-group">
                  <label>Choose Emoji</label>
                  <div className="emoji-grid">
                    {emojis.map((emoji) => (
                      <motion.button
                        key={emoji}
                        className={`emoji-btn ${currentGreeting.emoji === emoji ? 'selected' : ''}`}
                        onClick={() => handleSettingChange('emoji', emoji)}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="greeting-presets">
              <h4>Quick Presets</h4>
              <div className="presets-list">
                {greetingPresets.map((preset, index) => (
                  <motion.div
                    key={index}
                    className={`preset-item ${JSON.stringify(currentGreeting) === JSON.stringify(preset) ? 'selected' : ''}`}
                    onClick={() => handlePresetSelect(preset)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="preset-content">
                      {preset.showEmoji && (
                        <span className="preset-emoji">{preset.emoji}</span>
                      )}
                      <span className="preset-text">{preset.message.substring(0, 50)}...</span>
                    </div>
                    <div className="preset-info">
                      <span className="preset-animation">{animations.find(a => a.value === preset.animation)?.name}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <motion.button
                className="reset-btn"
                onClick={() => handlePresetSelect(greetingPresets[0])}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Reset to Default
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GreetingCustomizer;

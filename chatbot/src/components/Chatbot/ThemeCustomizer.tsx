import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sun, Moon, Monitor } from 'lucide-react';
import './ThemeCustomizer.css';

interface ThemeCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  onThemeChange: (theme: ThemeSettings) => void;
  currentTheme: ThemeSettings;
}

export interface ThemeSettings {
  mode: 'light' | 'dark' | 'auto';
  background: string;
  surface: string;
  primary: string;
  text: string;
  textSecondary: string;
  border: string;
  shadow: string;
}

const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({
  isOpen,
  onClose,
  onThemeChange,
  currentTheme
}) => {
  const themePresets = {
    light: {
      mode: 'light' as const,
      background: '#ffffff',
      surface: '#f8f9fa',
      primary: '#3498db',
      text: '#333333',
      textSecondary: '#666666',
      border: '#e9ecef',
      shadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    },
    dark: {
      mode: 'dark' as const,
      background: '#1a202c',
      surface: '#2d3748',
      primary: '#4299e1',
      text: '#ffffff',
      textSecondary: '#a0aec0',
      border: '#4a5568',
      shadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
    },
    midnight: {
      mode: 'dark' as const,
      background: '#0f172a',
      surface: '#1e293b',
      primary: '#6366f1',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#334155',
      shadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
    },
    ocean: {
      mode: 'light' as const,
      background: '#e0f2fe',
      surface: '#bae6fd',
      primary: '#0284c7',
      text: '#082f49',
      textSecondary: '#0369a1',
      border: '#7dd3fc',
      shadow: '0 4px 12px rgba(2, 132, 199, 0.2)'
    },
    forest: {
      mode: 'light' as const,
      background: '#dcfce7',
      surface: '#bbf7d0',
      primary: '#16a34a',
      text: '#052e16',
      textSecondary: '#15803d',
      border: '#86efac',
      shadow: '0 4px 12px rgba(22, 163, 74, 0.2)'
    },
    sunset: {
      mode: 'light' as const,
      background: '#ffedd5',
      surface: '#fed7aa',
      primary: '#ea580c',
      text: '#431407',
      textSecondary: '#9a3412',
      border: '#fdba74',
      shadow: '0 4px 12px rgba(234, 88, 12, 0.2)'
    }
  };

  const handlePresetSelect = (preset: ThemeSettings) => {
    onThemeChange(preset);
  };

  const handleModeChange = (mode: 'light' | 'dark' | 'auto') => {
    const newTheme = { ...currentTheme, mode };
    onThemeChange(newTheme);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="theme-customizer-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="theme-customizer-modal"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: currentTheme.background,
              color: currentTheme.text,
              boxShadow: currentTheme.shadow
            }}
          >
            <div className="modal-header" style={{ borderBottomColor: currentTheme.border }}>
              <div className="modal-title">
                <Sun size={20} />
                <h3>Theme Customization</h3>
              </div>
              <button
                className="close-btn"
                onClick={onClose}
                style={{ color: currentTheme.text }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="theme-preview">
              <h4>Preview</h4>
              <div
                className="preview-chat"
                style={{
                  background: currentTheme.surface,
                  border: `1px solid ${currentTheme.border}`,
                  color: currentTheme.text
                }}
              >
                <div className="preview-message bot">
                  <div
                    className="preview-bubble"
                    style={{
                      background: currentTheme.primary,
                      color: currentTheme.mode === 'dark' ? '#fff' : '#fff'
                    }}
                  >
                    Hello! How can I help you today? 🤖
                  </div>
                </div>
                <div className="preview-message user">
                  <div
                    className="preview-bubble user-bubble"
                    style={{
                      background: currentTheme.surface,
                      border: `1px solid ${currentTheme.border}`,
                      color: currentTheme.text
                    }}
                  >
                    This is how messages will look!
                  </div>
                </div>
              </div>
            </div>

            <div className="mode-selector">
              <h4>Theme Mode</h4>
              <div className="mode-buttons">
                {[
                  { mode: 'light' as const, icon: Sun, label: 'Light' },
                  { mode: 'dark' as const, icon: Moon, label: 'Dark' },
                  { mode: 'auto' as const, icon: Monitor, label: 'Auto' }
                ].map(({ mode, icon: Icon, label }) => (
                  <motion.button
                    key={mode}
                    className={`mode-btn ${currentTheme.mode === mode ? 'active' : ''}`}
                    onClick={() => handleModeChange(mode)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      background: currentTheme.mode === mode ? currentTheme.primary : currentTheme.surface,
                      color: currentTheme.mode === mode ? '#fff' : currentTheme.text,
                      border: `1px solid ${currentTheme.border}`
                    }}
                  >
                    <Icon size={16} />
                    {label}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="theme-presets">
              <h4>Theme Presets</h4>
              <div className="presets-grid">
                {Object.entries(themePresets).map(([name, preset]) => (
                  <motion.div
                    key={name}
                    className={`preset-card ${JSON.stringify(currentTheme) === JSON.stringify(preset) ? 'selected' : ''}`}
                    onClick={() => handlePresetSelect(preset)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      background: preset.background,
                      border: `2px solid ${JSON.stringify(currentTheme) === JSON.stringify(preset) ? currentTheme.primary : preset.border}`
                    }}
                  >
                    <div className="preset-preview">
                      <div
                        className="preset-surface"
                        style={{ background: preset.surface }}
                      ></div>
                      <div
                        className="preset-primary"
                        style={{ background: preset.primary }}
                      ></div>
                    </div>
                    <div
                      className="preset-name"
                      style={{ color: preset.text }}
                    >
                      {name.charAt(0).toUpperCase() + name.slice(1)}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="modal-actions" style={{ borderTopColor: currentTheme.border }}>
              <motion.button
                className="reset-btn"
                onClick={() => handlePresetSelect(themePresets.light)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: currentTheme.surface,
                  border: `1px solid ${currentTheme.border}`,
                  color: currentTheme.text
                }}
              >
                Reset to Light
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ThemeCustomizer;

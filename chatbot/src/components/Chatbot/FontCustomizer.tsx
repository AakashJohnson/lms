import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Type } from 'lucide-react';
import './FontCustomizer.css';

interface FontCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
  onFontChange: (fontSettings: FontSettings) => void;
  currentSettings: FontSettings;
}

export interface FontSettings {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
  letterSpacing: number;
}

const FontCustomizer: React.FC<FontCustomizerProps> = ({
  isOpen,
  onClose,
  onFontChange,
  currentSettings
}) => {
  const fontFamilies = [
    { name: 'Inter', value: "'Inter', sans-serif" },
    { name: 'Roboto', value: "'Roboto', sans-serif" },
    { name: 'Open Sans', value: "'Open Sans', sans-serif" },
    { name: 'Poppins', value: "'Poppins', sans-serif" },
    { name: 'Lato', value: "'Lato', sans-serif" },
    { name: 'Montserrat', value: "'Montserrat', sans-serif" },
    { name: 'Source Sans Pro', value: "'Source Sans Pro', sans-serif" },
    { name: 'Nunito', value: "'Nunito', sans-serif" },
    { name: 'PT Sans', value: "'PT Sans', sans-serif" },
    { name: 'Ubuntu', value: "'Ubuntu', sans-serif" }
  ];

  const fontWeights = [
    { name: 'Light', value: '300' },
    { name: 'Normal', value: '400' },
    { name: 'Medium', value: '500' },
    { name: 'Semi Bold', value: '600' },
    { name: 'Bold', value: '700' }
  ];

  const handleSettingChange = (key: keyof FontSettings, value: string | number) => {
    const newSettings = {
      ...currentSettings,
      [key]: value
    };
    onFontChange(newSettings);
  };

  const resetToDefaults = () => {
    const defaultSettings: FontSettings = {
      fontFamily: "'Inter', sans-serif",
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 1.5,
      letterSpacing: 0
    };
    onFontChange(defaultSettings);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="font-customizer-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="font-customizer-modal"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title">
                <Type size={20} />
                <h3>Font Customization</h3>
              </div>
              <button className="close-btn" onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            <div className="font-preview">
              <h4>Preview</h4>
              <div 
                className="preview-text"
                style={currentSettings}
              >
                Hello! I am Anuvadini chatbot. How can I help you today? 🤖
              </div>
            </div>

            <div className="font-controls">
              <div className="control-group">
                <label>Font Family</label>
                <select
                  value={currentSettings.fontFamily}
                  onChange={(e) => handleSettingChange('fontFamily', e.target.value)}
                  className="font-select"
                >
                  {fontFamilies.map((font) => (
                    <option key={font.value} value={font.value}>
                      {font.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="control-group">
                <label>Font Size</label>
                <div className="slider-container">
                  <input
                    type="range"
                    min="10"
                    max="20"
                    value={currentSettings.fontSize}
                    onChange={(e) => handleSettingChange('fontSize', parseInt(e.target.value))}
                    className="slider"
                  />
                  <span className="slider-value">{currentSettings.fontSize}px</span>
                </div>
              </div>

              <div className="control-group">
                <label>Font Weight</label>
                <div className="weight-buttons">
                  {fontWeights.map((weight) => (
                    <motion.button
                      key={weight.value}
                      className={`weight-btn ${currentSettings.fontWeight === weight.value ? 'active' : ''}`}
                      onClick={() => handleSettingChange('fontWeight', weight.value)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {weight.name}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="control-group">
                <label>Line Height</label>
                <div className="slider-container">
                  <input
                    type="range"
                    min="1.2"
                    max="2"
                    step="0.1"
                    value={currentSettings.lineHeight}
                    onChange={(e) => handleSettingChange('lineHeight', parseFloat(e.target.value))}
                    className="slider"
                  />
                  <span className="slider-value">{currentSettings.lineHeight}</span>
                </div>
              </div>

              <div className="control-group">
                <label>Letter Spacing</label>
                <div className="slider-container">
                  <input
                    type="range"
                    min="-1"
                    max="2"
                    step="0.1"
                    value={currentSettings.letterSpacing}
                    onChange={(e) => handleSettingChange('letterSpacing', parseFloat(e.target.value))}
                    className="slider"
                  />
                  <span className="slider-value">{currentSettings.letterSpacing}px</span>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <motion.button
                className="reset-btn"
                onClick={resetToDefaults}
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

export default FontCustomizer;

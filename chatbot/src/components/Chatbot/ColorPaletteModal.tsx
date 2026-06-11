import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Palette } from 'lucide-react';
import './ColorPaletteModal.css';

interface ColorPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onColorSelect: (color: string) => void;
  currentColor?: string;
}

const ColorPaletteModal: React.FC<ColorPaletteModalProps> = ({
  isOpen,
  onClose,
  onColorSelect,
  currentColor
}) => {
  const colorPalettes = {
    primary: [
      '#3498db', '#e74c3c', '#2ecc71', '#f39c12',
      '#9b59b6', '#1abc9c', '#34495e', '#e67e22'
    ],
    pastel: [
      '#ffb3d9', '#ffccb3', '#ffffb3', '#ccffb3',
      '#b3ffcc', '#b3ffff', '#b3ccff', '#ccb3ff'
    ],
    dark: [
      '#2c3e50', '#8e44ad', '#27ae60', '#f39c12',
      '#e74c3c', '#16a085', '#2980b9', '#c0392b'
    ],
    gradient: [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
    ]
  };

  const handleColorSelect = (color: string) => {
    onColorSelect(color);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="color-palette-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="color-palette-modal"
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-title">
                <Palette size={20} />
                <h3>Choose Your Theme Color</h3>
              </div>
              <button className="close-btn" onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            <div className="color-sections">
              {Object.entries(colorPalettes).map(([category, colors]) => (
                <div key={category} className="color-section">
                  <h4 className="section-title">
                    {category.charAt(0).toUpperCase() + category.slice(1)} Colors
                  </h4>
                  <div className="color-grid">
                    {colors.map((color, index) => (
                      <motion.button
                        key={`${category}-${index}`}
                        className={`color-option ${currentColor === color ? 'selected' : ''}`}
                        style={{ background: color }}
                        onClick={() => handleColorSelect(color)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        {currentColor === color && (
                          <motion.div
                            className="check-mark"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500 }}
                          >
                            ✓
                          </motion.div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="color-actions">
              <motion.button
                className="reset-btn"
                onClick={() => handleColorSelect('#3498db')}
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

export default ColorPaletteModal;

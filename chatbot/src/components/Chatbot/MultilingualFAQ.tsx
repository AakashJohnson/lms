import React, { useState } from 'react';
import faqData from './faqData.json';
import { useLanguage } from '../services/languageContext';
import './MultilingualFAQ.css';

interface MultilingualFAQProps {
  onFAQQuestionClick?: (question: string, answer: string) => void;
}

const Speech = (text: string, lang: string) => {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  speechSynthesis.speak(utterance);
};

const MultilingualFAQ: React.FC<MultilingualFAQProps> = ({ onFAQQuestionClick }) => {
  const { currentLanguage, setCurrentLanguage, languageMap } = useLanguage();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const handleToggle = (category: string) => {
    setExpandedCategory(prev => (prev === category ? null : category));
  };

  const handleQuestionClick = (question: string, answer: string) => {
    if (onFAQQuestionClick) {
      onFAQQuestionClick(question, answer);
    }
  };

  const grouped = faqData.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof faqData>);

  return (
    <div className="faq-container">
      <div className="faq-header">
        <div className="faq-title-section">
          <div className="faq-logo">
            <span className="faq-icon">❓</span>
          </div>
          <h1>Frequently Asked Questions</h1>
          <p className="faq-subtitle">Click on any question to see the answer in the chatbot</p>
        </div>
      </div>

      <div className="language-selector-container">
        <label htmlFor="language-select" className="language-label">
          <span className="language-icon">🌐</span>
          Choose Language
        </label>
        <select 
          id="language-select"
          onChange={(e) => setCurrentLanguage(e.target.value as keyof typeof languageMap)} 
          value={currentLanguage}
          className="language-select"
        >
          {Object.entries(languageMap).map(([code, name]) => (
            <option key={code} value={code}>{String(name)}</option>
          ))}
        </select>
      </div>

      <div className="faq-categories">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="faq-category">
            <div 
              className="faq-category-header"
              onClick={() => handleToggle(category)}
            >
              <div className="category-info">
                <span className="category-icon">📋</span>
                <h2>{category}</h2>
                <span className="category-count">{items.length} questions</span>
              </div>
              <div className="expand-icon">
                {expandedCategory === category ? '−' : '+'}
              </div>
            </div>

            {expandedCategory === category && (
              <div className="faq-items">
                {items.map(({ id, question, answer }) => {
                  const currentQuestion = question[currentLanguage as keyof typeof question] || question.en;
                  const currentAnswer = answer[currentLanguage as keyof typeof answer] || answer.en;
                  
                  return (
                    <div key={id} className="faq-item">
                      <div className="question-section">
                        <div className="question-icon">❓</div>
                        <div className="question-content">
                          <div className="question-header">
                            <h3 
                              className="clickable-question"
                              onClick={() => handleQuestionClick(currentQuestion, currentAnswer)}
                              style={{ cursor: 'pointer' }}
                            >
                              {currentQuestion}
                            </h3>
                            <button 
                              className="hear-button-small"
                              onClick={() => Speech(`${currentQuestion} ${currentAnswer}`, currentLanguage)}
                            >
                              <span className="speaker-icon-small">🔊</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultilingualFAQ;

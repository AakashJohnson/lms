import React, { useState } from "react";
import "./UploadForm.css";
import uploadTranslations from "../jsonfile/uploadTranslations.json";

interface UploadFormProps {
  onSubmit: (userMessage: string, botResponse: string) => void;
  onClose: () => void;
  userPreferences: any;
  language?: string;
}

const UploadForm: React.FC<UploadFormProps> = ({ onSubmit, onClose, userPreferences, language = 'en' }) => {
  const [urls, setUrls] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [crawlDepth, setCrawlDepth] = useState(2);
  const [crawlMethod] = useState<"single" | "multi">("single");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [response, setResponse] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [chunkStats, setChunkStats] = useState({
    totalChunks: 0,
    urlsProcessed: 0,
    filesProcessed: 0,
    processingTime: 0
  });
  
  // Translation function
  const t = (key: string, fallback?: string) => {
    try {
      const parts = key.split('.');
      let node: any = (uploadTranslations as any)[language] || {};
      for (const p of parts) {
        if (node && typeof node === 'object' && p in node) {
          node = node[p];
        } else {
          return fallback ?? key;
        }
      }
      return typeof node === 'string' ? node : fallback ?? key;
    } catch {
      return fallback ?? key;
    }
  };

  const processingSteps = [
    t('uploadForm.processing.steps.initializing'),
    t('uploadForm.processing.steps.analyzing'),
    t('uploadForm.processing.steps.crawling'),
    t('uploadForm.processing.steps.processing'),
    t('uploadForm.processing.steps.extracting'),
    t('uploadForm.processing.steps.generating'),
    t('uploadForm.processing.steps.finalizing')
  ];

  const simulateProcessingSteps = () => {
    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < processingSteps.length) {
        setCurrentStep(stepIndex);
        setLoadingText(processingSteps[stepIndex]);
        stepIndex++;
      } else {
        clearInterval(interval);
      }
    }, 2000); // Change step every 2 seconds
    
    return interval;
  };

  const parseResponseData = (data: any) => {
    try {
      // Try to extract chunk information from the response
      const totalChunks = data.chunks_used?.length || data.total_chunks || data.chunk_count || 0;
      const urlsProcessed = data.urls_processed || (urls.trim() ? 1 : 0);
      const filesProcessed = data.files_processed || (files?.length || 0);
      const processingTime = data.time_taken || data.processing_time || 0;

      return {
        totalChunks,
        urlsProcessed,
        filesProcessed,
        processingTime
      };
    } catch (error) {
      console.error('Error parsing response data:', error);
      return {
        totalChunks: 0,
        urlsProcessed: 0,
        filesProcessed: 0,
        processingTime: 0
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setCurrentStep(0);
    setLoadingText(processingSteps[0]);
    setResponse("");
    
    // Start the processing steps simulation
    const processingInterval = simulateProcessingSteps();

    if (!urls.trim() && (!files || files.length === 0)) {
      alert("Please provide either URLs or files to upload.");
      clearInterval(processingInterval);
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData();

    // Add URLs
    if (urls.trim()) {
      formData.append("urls", urls.trim());
    }

    // Add crawl depth & method
    formData.append("crawlDepth", crawlDepth.toString());
    formData.append("crawlMethod", crawlMethod);

    // Add files
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.name.endsWith(".pdf")) {
          formData.append("pdfFiles", file);
        } else if (file.name.endsWith(".docx")) {
          formData.append("docxFiles", file);
        } else if (file.name.endsWith(".txt")) {
          formData.append("txtFiles", file);
        } else if (file.name.endsWith(".md")) {
          formData.append("mdFiles", file);
        } else if (file.name.endsWith(".html")) {
          formData.append("htmlFiles", file);
        } else if (file.name.endsWith(".csv")) {
          formData.append("csvFiles", file);
        }
      }
    }

    try {
      setLoadingText("Crawling websites and processing documents...");

      let response = await fetch("http://10.150.0.4:8001/process-data", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      // console.log(" sss ",response);
      
      const data = await response.json();
      setResponse(JSON.stringify(data, null, 2));

      // Parse response data for chunk statistics
      const stats = parseResponseData(data);
      setChunkStats(stats);
      setIsCompleted(true);

      // Construct user message
      let userMessage = "📎 ";
      if (files && files.length > 0) {
        userMessage += Array.from(files).map(f => f.name).join(", ");
      }
      if (urls.trim()) {
        if (files && files.length > 0) userMessage += " + ";
        userMessage += urls.trim();
      }

      // Add chunk information to the message
      if (stats.totalChunks > 0) {
        userMessage += ` (Generated ${stats.totalChunks} chunks)`;
      }

      onSubmit(userMessage, JSON.stringify(data, null, 2));
    } catch (error: any) {
      console.error("Upload error:", error);
      setResponse(`Error: ${error.message}`);
    } finally {
      clearInterval(processingInterval);
      setIsSubmitting(false);
      setLoadingText("");
      setCurrentStep(0);
      // Don't reset isCompleted and chunkStats here as we want to show them
    }
  };

  return (
    <div className="upload-form-overlay" onClick={onClose}>
      <div
        className="upload-form-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: userPreferences.themeSettings.surface,
          border: `1px solid ${userPreferences.themeSettings.border}`,
          boxShadow: userPreferences.themeSettings.shadow,
        }}
      >
        <div className="upload-form-header">
          <h3 style={{ color: userPreferences.themeSettings.text }}>
            {t('uploadForm.formTitle')}
          </h3>
          <button
            className="upload-form-close"
            onClick={onClose}
            style={{ color: userPreferences.themeSettings.textSecondary }}
          >
            ✖
          </button>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          {/* URLs */}
          <div className="upload-form-section">
            <label style={{ color: userPreferences.themeSettings.text }}>
              {t('uploadForm.urlsLabel')}
            </label>
            <textarea
              className="upload-form-textarea"
              rows={3}
              placeholder={t('uploadForm.urlsPlaceholder')}
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              style={{
                background: userPreferences.themeSettings.background,
                color: userPreferences.themeSettings.text,
                border: `1px solid ${userPreferences.themeSettings.border}`,
              }}
            />
            <button
              type="button"
              onClick={() => {
                const currentUrls = urls.trim();
                const newUrl = prompt("Enter URL:");
                if (newUrl && newUrl.trim()) {
                  setUrls(currentUrls ? `${currentUrls}, ${newUrl.trim()}` : newUrl.trim());
                }
              }}
              style={{
                padding: "8px 16px",
                background: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "14px",
                marginTop: "8px",
              }}
            >
              + Add More URL
            </button>
          </div>

          {/* Crawl Depth */}
          <div className="upload-form-section">
            <label style={{ color: userPreferences.themeSettings.text }}>
              Crawl Depth:
            </label>
            <input
              type="number"
              min={1}
              max={5}
              value={crawlDepth}
              onChange={(e) => setCrawlDepth(parseInt(e.target.value))}
              style={{
                width: "100px",
                background: userPreferences.themeSettings.background,
                color: userPreferences.themeSettings.text,
                border: `1px solid ${userPreferences.themeSettings.border}`,
              }}
            />
            {/* <div className="help-text">
              Depth 1: Initial URLs only<br />
              Depth 2+: Follows more internal links
            </div> */}
          </div>

          {/* Crawl Method */}
          <div className="upload-form-section">
            {/* <label style={{ color: userPreferences.themeSettings.text }}>
              Crawl Method:
            </label> */}
            {/* <div>
              <label>
                <input
                  type="radio"
                  value="single"
                  checked={crawlMethod === "single"}
                  onChange={() => setCrawlMethod("single")}
                />
                Single Page (Faster, Crawl4AI)
              </label>
              <br />
              <label>
                <input
                  type="radio"
                  value="multi"
                  checked={crawlMethod === "multi"}
                  onChange={() => setCrawlMethod("multi")}
                />
                Multi Page (Slower, Playwright)
              </label>
            </div> */}
          </div>

          {/* File Upload */}
          <div className="upload-form-section">
            <label style={{ color: userPreferences.themeSettings.text }}>
              {t('uploadForm.filesLabel')}
            </label>
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md,.html,.csv"
              onChange={(e) => setFiles(e.target.files)}
            />
          </div>

          {/* Actions */}
          <div className="upload-form-actions">
            <button type="button" onClick={onClose}>
              {t('uploadForm.cancelButton')}
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('uploadForm.processing.title') : t('uploadForm.submitButton')}
            </button>
          </div>
        </form>

        {/* Beautiful Loading UI */}
        {isSubmitting && !isCompleted && (
          <div className="processing-overlay">
            <div className="processing-container">
              <div className="processing-header">
                <div className="processing-icon">
                  <div className="spinner"></div>
                </div>
                <h3 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '20px', lineHeight: '1.2' }}>
                  {t('uploadForm.processing.title')}
                </h3>
                <p style={{ fontSize: '16px', lineHeight: '1.6', marginTop: '0', display: 'block' }}>
                  {t('uploadForm.processing.subtitle')}
                </p>
              </div>
              
              <div className="progress-container">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${((currentStep + 1) / processingSteps.length) * 100}%` }}
                  ></div>
                </div>
                <div className="progress-text">
                  Step {currentStep + 1} of {processingSteps.length}
                </div>
              </div>
              
              <div className="processing-steps">
                {processingSteps.map((step, index) => (
                  <div 
                    key={index} 
                    className={`processing-step ${index <= currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                  >
                    <div className="step-icon">
                      {index < currentStep ? '✓' : index === currentStep ? '⟳' : '○'}
                    </div>
                    <div className="step-text">{step}</div>
                  </div>
                ))}
              </div>
              
              <div className="processing-details">
                <div className="current-step">{loadingText}</div>
                <div className="processing-tips">
                  💡 {t('uploadForm.processing.tips')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Completion UI */}
        {isCompleted && (
          <div className="completion-overlay" onClick={onClose}>
            <div className="completion-container" onClick={(e) => e.stopPropagation()}>
              <div className="completion-header">
                <button className="completion-close" onClick={onClose}>
                  ×
                </button>
                <div className="completion-icon">
                  <div className="success-checkmark">✓</div>
                </div>
              <h3>{t('uploadForm.completion.title')}</h3>
              <p>{t('uploadForm.completion.subtitle')}</p>
              </div>
              
              <div className="completion-stats">
                <div className="stat-card">
                  <div className="stat-icon">📄</div>
                  <div className="stat-content">
                    <div className="stat-number">{chunkStats.totalChunks}</div>
                    <div className="stat-label">{t('uploadForm.completion.chunksGenerated')}</div>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">🌐</div>
                  <div className="stat-content">
                    <div className="stat-number">{chunkStats.urlsProcessed}</div>
                    <div className="stat-label">{t('uploadForm.completion.urlsProcessed')}</div>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon">📁</div>
                  <div className="stat-content">
                    <div className="stat-number">{chunkStats.filesProcessed}</div>
                    <div className="stat-label">{t('uploadForm.completion.filesProcessed')}</div>
                  </div>
                </div>
                
                {chunkStats.processingTime > 0 && (
                  <div className="stat-card">
                    <div className="stat-icon">⏱️</div>
                    <div className="stat-content">
                      <div className="stat-number">{chunkStats.processingTime}s</div>
                      <div className="stat-label">{t('uploadForm.completion.processingTime')}</div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="completion-summary">
                <div className="summary-text">
                  🎉 {t('uploadForm.completion.summary', `Successfully generated ${chunkStats.totalChunks} chunks from your content!`).replace('{count}', chunkStats.totalChunks.toString())}
                </div>
                <div className="summary-details">
                  {chunkStats.urlsProcessed > 0 && `${chunkStats.urlsProcessed} URL${chunkStats.urlsProcessed > 1 ? 's' : ''} crawled`}
                  {chunkStats.urlsProcessed > 0 && chunkStats.filesProcessed > 0 && ' • '}
                  {chunkStats.filesProcessed > 0 && `${chunkStats.filesProcessed} file${chunkStats.filesProcessed > 1 ? 's' : ''} processed`}
                </div>
              </div>
              
              <div className="completion-actions">
                <button className="close-button" onClick={onClose}>
                  {t('uploadForm.completion.closeButton')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="upload-form-response">
            <pre>{response}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadForm;

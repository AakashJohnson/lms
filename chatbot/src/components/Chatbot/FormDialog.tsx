import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, CheckCircle, AlertCircle, Loader, Keyboard, Mic, MicOff } from "lucide-react";
import { useLanguage } from "../services/languageContext";
import { translationService } from "../services/translationService";
import VirtualKeyboard from "./VirtualKeyboard";
import { voiceRecordingService } from "../services/voiceService";

// Generate or retrieve a stable anonymous id
export const getOrCreateSubmitterId = () => {
  try {
    let id = localStorage.getItem("submitter_id");
    if (!id) {
      id = `anon-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      localStorage.setItem("submitter_id", id);
    }
    return id;
  } catch {
    return `anon-${Date.now()}`;
  }
};

interface FormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formData: any;
  currentCategory?: string;
  userPreferences?: any;
  onSubmit?: (payload: any) => Promise<void>;
}

const FormDialog: React.FC<FormDialogProps> = ({
  isOpen,
  onClose,
  formData,
  currentCategory,
  userPreferences = {},
  onSubmit,
}) => {
  const { currentLanguage } = useLanguage();
  const [translatedForm, setTranslatedForm] = useState<any>(formData);
  const [isTranslating, setIsTranslating] = useState(false);

  const [activeInputId, setActiveInputId] = useState<string | null>(null);
  const [virtualKeyboardOpen, setVirtualKeyboardOpen] = useState(false);
  const [recordingFieldId, setRecordingFieldId] = useState<string | null>(null);

  // Normalize/prepare questions array (stable ids)
  const questions = useMemo(() => {
    // Backend can return either 'fields' or 'questions'
    const arr = (translatedForm?.fields || translatedForm?.questions || []) as any[];

    const base = (
      translatedForm?._id ||
      translatedForm?.id ||
      Date.now().toString()
    ).toString();
    return arr.map((q: any, idx: number) => {
      const rawId = q?.id ?? q?._id ?? q?.key;
      const cleanId = rawId ? String(rawId).trim() : "";
      const id =
        cleanId || `q_${idx}_${base}_${Math.random().toString(36).slice(2, 6)}`;
      return { ...q, id };
    });
  }, [translatedForm]);

  const [responses, setResponses] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Initialize when dialog opens (use normalized questions)
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, any> = {};
      questions.forEach((q: any) => {
        initial[q.id] = q.type === "checkbox" ? [] : "";
      });
      setResponses(initial);
      setErrors({});
      setIsSubmitted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, questions]); // Use questions dependency to wait for translatedForm

  useEffect(() => {
    const translateForm = async () => {
      if (!isOpen || currentLanguage === "en") {
        setTranslatedForm(formData);
        return;
      }
      setIsTranslating(true);
      try {
        const translateTexts = async (texts: string[]) => {
          const promises = texts.map((text) =>
            translationService.translateForDisplay(text, "en", currentLanguage)
          );
          const results = await Promise.all(promises);
          return results.map((r, i) => (r.success ? r.translatedText : texts[i]));
        };

        const translatedTitle = formData?.title
          ? (await translateTexts([formData.title]))[0]
          : formData?.title;

        const translatedDescription = formData?.description
          ? (await translateTexts([formData.description]))[0]
          : formData?.description;

        const originalFields = formData?.fields || formData?.questions || [];
        const translatedFieldsPromises = originalFields.map(async (q: any) => {
          const transQ = { ...q };

          if (q.label) {
            transQ.label = (await translateTexts([q.label]))[0];
          }
          if (q.placeholder) {
            transQ.placeholder = (await translateTexts([q.placeholder]))[0];
          }
          if (q.options?.length > 0) {
            transQ.options = await translateTexts(q.options);
          }
          return transQ;
        });

        const translatedFieldsResult = await Promise.all(translatedFieldsPromises);

        setTranslatedForm({
          ...formData,
          title: translatedTitle,
          description: translatedDescription,
          fields: translatedFieldsResult,
          questions: translatedFieldsResult,
        });
      } catch (err) {
        console.error("Failed to translate form:", err);
        setTranslatedForm(formData);
      } finally {
        setIsTranslating(false);
      }
    };

    translateForm();
  }, [isOpen, currentLanguage, formData]);

  // Validation uses normalized questions
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    for (const q of questions) {
      const value = responses[q.id];
      if (
        q.required &&
        (!value || (Array.isArray(value) && value.length === 0))
      ) {
        newErrors[q.id] = `${q.label || "This field"} is required`;
      }
      if (q.type === "email" && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value))
          newErrors[q.id] = "Please enter a valid email address";
      }
      if (q.type === "phone" && value) {
        const phoneRegex = /^\+?[\d\s-()]{10,}$/;
        if (!phoneRegex.test(value))
          newErrors[q.id] = "Please enter a valid phone number";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (
    id: string,
    value: any,
    type?: string,
    required?: boolean
  ) => {
    setResponses((prev) => ({ ...prev, [id]: value }));

    // Real-time validation for that field
    let errorMsg = "";
    if (required && (!value || (Array.isArray(value) && value.length === 0))) {
      errorMsg = "This field is required";
    } else if (type === "email" && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value))
        errorMsg = "Please enter a valid email address";
    } else if (type === "phone" && value) {
      const phoneRegex = /^\+?[\d\s-()]{10,}$/;
      if (!phoneRegex.test(value))
        errorMsg = "Please enter a valid phone number";
    }
    setErrors((prev) => ({ ...prev, [id]: errorMsg }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        form_id: formData?._id || formData?.id,
        answers: responses,
        submitter_id: getOrCreateSubmitterId(),
        client_submitted_at: new Date().toISOString(),
        title: formData?.title,
      };
      if (onSubmit) await onSubmit(payload);
      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
        setIsSubmitted(false);
      }, 1600);
    } catch (err) {
      console.error("Form submission error:", err);
      setErrors({ general: "Failed to submit form. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };
  // ✅ Submit handler

  const startFieldRecording = async (fieldId: string) => {
    try {
      if (!voiceRecordingService.isRecordingSupported()) {
        alert("Voice recording is not supported in this browser");
        return;
      }
      setRecordingFieldId(fieldId);
      await voiceRecordingService.startRecording();
    } catch (e) {
      console.error(e);
      setRecordingFieldId(null);
    }
  };

  const stopFieldRecording = async (fieldId: string) => {
    if (recordingFieldId !== fieldId) return;
    try {
      const response = await voiceRecordingService.completeRecording(currentLanguage);
      setRecordingFieldId(null);
      if (response.success && response.transcription) {
        const cleanedText = response.transcription.replace(/[।.]/g, '');
        const currentVal = responses[fieldId] ?? "";
        const newVal = currentVal + (currentVal && !currentVal.endsWith(' ') ? ' ' : '') + cleanedText;
        handleInputChange(fieldId, newVal, undefined, false);
      }
    } catch (e) {
      console.error(e);
      setRecordingFieldId(null);
    }
  };

  type QuestionType =
    | "text"
    | "email"
    | "phone"
    | "textarea"
    | "select"
    | "radio"
    | "checkbox"
    | "number"
    | "date";

  interface Question {
    id: string;
    label?: string;
    type: QuestionType;
    required?: boolean;
    placeholder?: string;
    options?: string[];
  }

  const renderField = (q: Question) => {
    const baseStyles: React.CSSProperties = {
      width: "100%",
      padding: "12px 16px",
      border: `2px solid ${errors[q.id]
        ? "#ef4444"
        : userPreferences?.themeSettings?.border || "#e5e7eb"
        }`,
      borderRadius: "8px",
      fontSize: "14px",
      color: userPreferences?.themeSettings?.text || "#374151",
      background: userPreferences?.themeSettings?.background || "#ffffff",
      outline: "none",
      fontFamily: "inherit",
      transition: "all 0.2s ease",
      boxSizing: "border-box",
    };

    const val = responses[q.id] ?? "";

    const renderActionButtons = () => (
      <div style={{ position: "absolute", right: 8, top: 0, bottom: 0, display: "flex", alignItems: "center", gap: 4, zIndex: 5 }}>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (recordingFieldId === q.id) {
              stopFieldRecording(q.id);
            } else {
              if (recordingFieldId) stopFieldRecording(recordingFieldId);
              startFieldRecording(q.id);
            }
          }}
          style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: recordingFieldId === q.id ? "#ef4444" : "#9ca3af", borderRadius: "50%" }}
        >
          {recordingFieldId === q.id ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setActiveInputId(q.id);
            setVirtualKeyboardOpen(true);
          }}
          style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", borderRadius: "50%" }}
        >
          <Keyboard size={18} />
        </button>
      </div>
    );

    switch (q.type) {
      case "email":
      case "phone":
      case "number":
        return (
          <input
            type={
              q.type === "number"
                ? "number"
                : q.type === "phone"
                  ? "tel"
                  : q.type
            }
            placeholder={q.placeholder}
            value={val}
            onChange={(e) => handleInputChange(q.id, e.target.value, q.type, q.required)}
            style={baseStyles}
            aria-label={q.label || q.id}
          />
        );
      case "text":
        return (
          <div style={{ position: "relative", width: "100%" }}>
            <input
              type="text"
              placeholder={q.placeholder}
              value={val}
              onChange={(e) => handleInputChange(q.id, e.target.value, q.type, q.required)}
              style={{ ...baseStyles, paddingRight: 70 }}
              aria-label={q.label || q.id}
            />
            {renderActionButtons()}
          </div>
        );
      case "textarea":
        return (
          <div style={{ position: "relative", width: "100%" }}>
            <textarea
              rows={4}
              placeholder={q.placeholder}
              value={val}
              onChange={(e) => handleInputChange(q.id, e.target.value, q.type, q.required)}
              style={{ ...baseStyles, resize: "vertical", minHeight: "100px", paddingRight: 70 }}
              aria-label={q.label || q.id}
            />
            <div style={{ position: "absolute", right: 8, top: 12, display: "flex", gap: 6 }}>
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (recordingFieldId === q.id) {
                    stopFieldRecording(q.id);
                  } else {
                    if (recordingFieldId) stopFieldRecording(recordingFieldId);
                    startFieldRecording(q.id);
                  }
                }}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, color: recordingFieldId === q.id ? "#ef4444" : "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {recordingFieldId === q.id ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <button
                type="button"
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveInputId(q.id);
                  setVirtualKeyboardOpen(true);
                }}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, color: "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Keyboard size={18} />
              </button>
            </div>
          </div>
        );
      case "select":
        return (
          <select
            value={val}
            onChange={(e) =>
              handleInputChange(q.id, e.target.value, q.type, q.required)
            }
            style={baseStyles}
            aria-label={q.label || q.id}
          >
            <option value="">{`Select ${q.label ?? ""}`}</option>
            {q.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case "radio":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {q.options?.map((opt) => (
              <label
                key={opt}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={opt}
                  checked={val === opt}
                  onChange={(e) =>
                    handleInputChange(q.id, e.target.value, q.type, q.required)
                  }
                  style={{
                    accentColor: userPreferences?.colorTheme || "#4285f4",
                  }}
                />
                <span style={{ fontSize: 14 }}>{opt}</span>
              </label>
            ))}
          </div>
        );
      case "checkbox":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(q.options || []).map((opt) => {
              const arr = Array.isArray(val) ? val : [];
              return (
                <label
                  key={opt}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <input
                    type="checkbox"
                    checked={arr.includes(opt)}
                    onChange={(e) => {
                      const current = Array.isArray(val) ? val : [];
                      const updated = e.target.checked
                        ? [...current, opt]
                        : current.filter((v) => v !== opt);
                      handleInputChange(q.id, updated, q.type, q.required);
                    }}
                    style={{
                      accentColor: userPreferences?.colorTheme || "#4285f4",
                    }}
                  />
                  <span style={{ fontSize: 14 }}>{opt}</span>
                </label>
              );
            })}
          </div>
        );
      case "date":
        return (
          <input
            type="date"
            value={val}
            onChange={(e) =>
              handleInputChange(q.id, e.target.value, q.type, q.required)
            }
            style={baseStyles}
          />
        );
      default:
        return (
          <div style={{ position: "relative", width: "100%" }}>
            <input
              type="text"
              placeholder={q.placeholder}
              value={val}
              onChange={(e) => handleInputChange(q.id, e.target.value, q.type, q.required)}
              style={{ ...baseStyles, paddingRight: 70 }}
            />
            {renderActionButtons()}
          </div>
        );
    }
  };

  // stable key for AnimatePresence child (helps avoid duplicate-child issues)
  const dialogKey =
    formData?._id || formData?.id || currentCategory || "form_dialog";

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key={String(dialogKey)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0)",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(4px)",
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: userPreferences?.themeSettings?.surface || "#fff",
                borderRadius: 16,
                padding: 0,
                width: "90%",
                maxWidth: 500,
                maxHeight: "90vh",
                overflow: "hidden",
                border: `1px solid ${userPreferences?.themeSettings?.border || "#e5e7eb"
                  }`,
                boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
              }}
              role="dialog"
              aria-modal="true"
              aria-label={translatedForm?.title || currentCategory || "Form dialog"}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "20px 24px",
                  borderBottom: `1px solid ${userPreferences?.themeSettings?.border || "#e5e7eb"
                    }`,
                  background: userPreferences?.colorTheme || "#4285f4",
                  color: "white",
                }}
              >
                <div style={{ flex: 1 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                  >
                    {translatedForm?.title || currentCategory}
                  </h2>

                  {/* ⭐ Description BELOW the title, small, no background */}
                  {translatedForm?.description && (
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 12,
                        opacity: 0.85,
                        fontWeight: 400,
                        color: "white",
                      }}
                    >
                      {translatedForm.description}
                    </p>
                  )}
                </div>

                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.06, rotate: 90 }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    background: "rgba(255,255,255,0.16)",
                    border: "none",
                    borderRadius: "50%",
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "white",
                  }}
                  aria-label="Close"
                >
                  <X size={18} />
                </motion.button>
              </div>

              <div
                style={{
                  padding: 24,
                  maxHeight: "calc(90vh - 140px)",
                  overflowY: "auto",
                }}
              >
                {isTranslating ? (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px" }}>
                    <Loader className="animate-spin" size={32} color={userPreferences?.colorTheme || "#4285f4"} />
                  </div>
                ) : isSubmitted ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ textAlign: "center", padding: "40px 20px" }}
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
                      style={{
                        width: 64,
                        height: 64,
                        background: "#22c55e",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 16px",
                        color: "white",
                      }}
                    >
                      <CheckCircle size={32} />
                    </motion.div>
                    <h3
                      style={{
                        margin: "0 0 8px",
                        color: userPreferences?.themeSettings?.text || "#374151",
                        fontSize: 18,
                      }}
                    >
                      Form Submitted Successfully!
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        color:
                          userPreferences?.themeSettings?.textSecondary ||
                          "#6b7280",
                        fontSize: 14,
                      }}
                    >
                      Thank you for your response. This dialog will close
                      automatically.
                    </p>
                  </motion.div>
                ) : (
                  <div>
                    {errors.general && (
                      <div
                        style={{
                          marginBottom: 20,
                          padding: "12px 16px",
                          background: "#fef2f2",
                          border: "1px solid #fecaca",
                          borderRadius: 8,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <AlertCircle size={16} color="#ef4444" />
                        <span style={{ color: "#ef4444", fontSize: 14 }}>
                          {errors.general}
                        </span>
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 20,
                      }}
                    >
                      {questions.map((q: any, i: number) => (
                        <motion.div
                          key={q.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                        >
                          <label
                            style={{
                              display: "block",
                              marginBottom: 8,
                              fontSize: 14,
                              fontWeight: 500,
                              color:
                                userPreferences?.themeSettings?.text || "#374151",
                            }}
                          >
                            {q.label}
                            {q.required && (
                              <span style={{ color: "#ef4444", marginLeft: 6 }}>
                                *
                              </span>
                            )}
                          </label>
                          {renderField(q)}
                          {errors[q.id] && (
                            <motion.div
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              style={{
                                marginTop: 6,
                                color: "#ef4444",
                                fontSize: 12,
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <AlertCircle size={12} /> {errors[q.id]}
                            </motion.div>
                          )}
                        </motion.div>
                      ))}
                    </div>

                    <motion.button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                      whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                      style={{
                        width: "100%",
                        padding: "14px 20px",
                        marginTop: 28,
                        background: isSubmitting
                          ? "#9ca3af"
                          : userPreferences?.colorTheme || "#4285f4",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                      aria-disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              border: "2px solid #ffffff40",
                              borderTop: "2px solid #ffffff",
                              borderRadius: "50%",
                              animation: "spin 1s linear infinite",
                            }}
                          />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send size={16} /> Submit Form
                        </>
                      )}
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
        <style>{`@keyframes spin { 0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);} }`}</style>
      </AnimatePresence>
      <VirtualKeyboard
        isOpen={virtualKeyboardOpen && activeInputId !== null}
        onClose={() => setVirtualKeyboardOpen(false)}
        currentText={(activeInputId && responses[activeInputId]) ?? ""}
        onTextInput={(text) => activeInputId && handleInputChange(activeInputId, text, undefined, false)}
        showLanguageSelection={true}
        closeOnSubmit={true}
      />
    </>
  );
};

export default FormDialog;

import { useState, useEffect, useRef, useContext, useCallback } from "react";
import { AuthContext } from "../../context/AuthContext.jsx";
import { SettingsContext } from "../../context/SettingsContext.jsx";
import {
  askPropertyQuestion,
  fetchPropertyChatHistory,
} from "../../utils/apiClient.js";
import ScheduleVisitModal from "./ScheduleVisitModal.jsx";

// Predefined quick questions in English & Tamil
const QUICK_QUESTIONS = {
  en: [
    "What is the monthly rent?",
    "Is parking available?",
    "Is this apartment furnished?",
    "How many bedrooms & bathrooms?",
    "Is there a lift?",
    "Is this property near a school?",
    "Can I have a pet?",
    "When is the property available?",
    "Is there a security deposit?",
    "Can I schedule a visit?",
  ],
  ta: [
    "மாத வாடகை என்ன?",
    "இங்கே parking வசதி இருக்கிறதா?",
    "வீடு furnishing செய்யப்பட்டுள்ளதா?",
    "எத்தனை படுக்கையறைகள் உள்ளன?",
    "லிப்ட் வசதி உள்ளதா?",
    "பள்ளி அருகில் உள்ளதா?",
    "செல்லப்பிராணிகள் அனுமதிக்கப்படுமா?",
    "வீடு எப்போது கிடைக்கும்?",
    "பாதுகாப்பு முன்பணம் எவ்வளவு?",
    "நேரில் வந்து பார்க்கலாமா?",
  ],
};

export default function PropertyChatModal({ property, onClose, initialQuestion = "" }) {
  const { user } = useContext(AuthContext);
  const { formatCurrency } = useContext(SettingsContext);

  const [language, setLanguage] = useState("en"); // 'en' | 'ta'
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(initialQuestion || "");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [currentlyPlayingIndex, setCurrentlyPlayingIndex] = useState(null);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const scrollRef = useRef(null);
  const recognitionRef = useRef(null);

  // Check Web Speech API availability
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = language === "ta" ? "ta-IN" : "en-IN";

      recog.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          // Auto send recognized voice query
          setTimeout(() => {
            handleSendMessage(transcript);
          }, 300);
        }
      };

      recog.onend = () => {
        setIsListening(false);
      };

      recog.onerror = (err) => {
        console.warn("Speech recognition error:", err.error);
        setIsListening(false);
      };

      recognitionRef.current = recog;
    }
  }, [language]);

  // Update speech recognition language when toggle changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === "ta" ? "ta-IN" : "en-IN";
    }
  }, [language]);

  // Load chat history or initial welcome
  useEffect(() => {
    let isMounted = true;
    async function loadHistory() {
      if (!property?.id) return;
      try {
        const history = await fetchPropertyChatHistory(property.id, user?.id || user?.entityId || "TEN001");
        if (isMounted && history && history.length > 0) {
          setMessages(history);
        } else if (isMounted) {
          // Initial property-specific greeting
          const welcome =
            language === "ta"
              ? `வணக்கம்! நான் **${property.name}** குறித்த உங்கள் சொத்து வழிகாட்டி.\n\nஇந்த வீட்டின் வாடகை, பார்க்கிங், படுக்கையறைகள், லிப்ட், அருகிலுள்ள பள்ளிகள் அல்லது விசிட் முன்பதிவு குறித்து என்னிடம் கேட்கலாம்.`
              : `Hello! I am your dedicated Property Assistant for **${property.name}**.\n\nYou can ask me about rent, parking, bedrooms, lift, furnishing, pet policy, nearby schools, or schedule an in-person visit.`;

          setMessages([
            {
              sender: "assistant",
              text: welcome,
              audioText: language === "ta" 
                ? `வணக்கம்! நான் ${property.name} குறித்த உங்கள் சொத்து வழிகாட்டி. எதையும் கேட்கலாம்.`
                : `Hello! I am your property assistant for ${property.name}. How can I assist you?`,
              timestamp: new Date(),
              language,
            },
          ]);
        }
      } catch {
        // Fallback initial greeting
      }
    }
    loadHistory();
    return () => {
      isMounted = false;
      window.speechSynthesis?.cancel();
    };
  }, [property, user, language]);

  // Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Toggle voice recording
  const handleToggleListening = () => {
    if (!speechSupported) {
      alert("Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Could not start speech recognition:", err);
      }
    }
  };

  // Play audio playback using SpeechSynthesis
  const handlePlayAudio = (textToSpeak, msgIndex) => {
    if (!("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported in this browser.");
      return;
    }

    if (currentlyPlayingIndex === msgIndex) {
      window.speechSynthesis.cancel();
      setCurrentlyPlayingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown
    const cleanText = textToSpeak.replace(/[*_#`]/g, "").trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language === "ta" ? "ta-IN" : "en-IN";
    utterance.rate = 0.95;

    // Pick Tamil voice if available
    const voices = window.speechSynthesis.getVoices();
    if (language === "ta") {
      const tamilVoice = voices.find((v) => v.lang.includes("ta") || v.name.toLowerCase().includes("tamil"));
      if (tamilVoice) utterance.voice = tamilVoice;
    }

    utterance.onend = () => setCurrentlyPlayingIndex(null);
    utterance.onerror = () => setCurrentlyPlayingIndex(null);

    setCurrentlyPlayingIndex(msgIndex);
    window.speechSynthesis.speak(utterance);
  };

  // Send message
  const handleSendMessage = useCallback(
    async (textToSend) => {
      const query = (textToSend || input).trim();
      if (!query || loading) return;

      const userMsg = {
        sender: "user",
        text: query,
        timestamp: new Date(),
        language,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const res = await askPropertyQuestion(property?.id || "TN101", {
          message: query,
          language,
          userId: user?.id || user?.entityId || "TEN001",
        });

        if (res?.success) {
          const assistantMsg = {
            sender: "assistant",
            text: res.answer,
            audioText: res.audioText || res.answer,
            triggerEnquiry: res.triggerEnquiry,
            enquiryType: res.enquiryType,
            suggestions: res.suggestions,
            timestamp: new Date(),
            language,
          };
          setMessages((prev) => [...prev, assistantMsg]);
        } else {
          throw new Error(res?.error || "Error getting reply");
        }
      } catch (err) {
        const errorMsg = {
          sender: "assistant",
          text:
            language === "ta"
              ? "மன்னிக்கவும், தகவல் பெறுவதில் சிறு தாமதம் ஏற்பட்டுள்ளது. மீண்டும் முயற்சிக்கவும்."
              : "Sorry, I could not retrieve information right now. Please try again or contact the landlord.",
          audioText: "Sorry, please try again.",
          timestamp: new Date(),
          language,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, property, language, user]
  );

  const quickChips = QUICK_QUESTIONS[language] || QUICK_QUESTIONS.en;

  return (
    <div className="property-chat-backdrop animate-fade-in" onClick={onClose}>
      <div
        className={`property-chat-modal ${isExpanded ? "expanded" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Property Identity */}
        <div className="property-chat-header">
          <div className="property-chat-header-info">
            <img
              src={property?.image || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80"}
              alt={property?.name}
              className="prop-chat-thumb"
            />
            <div className="prop-chat-meta">
              <div className="prop-chat-tag">
                <span className="dot online" /> Property Chat
              </div>
              <h3 className="prop-chat-title" title={property?.name}>
                {property?.name}
              </h3>
              <div className="prop-chat-subtitle">
                <span>{property?.bedrooms ? `${property.bedrooms} BHK` : "Property"}</span>
                <span>•</span>
                <span className="prop-chat-rent">{formatCurrency(property?.rent || 0)}/mo</span>
                <span>•</span>
                <span className={`pill ${(property?.status || "").toLowerCase() === "occupied" ? "paid" : "active"} mini-pill`}>
                  {property?.status || "Available"}
                </span>
              </div>
            </div>
          </div>

          <div className="property-chat-header-actions">
            {/* Language Switcher */}
            <div className="prop-lang-toggle">
              <button
                type="button"
                className={`lang-btn ${language === "en" ? "active" : ""}`}
                onClick={() => setLanguage("en")}
                title="Switch to English"
              >
                English
              </button>
              <button
                type="button"
                className={`lang-btn ${language === "ta" ? "active" : ""}`}
                onClick={() => setLanguage("ta")}
                title="தமிழுக்கு மாறவும்"
              >
                தமிழ்
              </button>
            </div>

            <button
              type="button"
              className="chat-action-btn"
              onClick={() => setIsExpanded((v) => !v)}
              title={isExpanded ? "Standard view" : "Expand view"}
            >
              {isExpanded ? "🗗" : "⤢"}
            </button>
            <button type="button" className="chat-action-btn close-btn" onClick={onClose} title="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="property-chat-body" ref={scrollRef}>
          <div className="prop-chat-disclaimer">
            <span>🛡️</span> All answers are verified against <strong>{property?.name}</strong> database specifications.
          </div>

          {messages.map((m, idx) => {
            const isAssistant = m.sender === "assistant";
            return (
              <div key={idx} className={`prop-chat-row ${m.sender}`}>
                {isAssistant && <div className="prop-avatar">🏡</div>}

                <div className="prop-chat-bubble-wrap">
                  <div className={`prop-chat-bubble ${m.sender}`}>
                    {m.text.split("\n").map((line, lIdx) => (
                      <div key={lIdx} style={{ minHeight: line.trim() === "" ? "8px" : "auto" }}>
                        {line}
                      </div>
                    ))}
                  </div>

                  {/* Actions for Assistant Message: Play Voice / Schedule Visit */}
                  {isAssistant && (
                    <div className="bubble-actions">
                      <button
                        type="button"
                        className={`audio-btn ${currentlyPlayingIndex === idx ? "playing" : ""}`}
                        onClick={() => handlePlayAudio(m.audioText || m.text, idx)}
                        title={currentlyPlayingIndex === idx ? "Stop speaking" : "Listen to this answer"}
                      >
                        {currentlyPlayingIndex === idx ? "⏹️ Stop" : "🔊 Listen"}
                      </button>

                      {m.triggerEnquiry && (
                        <button
                          type="button"
                          className="enquiry-action-btn"
                          onClick={() => setShowVisitModal(true)}
                        >
                          📅 {language === "ta" ? "நேரில் பார்வையிட / விசிட் முன்பதிவு" : "Schedule In-Person Visit"}
                        </button>
                      )}
                    </div>
                  )}

                  <span className="prop-msg-time">
                    {new Date(m.timestamp || Date.now()).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="prop-chat-row assistant">
              <div className="prop-avatar">🏡</div>
              <div className="prop-chat-bubble assistant typing-bubble">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}
        </div>

        {/* Quick Question Chips */}
        <div className="prop-chat-quick-chips">
          <span className="quick-label">
            {language === "ta" ? "விரைவு கேள்விகள்:" : "Suggested Questions:"}
          </span>
          <div className="chips-scroller">
            {quickChips.map((q, i) => (
              <button key={i} type="button" className="quick-chip" onClick={() => handleSendMessage(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar with Voice & Text */}
        <div className="property-chat-input-bar">
          {/* Active Listening Indicator */}
          {isListening && (
            <div className="listening-indicator animate-fade-in">
              <div className="pulse-circle" />
              <span>
                {language === "ta"
                  ? "கேட்கிறது... தமிழில் பேசவும்..."
                  : "Listening... Speak your question now..."}
              </span>
            </div>
          )}

          <form
            className="prop-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            {/* Microphone Button */}
            <button
              type="button"
              className={`voice-mic-btn ${isListening ? "active" : ""}`}
              onClick={handleToggleListening}
              title={isListening ? "Stop listening" : "Click to speak in " + (language === "ta" ? "Tamil" : "English")}
            >
              {isListening ? "🔴" : "🎙️"}
            </button>

            <input
              type="text"
              className="prop-text-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                language === "ta"
                  ? `${property?.name} குறித்து ஏதேனும் கேட்கவும் அல்லது பேசவும்…`
                  : `Ask anything about ${property?.name || "this property"}…`
              }
              disabled={loading}
            />

            <button
              type="button"
              className="btn-outline schedule-visit-btn"
              onClick={() => setShowVisitModal(true)}
              title="Schedule Visit"
            >
              📅 {language === "ta" ? "விசிட்" : "Visit"}
            </button>

            <button
              type="submit"
              className="btn-primary prop-send-btn"
              disabled={!input.trim() || loading}
            >
              ➤
            </button>
          </form>
        </div>

        {/* Schedule Visit Modal Integration */}
        {showVisitModal && (
          <ScheduleVisitModal
            property={property}
            onClose={() => setShowVisitModal(false)}
            onSuccess={() => {
              const successText =
                language === "ta"
                  ? "✅ உங்கள் விசிட் கோரிக்கை வெற்றிகரமாக பதிவு செய்யப்பட்டது! உரிமையாளர் விரைவில் உங்களை தொடர்புகொள்வார்."
                  : "✅ Your visit request has been successfully submitted! The property manager will reach out shortly.";

              setMessages((prev) => [
                ...prev,
                {
                  sender: "assistant",
                  text: successText,
                  audioText: successText,
                  timestamp: new Date(),
                  language,
                },
              ]);
            }}
          />
        )}
      </div>
    </div>
  );
}

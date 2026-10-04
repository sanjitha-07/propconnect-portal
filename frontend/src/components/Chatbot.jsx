import { useContext, useState, useRef, useEffect, useCallback } from "react";
import { AuthContext } from "../context/AuthContext.jsx";
import { SettingsContext } from "../context/SettingsContext.jsx";
import { getBotReply } from "../utils/chatbotEngine.js";

export default function Chatbot() {
  const { user } = useContext(AuthContext);
  const { t, lang } = useContext(SettingsContext);

  const [open, setOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  // Greet once, the first time the panel is opened.
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ from: "bot", text: t("botGreeting") }]);
    }
  }, [open, messages.length, t]);

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, open]);

  const handleSend = useCallback(
    (e) => {
      e?.preventDefault();
      const query = input.trim();
      if (!query) return;

      const reply = getBotReply(query, user, t, lang);
      setMessages((prev) => [...prev, { from: "user", text: query }, { from: "bot", text: reply }]);
      setInput("");
    },
    [input, user, t, lang]
  );

  const handleSuggestion = useCallback(
    (query) => {
      const reply = getBotReply(query, user, t, lang);
      setMessages((prev) => [...prev, { from: "user", text: query }, { from: "bot", text: reply }]);
    },
    [user, t, lang]
  );

  const handleClear = () => {
    setMessages([{ from: "bot", text: t("botGreeting") }]);
  };

  const isTamil = lang === "ta";

  // Role-appropriate quick suggestions
  const tenantSuggestions = [
    {
      label: t("botSuggestRent") || "💰 Rent & Due Date",
      query: isTamil ? "எனது மாத வாடகை எவ்வளவு?" : "What is my rent and due date?",
    },
    {
      label: t("botSuggestProperty") || "⌂ My Flat & Landlord",
      query: isTamil ? "எனது குடியிருப்பு மற்றும் உரிமையாளர் விவரங்கள்" : "What is my property and landlord details?",
    },
    {
      label: t("botSuggestMaintenance") || "🔧 Pending maintenance?",
      query: isTamil ? "நிலுவையில் உள்ள பராமரிப்பு கோரிக்கைகள்?" : "Any pending maintenance requests?",
    },
    {
      label: t("botSuggestComplaints") || "📋 Unresolved complaints?",
      query: isTamil ? "தீர்க்கப்படாத புகார்கள் உள்ளனவா?" : "What complaints are not resolved?",
    },
    {
      label: t("botSuggestUtility") || "⚡ Utility & EB Bills",
      query: isTamil ? "எனது TNEB மின் கட்டணம் மற்றும் பயன்பாட்டு பில்கள்" : "Show utility and electricity bills",
    },
    {
      label: t("botSuggestDeposit") || "📄 Lease & Deposit",
      query: isTamil ? "எனது குத்தகை மற்றும் பாதுகாப்பு முன்பணம்" : "What is my lease and security deposit?",
    },
  ];

  const genericSuggestions = [
    { label: t("botSuggestPayments"), query: "How much do I need to pay?" },
    { label: t("botSuggestComplaints"), query: "What complaints are not resolved?" },
    { label: t("botSuggestMaintenance"), query: "Any pending maintenance requests?" },
    { label: t("botSuggestDocuments"), query: "Any documents pending verification?" },
  ];

  const suggestions = user?.role === "tenant" ? tenantSuggestions : genericSuggestions;

  return (
    <>
      <button
        className="chatbot-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("chatbotTitle")}
      >
        {open ? "✕" : "💬"}
      </button>

      {open && (
        <div className={`chatbot-panel ${isExpanded ? "expanded" : ""}`}>
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <span className="chatbot-avatar">🤖</span>
              <div>
                <div className="chatbot-title">{t("chatbotTitle")}</div>
                <div className="chatbot-subtitle">{t("chatbotSubtitle")}</div>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button
                type="button"
                className="chatbot-icon-btn"
                title="Restart conversation"
                onClick={handleClear}
              >
                ↺
              </button>
              <button
                type="button"
                className="chatbot-icon-btn"
                title={isExpanded ? "Standard height" : "Expand full height"}
                onClick={() => setIsExpanded((v) => !v)}
              >
                {isExpanded ? "🗗" : "⤢"}
              </button>
              <button
                type="button"
                className="chatbot-icon-btn"
                title="Close chatbot"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="chatbot-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chatbot-bubble ${m.from}`}>
                {m.text.split("\n").map((line, j) => (
                  <div key={j} style={{ minHeight: line.trim() === "" ? "8px" : "auto" }}>
                    {line}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="chatbot-suggestions">
            {suggestions.map((s, idx) => (
              <button key={idx} onClick={() => handleSuggestion(s.query)}>
                {s.label}
              </button>
            ))}
          </div>

          <form className="chatbot-input-row" onSubmit={handleSend}>
            <input
              className="inp"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("chatbotPlaceholder")}
            />
            <button type="submit" className="btn-primary" style={{ padding: "0 18px" }}>
              {t("submit")}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

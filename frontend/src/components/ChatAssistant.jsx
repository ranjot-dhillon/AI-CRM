import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Bot, User, Send, AlertTriangle, Lightbulb, FileText, Wand2 } from "lucide-react";
import { addMessage, setTyping } from "../store/chatSlice";
import {
  mergeFormData,
  setAutofilledFields,
  setMissingFields,
  setSuggestedFollowups,
  setSummary,
  setCreatedVia,
} from "../store/interactionSlice";
import { sendChatMessage } from "../api/client";

const QUICK_ACTIONS = [
  { icon: AlertTriangle, label: "What's missing?", text: "What information is still missing?" },
  { icon: Lightbulb, label: "Suggest follow-ups", text: "Suggest smart follow-up actions for this interaction." },
  { icon: FileText, label: "Summarize", text: "Generate a summary of this interaction." },
];

export default function ChatAssistant() {
  const dispatch = useDispatch();
  const { sessionId, messages, isTyping } = useSelector((s) => s.chat);
  const interaction = useSelector((s) => s.interaction);
  const [input, setInput] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const currentFormData = () => ({
    hcp_name: interaction.hcp_name,
    interaction_type: interaction.interaction_type,
    date: interaction.date,
    time: interaction.time,
    attendees: interaction.attendees,
    topics_discussed: interaction.topics_discussed,
    materials_shared: interaction.materials_shared,
    samples_distributed: interaction.samples_distributed,
    sentiment: interaction.sentiment,
    outcomes: interaction.outcomes,
    follow_up_actions: interaction.follow_up_actions,
  });

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message) return;
    dispatch(addMessage({ role: "user", text: message }));
    setInput("");
    dispatch(setTyping(true));
    try {
      const result = await sendChatMessage({
        sessionId,
        message,
        formData: currentFormData(),
      });
      dispatch(mergeFormData(result.form_data));
      if (result.autofilled_fields?.length) {
        dispatch(setAutofilledFields(result.autofilled_fields));
        dispatch(setCreatedVia("chat"));
      }
      dispatch(setMissingFields(result.missing_fields || []));
      if (result.suggested_followups?.length) dispatch(setSuggestedFollowups(result.suggested_followups));
      if (result.summary) dispatch(setSummary(result.summary));
      dispatch(
        addMessage({
          role: "assistant",
          text: result.assistant_reply,
          trace: result.tool_trace,
        })
      );
    } catch (err) {
      console.error(err);
      dispatch(
        addMessage({
          role: "assistant",
          text: "I couldn't reach the AI backend. Make sure the FastAPI server is running and GROQ_API_KEY is set.",
        })
      );
    } finally {
      dispatch(setTyping(false));
    }
  };

  return (
    <>
      <div className="chat-header">
        <div className="chat-header-title">
          <span className="dot" />
          AI Assistant
        </div>
        <div className="chat-header-sub">Log this interaction via chat — the form fills itself.</div>
      </div>

      <div className="chat-messages" ref={listRef}>
        {messages.map((m) => (
          <div key={m.id}>
            <div className={`msg ${m.role}`}>
              <div className="msg-avatar">{m.role === "assistant" ? <Bot size={14} /> : <User size={14} />}</div>
              <div className="msg-bubble">{m.text}</div>
            </div>
            {m.trace && m.trace.length > 0 && (
              <div className="tool-trace-line" title={m.trace.join("\n")}>
                <Wand2 size={10} style={{ verticalAlign: -1 }} /> {m.trace.length} tool call(s) run
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="msg assistant">
            <div className="msg-avatar"><Bot size={14} /></div>
            <div className="typing-indicator"><span /><span /><span /></div>
          </div>
        )}
      </div>

      <div className="chip-suggestions">
        {QUICK_ACTIONS.map((qa) => (
          <button key={qa.label} className="quick-chip" onClick={() => send(qa.text)}>
            <qa.icon size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
            {qa.label}
          </button>
        ))}
      </div>

      <div className="chat-input-row">
        <input
          type="text"
          placeholder="Describe interaction…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="send-btn" onClick={() => send()} disabled={!input.trim()}>
          <Send size={15} />
        </button>
      </div>
    </>
  );
}

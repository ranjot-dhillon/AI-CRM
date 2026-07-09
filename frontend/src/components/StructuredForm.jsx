import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Mic, Sparkles, X, Plus, Package, FileText, Smile, Meh, Frown } from "lucide-react";
import {
  setField,
  addListItem,
  removeListItem,
  clearAutofilledFields,
  acceptSuggestedFollowup,
} from "../store/interactionSlice";
import ChipField from "./ChipField";

const INTERACTION_TYPES = ["Meeting", "Call", "Email", "Conference", "Virtual Meeting"];

export default function StructuredForm() {
  const dispatch = useDispatch();
  const interaction = useSelector((s) => s.interaction);
  const autofilled = interaction.autofilled_fields || [];

  useEffect(() => {
    if (autofilled.length === 0) return;
    const t = setTimeout(() => dispatch(clearAutofilledFields()), 2600);
    return () => clearTimeout(t);
  }, [autofilled, dispatch]);

  const isAuto = (field) => autofilled.includes(field);
  const on = (field) => (e) => dispatch(setField({ field, value: e.target.value }));

  return (
    <div className="card">
      <div className="section-title">Interaction Details</div>

      <div className="field-row">
        <Field id="hcp_name" label="HCP Name" auto={isAuto("hcp_name")}>
          <input
            id="field-hcp_name"
            type="text"
            placeholder="Search or select HCP…"
            value={interaction.hcp_name}
            onChange={on("hcp_name")}
          />
        </Field>
        <Field id="interaction_type" label="Interaction Type" auto={isAuto("interaction_type")}>
          <select id="field-interaction_type" value={interaction.interaction_type} onChange={on("interaction_type")}>
            {INTERACTION_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="field-row">
        <Field id="date" label="Date" auto={isAuto("date")}>
          <input id="field-date" type="text" placeholder="DD-MM-YYYY" value={interaction.date} onChange={on("date")} />
        </Field>
        <Field id="time" label="Time" auto={isAuto("time")}>
          <input id="field-time" type="text" placeholder="HH:MM" value={interaction.time} onChange={on("time")} />
        </Field>
      </div>

      <Field id="attendees" label="Attendees" auto={isAuto("attendees")}>
        <ChipField
          id="field-attendees"
          placeholder="Enter names or search…"
          items={interaction.attendees}
          onAdd={(v) => dispatch(addListItem({ field: "attendees", value: v }))}
          onRemove={(i) => dispatch(removeListItem({ field: "attendees", index: i }))}
        />
      </Field>

      <Field id="topics_discussed" label="Topics Discussed" auto={isAuto("topics_discussed")}>
        <div style={{ position: "relative" }}>
          <textarea
            id="field-topics_discussed"
            rows={3}
            placeholder="Enter key discussion points…"
            value={interaction.topics_discussed}
            onChange={on("topics_discussed")}
          />
          <button className="mic-btn" title="Voice input" type="button">
            <Mic size={16} />
          </button>
        </div>
        <button className="voice-btn" type="button">
          <Sparkles size={13} /> Summarize from Voice Note (Requires Consent)
        </button>
      </Field>

      <div className="section-title"><Package size={13} /> Materials Shared / Samples Distributed</div>

      <Field id="materials_shared" label="Materials Shared" auto={isAuto("materials_shared")}>
        <ChipField
          id="field-materials_shared"
          placeholder="Search / add material…"
          items={interaction.materials_shared}
          onAdd={(v) => dispatch(addListItem({ field: "materials_shared", value: v }))}
          onRemove={(i) => dispatch(removeListItem({ field: "materials_shared", index: i }))}
        />
      </Field>

      <Field id="samples_distributed" label="Samples Distributed" auto={isAuto("samples_distributed")}>
        <ChipField
          id="field-samples_distributed"
          placeholder="Add sample…"
          items={interaction.samples_distributed}
          onAdd={(v) => dispatch(addListItem({ field: "samples_distributed", value: v }))}
          onRemove={(i) => dispatch(removeListItem({ field: "samples_distributed", index: i }))}
        />
      </Field>

      <Field id="sentiment" label="Observed/Inferred HCP Sentiment" auto={isAuto("sentiment")}>
        <div id="field-sentiment" className="sentiment-row" tabIndex={-1}>
          <SentimentOption
            kind="positive"
            icon={<Smile size={18} />}
            active={interaction.sentiment === "Positive"}
            onClick={() => dispatch(setField({ field: "sentiment", value: "Positive" }))}
          />
          <SentimentOption
            kind="neutral"
            icon={<Meh size={18} />}
            active={interaction.sentiment === "Neutral"}
            onClick={() => dispatch(setField({ field: "sentiment", value: "Neutral" }))}
          />
          <SentimentOption
            kind="negative"
            icon={<Frown size={18} />}
            active={interaction.sentiment === "Negative"}
            onClick={() => dispatch(setField({ field: "sentiment", value: "Negative" }))}
          />
        </div>
      </Field>

      <Field id="outcomes" label="Outcomes" auto={isAuto("outcomes")}>
        <textarea
          id="field-outcomes"
          rows={2}
          placeholder="Key outcomes or agreements…"
          value={interaction.outcomes}
          onChange={on("outcomes")}
        />
      </Field>

      <Field id="follow_up_actions" label="Follow-up Actions" auto={isAuto("follow_up_actions")}>
        <ChipField
          id="field-follow_up_actions"
          placeholder="Enter next steps or tasks…"
          items={interaction.follow_up_actions}
          onAdd={(v) => dispatch(addListItem({ field: "follow_up_actions", value: v }))}
          onRemove={(i) => dispatch(removeListItem({ field: "follow_up_actions", index: i }))}
        />
      </Field>

      {interaction.ai_suggested_followups.length > 0 && (
        <div>
          <div className="mini-row">
            <h4><FileText size={13} style={{ verticalAlign: -2 }} /> AI Suggested Follow-ups</h4>
          </div>
          <div className="suggestion-list">
            {interaction.ai_suggested_followups.map((s) => (
              <div className="suggestion-item" key={s}>
                <span>{s}</span>
                <button onClick={() => dispatch(acceptSuggestedFollowup(s))} title="Add to Follow-up Actions">
                  <Plus size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {interaction.summary && (
        <div className="section-title" style={{ marginTop: 22 }}>AI-Generated Summary</div>
      )}
      {interaction.summary && (
        <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.5 }}>{interaction.summary}</p>
      )}
    </div>
  );
}

function Field({ id, label, children, auto }) {
  return (
    <div className={`field ${auto ? "autofilled" : ""}`}>
      <label htmlFor={`field-${id}`}>{label}</label>
      {auto && <span className="ai-badge"><Sparkles size={9} /> AI</span>}
      {children}
    </div>
  );
}

function SentimentOption({ kind, icon, active, onClick }) {
  const label = kind[0].toUpperCase() + kind.slice(1);
  return (
    <div className={`sentiment-option ${kind} ${active ? "active" : ""}`} onClick={onClick}>
      <span className="emoji">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

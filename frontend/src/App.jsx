import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ClipboardList, Save, ChevronLeft } from "lucide-react";
import StructuredForm from "./components/StructuredForm";
import ChatAssistant from "./components/ChatAssistant";
import MissingInfoBanner from "./components/MissingInfoBanner";
import { saveInteraction } from "./api/client";
import { setSavingStatus } from "./store/interactionSlice";

export default function App() {
  const dispatch = useDispatch();
  const interaction = useSelector((s) => s.interaction);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    dispatch(setSavingStatus({ status: "saving" }));
    try {
      const payload = { ...interaction };
      delete payload.saveStatus;
      delete payload.savedId;
      delete payload.missing_fields;
      delete payload.autofilled_fields;
      const result = await saveInteraction(payload);
      dispatch(setSavingStatus({ status: "saved", id: result.id }));
    } catch (err) {
      console.error(err);
      dispatch(setSavingStatus({ status: "error" }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="topbar-left">
          <ChevronLeft size={18} color="var(--text-muted)" />
          <ClipboardList size={20} color="var(--primary)" />
          <span className="topbar-title">Log HCP Interaction</span>
          <span className="topbar-eyebrow">AI-First CRM</span>
        </div>
        <div className="topbar-actions">
          <StatusPill status={interaction.saveStatus} />
          <button className="btn btn-ghost">Save as Draft</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={15} />
            {saving ? "Saving…" : "Save Interaction"}
          </button>
        </div>
      </div>

      <MissingInfoBanner />

      <div className="main-grid">
        <div className="form-pane">
          <StructuredForm />
        </div>
        <div className="chat-pane">
          <ChatAssistant />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    idle: "Unsaved changes",
    saving: "Saving…",
    saved: "Saved ✓",
    error: "Save failed",
  };
  const cls = status === "saved" ? "saved" : status === "saving" ? "saving" : "idle";
  return <span className={`status-pill ${cls}`}>{map[status] || map.idle}</span>;
}

import React from "react";
import { useSelector } from "react-redux";
import { AlertTriangle } from "lucide-react";

const LABELS = {
  hcp_name: "HCP Name",
  interaction_type: "Interaction Type",
  date: "Date",
  topics_discussed: "Topics Discussed",
  sentiment: "Sentiment",
};

export default function MissingInfoBanner() {
  const missing = useSelector((s) => s.interaction.missing_fields);

  if (!missing || missing.length === 0) return null;

  const scrollToField = (field) => {
    const el = document.getElementById(`field-${field}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus?.();
    }
  };

  return (
    <div className="missing-banner">
      <AlertTriangle size={15} />
      <strong>Missing required info:</strong>
      {missing.map((f) => (
        <button key={f} className="missing-chip" onClick={() => scrollToField(f)}>
          {LABELS[f] || f}
        </button>
      ))}
    </div>
  );
}

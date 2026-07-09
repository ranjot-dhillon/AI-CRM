import React, { useState } from "react";
import { X } from "lucide-react";

export default function ChipField({ id, items, onAdd, onRemove, placeholder }) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const value = draft.trim();
    if (value) onAdd(value);
    setDraft("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && draft === "" && items.length > 0) {
      onRemove(items.length - 1);
    }
  };

  return (
    <div className="chip-box" id={id}>
      {items.map((item, i) => (
        <span className="chip" key={`${item}-${i}`}>
          {item}
          <button type="button" onClick={() => onRemove(i)} aria-label={`Remove ${item}`}>
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        className="chip-input"
        type="text"
        placeholder={items.length === 0 ? placeholder : ""}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
      />
    </div>
  );
}

import { createSlice, nanoid } from "@reduxjs/toolkit";

const initialState = {
  hcp_name: "",
  interaction_type: "Meeting",
  date: new Date().toISOString().slice(0, 10).split("-").reverse().join("-"),
  time: new Date().toTimeString().slice(0, 5),
  attendees: [],
  topics_discussed: "",
  materials_shared: [],
  samples_distributed: [],
  sentiment: "Neutral",
  outcomes: "",
  follow_up_actions: [],
  ai_suggested_followups: [],
  summary: "",
  missing_fields: [],
  autofilled_fields: [],
  created_via: "form",
  saveStatus: "idle", // idle | saving | saved | error
  savedId: null,
};

const interactionSlice = createSlice({
  name: "interaction",
  initialState,
  reducers: {
    setField(state, action) {
      const { field, value } = action.payload;
      state[field] = value;
      state.saveStatus = "idle";
    },
    mergeFormData(state, action) {
      Object.entries(action.payload || {}).forEach(([key, value]) => {
        if (key in state) state[key] = value;
      });
      state.saveStatus = "idle";
    },
    addListItem(state, action) {
      const { field, value } = action.payload;
      if (!value) return;
      if (!state[field].includes(value)) state[field] = [...state[field], value];
    },
    removeListItem(state, action) {
      const { field, index } = action.payload;
      state[field] = state[field].filter((_, i) => i !== index);
    },
    setAutofilledFields(state, action) {
      state.autofilled_fields = action.payload;
    },
    clearAutofilledFields(state) {
      state.autofilled_fields = [];
    },
    setMissingFields(state, action) {
      state.missing_fields = action.payload;
    },
    setSuggestedFollowups(state, action) {
      state.ai_suggested_followups = action.payload;
    },
    acceptSuggestedFollowup(state, action) {
      const text = action.payload;
      if (!state.follow_up_actions.includes(text)) {
        state.follow_up_actions = [...state.follow_up_actions, text];
      }
      state.ai_suggested_followups = state.ai_suggested_followups.filter((t) => t !== text);
    },
    setSummary(state, action) {
      state.summary = action.payload;
    },
    setSavingStatus(state, action) {
      state.saveStatus = action.payload.status;
      if (action.payload.id) state.savedId = action.payload.id;
    },
    setCreatedVia(state, action) {
      state.created_via = action.payload;
    },
    resetForm() {
      return { ...initialState, date: initialState.date, time: initialState.time };
    },
  },
});

export const {
  setField,
  mergeFormData,
  addListItem,
  removeListItem,
  setAutofilledFields,
  clearAutofilledFields,
  setMissingFields,
  setSuggestedFollowups,
  acceptSuggestedFollowup,
  setSummary,
  setSavingStatus,
  setCreatedVia,
  resetForm,
} = interactionSlice.actions;

export default interactionSlice.reducer;
export { nanoid };

import { createSlice, nanoid } from "@reduxjs/toolkit";

const initialState = {
  sessionId: nanoid(),
  messages: [
    {
      id: nanoid(),
      role: "assistant",
      text:
        "Log interaction details here (e.g. \"Met Dr. Sharma, discussed OncoBoost Phase III efficacy, she seemed positive, shared the brochure\") or ask for help.",
    },
  ],
  isTyping: false,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addMessage(state, action) {
      state.messages.push({ id: nanoid(), ...action.payload });
    },
    setTyping(state, action) {
      state.isTyping = action.payload;
    },
    resetChat(state) {
      state.messages = initialState.messages;
    },
  },
});

export const { addMessage, setTyping, resetChat } = chatSlice.actions;
export default chatSlice.reducer;

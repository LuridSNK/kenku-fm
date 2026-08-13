import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ConnectionStatus = "disconnected" | "connecting" | "ready";

export interface ConnectionState {
  status: ConnectionStatus;
  activeProfileId: string | null;
  connectingProfileId: string | null;
}

const initialState: ConnectionState = {
  status: "disconnected",
  activeProfileId: null,
  connectingProfileId: null,
};

export const connectionSlice = createSlice({
  name: "connection",
  initialState,
  reducers: {
    startConnecting: (state, action: PayloadAction<string>) => {
      state.status = "connecting";
      state.activeProfileId = null;
      state.connectingProfileId = action.payload;
    },
    startDisconnecting: (state) => {
      state.status = "connecting";
      state.activeProfileId = null;
      state.connectingProfileId = null;
    },
    setReady: (state, action: PayloadAction<string>) => {
      state.status = "ready";
      state.activeProfileId = action.payload;
      state.connectingProfileId = null;
    },
    setDisconnected: (state) => {
      state.status = "disconnected";
      state.activeProfileId = null;
      state.connectingProfileId = null;
    },
  },
});

export const {
  startConnecting,
  startDisconnecting,
  setReady,
  setDisconnected,
} = connectionSlice.actions;

export default connectionSlice.reducer;

import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type StreamingMode = "lowLatency" | "performance";

export type DiscordProfile = {
  id: string;
  name: string;
  token: string;
};

export interface SettingsState {
  discordProfiles: DiscordProfile[];
  selectedDiscordProfileId: string | null;
  urlBarEnabled: boolean;
  remoteEnabled: boolean;
  remoteAddress: string;
  remotePort: string;
  externalInputsEnabled: boolean;
  multipleInputsEnabled: boolean;
  multipleOutputsEnabled: boolean;
  streamingMode: StreamingMode;
}

const initialState: SettingsState = {
  discordProfiles: [],
  selectedDiscordProfileId: null,
  urlBarEnabled: true,
  remoteEnabled: false,
  remoteAddress: "127.0.0.1",
  remotePort: "3333",
  externalInputsEnabled: false,
  multipleInputsEnabled: false,
  multipleOutputsEnabled: false,
  streamingMode: "performance",
};

export const connectionSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    addDiscordProfile: (state, action: PayloadAction<DiscordProfile>) => {
      const profile = action.payload;
      if (
        !profile.name.trim() ||
        !profile.token.trim() ||
        state.discordProfiles.some(
          ({ name }) => name.toLowerCase() === profile.name.toLowerCase(),
        )
      ) {
        return;
      }
      state.discordProfiles.push(profile);
      state.selectedDiscordProfileId = profile.id;
    },
    updateDiscordProfile: (state, action: PayloadAction<DiscordProfile>) => {
      const profile = action.payload;
      const index = state.discordProfiles.findIndex(({ id }) => id === profile.id);
      if (
        index === -1 ||
        !profile.name.trim() ||
        !profile.token.trim() ||
        state.discordProfiles.some(
          ({ id, name }) =>
            id !== profile.id &&
            name.toLowerCase() === profile.name.toLowerCase(),
        )
      ) {
        return;
      }
      state.discordProfiles[index] = profile;
    },
    deleteDiscordProfile: (state, action: PayloadAction<string>) => {
      state.discordProfiles = state.discordProfiles.filter(
        ({ id }) => id !== action.payload,
      );
      if (state.selectedDiscordProfileId === action.payload) {
        state.selectedDiscordProfileId = state.discordProfiles[0]?.id ?? null;
      }
    },
    selectDiscordProfile: (state, action: PayloadAction<string>) => {
      if (state.discordProfiles.some(({ id }) => id === action.payload)) {
        state.selectedDiscordProfileId = action.payload;
      }
    },
    setURLBarEnabled: (state, action: PayloadAction<boolean>) => {
      state.urlBarEnabled = action.payload;
    },
    setRemoteEnabled: (state, action: PayloadAction<boolean>) => {
      state.remoteEnabled = action.payload;
    },
    setRemoteAddress: (state, action: PayloadAction<string>) => {
      state.remoteAddress = action.payload;
    },
    setRemotePort: (state, action: PayloadAction<string>) => {
      state.remotePort = action.payload;
    },
    setExternalInputsEnabled: (state, action: PayloadAction<boolean>) => {
      state.externalInputsEnabled = action.payload;
    },
    setMultipleInputsEnabled: (state, action: PayloadAction<boolean>) => {
      state.multipleInputsEnabled = action.payload;
    },
    setMultipleOutputsEnabled: (state, action: PayloadAction<boolean>) => {
      state.multipleOutputsEnabled = action.payload;
    },
    setStreamingMode: (state, action: PayloadAction<StreamingMode>) => {
      state.streamingMode = action.payload;
    },
  },
});

export const {
  addDiscordProfile,
  updateDiscordProfile,
  deleteDiscordProfile,
  selectDiscordProfile,
  setURLBarEnabled,
  setRemoteEnabled,
  setRemoteAddress,
  setRemotePort,
  setExternalInputsEnabled,
  setMultipleInputsEnabled,
  setMultipleOutputsEnabled,
  setStreamingMode,
} = connectionSlice.actions;

export default connectionSlice.reducer;

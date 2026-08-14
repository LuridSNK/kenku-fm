# Discord Bot Profiles Plan

## Current behavior

- Kenku stores one Discord bot token as `settings.discordToken` in Redux Persist.
- The token authenticates a bot account, not a Discord server. One bot may expose several Discord servers and voice channels.
- One `DiscordBroadcast` owns the active Discord client, while voice connections may exist in multiple servers when multiple outputs are enabled.
- The saved token is plaintext in renderer local storage and Kenku reconnects it automatically at startup.

## Product decisions

- A saved entry is a named bot profile: `{ id, name, token }`.
- Connecting a different profile replaces the active bot connection.
- Existing multi-server output support remains available within the active bot profile.
- Profiles remain in existing Redux/local storage; OS-protected secret storage is out of scope.
- Application startup restores profiles but remains disconnected until the user clicks **Connect**.

## Implementation

1. Replace `settings.discordToken` with `discordProfiles` and `selectedDiscordProfileId` in `settingsSlice.ts`. Add minimal create, update, delete, and select reducers. Require a non-empty name and token; profile IDs provide stable identity.
2. Increment the Redux Persist version in `renderer/app/store.ts`. Migrate an existing non-empty `discordToken` into one profile named `Discord Bot`, select it, and remove the legacy field. Preserve all unrelated settings.
3. Extract the Discord profile controls from `Settings.tsx`. Reuse existing MUI inputs and dialogs for profile selection and Add/Edit/Delete actions. Display **Connect**, **Switch**, or **Disconnect** from the selected and active profile state; disable connecting the already active profile and all actions while switching.
4. Extend connection state with the active profile ID. Do not persist runtime connection state. Remove startup auto-connect; persisted selection is restored only for convenience.
5. Make main-process switching authoritative in `DiscordBroadcast`: destroy every tracked voice connection, destroy the old Discord client, clear guild/output state, then log in with the new token. A failed login leaves Kenku disconnected. Make disconnect safe when no client exists.
6. Reset renderer guild/channel selections to local output on disconnect or switch. Keep the current ability to join multiple servers for the active bot when multiple outputs are enabled.

## Verification

- Migrate an existing single-token persisted state without losing unrelated settings.
- Create, rename, delete, select, and persist multiple profiles across application restarts.
- Confirm startup remains disconnected.
- Connect profile A, switch to profile B, and verify A's client and voice connections close before B becomes ready.
- Confirm selecting the active profile cannot reconnect it.
- Confirm an invalid profile token leaves the application disconnected with cleared Discord outputs.
- Confirm multi-server outputs still work for one active bot profile.
- Run the project linter and smoke-test the packaged Electron UI.

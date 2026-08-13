import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import AddIcon from "@mui/icons-material/AddRounded";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import { useDispatch, useSelector } from "react-redux";

import { RootState } from "../../app/store";
import { showWindowControls } from "../../common/showWindowControls";
import {
  setDisconnected,
  setReady,
  startConnecting,
  startDisconnecting,
} from "../connection/connectionSlice";
import { setGuilds, setOutput } from "../output/outputSlice";
import {
  addDiscordProfile,
  deleteDiscordProfile,
  DiscordProfile,
  selectDiscordProfile,
  updateDiscordProfile,
} from "./settingsSlice";

type DiscordProfileDialogProps = {
  profile: DiscordProfile | null;
  profiles: DiscordProfile[];
  onSave: (profile: DiscordProfile) => void;
  onClose: () => void;
};

function DiscordProfileDialog({
  profile,
  profiles,
  onSave,
  onClose,
}: DiscordProfileDialogProps) {
  const [name, setName] = useState(profile?.name ?? "");
  const [token, setToken] = useState(profile?.token ?? "");
  const duplicateName = profiles.some(
    (candidate) =>
      candidate.id !== profile?.id &&
      candidate.name.toLowerCase() === name.trim().toLowerCase(),
  );
  const validProfile = Boolean(name.trim() && token.trim() && !duplicateName);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSave({
      id: profile?.id ?? crypto.randomUUID(),
      name: name.trim(),
      token: token.trim(),
    });
  }

  return (
    <Dialog fullScreen sx={{ width: 240 }} open onClose={onClose}>
      <DialogTitle
        sx={{
          textAlign: showWindowControls ? "left" : "right",
          py: showWindowControls ? 2 : 1.5,
        }}
      >
        {profile ? "Edit Discord Bot" : "Add Discord Bot"}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="standard"
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={duplicateName}
            helperText={
              duplicateName ? "Name must be unique" : "Name this bot profile"
            }
          />
          <TextField
            margin="dense"
            label="Token"
            type="password"
            fullWidth
            variant="standard"
            autoComplete="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            helperText="Your Discord bot token"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!validProfile}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export function DiscordSettings() {
  const connection = useSelector((state: RootState) => state.connection);
  const { discordProfiles, selectedDiscordProfileId } = useSelector(
    (state: RootState) => state.settings,
  );
  const dispatch = useDispatch();
  const selectedProfile = discordProfiles.find(
    ({ id }) => id === selectedDiscordProfileId,
  );
  const busy = connection.status === "connecting";
  const selectedProfileIsActive =
    selectedProfile?.id === connection.activeProfileId;

  const [editorProfile, setEditorProfile] = useState<
    DiscordProfile | null
  >();

  useEffect(() => {
    window.kenku.on("DISCORD_READY", (args) => {
      dispatch(setReady(args[0]));
    });
    window.kenku.on("DISCORD_DISCONNECTED", () => {
      dispatch(setDisconnected());
      dispatch(setGuilds([]));
      dispatch(setOutput("local"));
      window.kenku.setLoopback(true);
    });

    return () => {
      window.kenku.removeAllListeners("DISCORD_READY");
      window.kenku.removeAllListeners("DISCORD_DISCONNECTED");
    };
  }, [dispatch]);

  function handleSave(profile: DiscordProfile) {
    dispatch(
      editorProfile
        ? updateDiscordProfile(profile)
        : addDiscordProfile(profile),
    );
    setEditorProfile(undefined);
  }

  function handleDelete() {
    if (
      selectedProfile &&
      window.confirm(`Delete Discord bot profile "${selectedProfile.name}"?`)
    ) {
      dispatch(deleteDiscordProfile(selectedProfile.id));
    }
  }

  function resetOutputs() {
    dispatch(setGuilds([]));
    dispatch(setOutput("local"));
    window.kenku.setLoopback(true);
  }

  function handleConnect() {
    if (!selectedProfile) {
      return;
    }
    if (selectedProfileIsActive) {
      dispatch(startDisconnecting());
      resetOutputs();
      window.kenku.disconnect();
      return;
    }
    dispatch(startConnecting(selectedProfile.id));
    resetOutputs();
    window.kenku.connect(selectedProfile.id, selectedProfile.token);
  }


  return (
    <>
      <Stack spacing={1}>
        <FormControl fullWidth variant="standard" margin="dense">
          <InputLabel id="discord-profile-label">Bot profile</InputLabel>
          <Select
            labelId="discord-profile-label"
            value={selectedDiscordProfileId ?? ""}
            onChange={(event) =>
              dispatch(selectDiscordProfile(event.target.value))
            }
            disabled={busy || discordProfiles.length === 0}
          >
            {discordProfiles.map((profile) => (
              <MenuItem key={profile.id} value={profile.id}>
                {profile.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Stack direction="row" spacing={1} justifyContent="center">
          <IconButton
            size="small"
            disabled={busy}
            onClick={() => setEditorProfile(null)}
            aria-label="Add Discord bot profile"
          >
            <AddIcon />
          </IconButton>
          <IconButton
            size="small"
            disabled={busy || !selectedProfile || selectedProfileIsActive}
            onClick={() => setEditorProfile(selectedProfile)}
            aria-label="Edit Discord bot profile"
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            disabled={busy || !selectedProfile || selectedProfileIsActive}
            onClick={handleDelete}
            aria-label="Delete Discord bot profile"
          >
            <DeleteIcon />
          </IconButton>
        </Stack>
        <Button
          disabled={busy || !selectedProfile}
          onClick={handleConnect}
          fullWidth
          variant="outlined"
          size="small"
        >
          {busy ? (
            <CircularProgress size={24} />
          ) : selectedProfileIsActive ? (
            "Disconnect"
          ) : connection.status === "ready" ? (
            "Switch"
          ) : (
            "Connect"
          )}
        </Button>
        <Link
          href="https://kenku.fm/docs/getting-a-discord-token"
          variant="caption"
          textAlign="center"
          target="_blank"
          rel="noopener noreferrer"
          py={2}
        >
          Where do I get my token?
        </Link>
      </Stack>

      {editorProfile !== undefined && (
        <DiscordProfileDialog
          profile={editorProfile}
          profiles={discordProfiles}
          onSave={handleSave}
          onClose={() => setEditorProfile(undefined)}
        />
      )}
    </>
  );
}

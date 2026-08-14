import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { useDispatch } from "react-redux";
import { editPlaylist, Playlist } from "./playlistsSlice";
import { ImageSelector } from "../../common/ImageSelector";
import {
  useManagedMediaDeletion,
  useManagedMediaDrafts,
} from "../../common/useManagedMediaDeletion";

type PlaylistSettingsProps = {
  playlist: Playlist;
  open: boolean;
  onClose: () => void;
};

export function PlaylistSettings({
  playlist,
  open,
  onClose,
}: PlaylistSettingsProps) {
  const dispatch = useDispatch();
  const mediaDeletion = useManagedMediaDeletion();
  const mediaDrafts = useManagedMediaDrafts();
  const [background, setBackground] = useState(playlist.background);

  useEffect(() => {
    if (open) setBackground(playlist.background);
  }, [open, playlist.background]);

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editPlaylist({ id: playlist.id, title: event.target.value }));
  }

  function handleBackgroundChange(nextBackground: string, imported = false) {
    mediaDrafts.registerDraft(nextBackground, imported);
    setBackground(nextBackground);
  }

  async function handleClose() {
    await mediaDrafts.discardDrafts();
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (background === playlist.background) {
      void mediaDrafts.discardDrafts();
      onClose();
      return;
    }
    mediaDeletion.requestDeletion([playlist.background], () => {
      void mediaDrafts.discardDrafts(background);
      dispatch(editPlaylist({ id: playlist.id, background }));
      onClose();
    });
  }

  return (
    <>
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Edit Playlist</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            margin="dense"
            id="name"
            label="Name"
            fullWidth
            variant="standard"
            autoComplete="off"
            InputLabelProps={{
              shrink: true,
            }}
            value={playlist.title}
            onChange={handleTitleChange}
          />
          <ImageSelector
            value={background}
            onChange={handleBackgroundChange}
          />
        </DialogContent>
        <DialogActions>
          <Button type="submit">Done</Button>
        </DialogActions>
      </form>
      </Dialog>
      {mediaDeletion.dialog}
    </>
  );
}

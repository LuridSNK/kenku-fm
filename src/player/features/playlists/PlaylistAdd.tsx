import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { v4 as uuid } from "uuid";

import { useDispatch } from "react-redux";
import { addPlaylist } from "./playlistsSlice";

import { backgrounds } from "../../backgrounds";
import { ImageSelector } from "../../common/ImageSelector";
import { useManagedMediaDrafts } from "../../common/useManagedMediaDeletion";

type PlaylistAddProps = {
  open: boolean;
  onClose: () => void;
};

export function PlaylistAdd({ open, onClose }: PlaylistAddProps) {
  const dispatch = useDispatch();
  const mediaDrafts = useManagedMediaDrafts();

  const [title, setTitle] = useState("");
  const [background, setBackground] = useState(Object.keys(backgrounds)[0]);

  useEffect(() => {
    if (!open) {
      setTitle("");
    }
  }, [open]);

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value);
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
    void mediaDrafts.discardDrafts(background);
    const id = uuid();
    dispatch(addPlaylist({ id, title, background, tracks: [] }));
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Add Playlist</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="Name"
            fullWidth
            variant="standard"
            autoComplete="off"
            InputLabelProps={{
              shrink: true,
            }}
            value={title}
            onChange={handleTitleChange}
          />
          <ImageSelector
            value={background}
            onChange={handleBackgroundChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button disabled={!title || !background} type="submit">
            Add
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { useDispatch } from "react-redux";
import { editSoundboard, Soundboard } from "./soundboardsSlice";
import { ImageSelector } from "../../common/ImageSelector";
import {
  useManagedMediaDeletion,
  useManagedMediaDrafts,
} from "../../common/useManagedMediaDeletion";

type SoundboardSettingsProps = {
  soundboard: Soundboard;
  open: boolean;
  onClose: () => void;
};

export function SoundboardSettings({
  soundboard,
  open,
  onClose,
}: SoundboardSettingsProps) {
  const dispatch = useDispatch();
  const mediaDeletion = useManagedMediaDeletion();
  const mediaDrafts = useManagedMediaDrafts();
  const [background, setBackground] = useState(soundboard.background);

  useEffect(() => {
    if (open) setBackground(soundboard.background);
  }, [open, soundboard.background]);

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editSoundboard({ id: soundboard.id, title: event.target.value }));
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
    if (background === soundboard.background) {
      void mediaDrafts.discardDrafts();
      onClose();
      return;
    }
    mediaDeletion.requestDeletion([soundboard.background], () => {
      void mediaDrafts.discardDrafts(background);
      dispatch(editSoundboard({ id: soundboard.id, background }));
      onClose();
    });
  }

  return (
    <>
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Edit Soundboard</DialogTitle>
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
            value={soundboard.title}
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

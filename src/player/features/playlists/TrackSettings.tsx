import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { useDispatch } from "react-redux";
import { editTrack, Track } from "./playlistsSlice";
import { AudioSelector } from "../../common/AudioSelector";
import {
  useManagedMediaDeletion,
  useManagedMediaDrafts,
} from "../../common/useManagedMediaDeletion";

type TrackSettingsProps = {
  track: Track;
  open: boolean;
  onClose: () => void;
};

export function TrackSettings({ track, open, onClose }: TrackSettingsProps) {
  const dispatch = useDispatch();
  const mediaDeletion = useManagedMediaDeletion();
  const mediaDrafts = useManagedMediaDrafts();
  const [url, setURL] = useState(track.url);

  useEffect(() => {
    if (open) setURL(track.url);
  }, [open, track.url]);

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editTrack({ id: track.id, title: event.target.value }));
  }

  function handleTitleStringChange(title: string) {
    dispatch(editTrack({ id: track.id, title }));
  }

  function handleURLChange(nextURL: string, imported = false) {
    mediaDrafts.registerDraft(nextURL, imported);
    setURL(nextURL);
  }

  async function handleClose() {
    await mediaDrafts.discardDrafts();
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (url === track.url) {
      void mediaDrafts.discardDrafts();
      onClose();
      return;
    }
    mediaDeletion.requestDeletion([track.url], () => {
      void mediaDrafts.discardDrafts(url);
      dispatch(editTrack({ id: track.id, url }));
      onClose();
    });
  }

  return (
    <>
    <Dialog
      open={open}
      onClose={handleClose}
      // Stop key events from propagating to prevent the track drag and drop from stealing the space bar
      onKeyDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <DialogTitle>Edit Track</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <AudioSelector
            value={url}
            onChange={handleURLChange}
            onFileName={handleTitleStringChange}
          />
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
            value={track.title}
            onChange={handleTitleChange}
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

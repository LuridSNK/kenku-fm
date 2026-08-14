import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";

import { v4 as uuid } from "uuid";

import { useDispatch } from "react-redux";
import { addTrack } from "./playlistsSlice";
import { AudioSelector } from "../../common/AudioSelector";
import { addTrackToQueueIfNeeded } from "./playlistPlaybackSlice";
import { useManagedMediaDrafts } from "../../common/useManagedMediaDeletion";

type TrackAddProps = {
  playlistId: string;
  open: boolean;
  onClose: () => void;
};

export function TrackAdd({ playlistId, open, onClose }: TrackAddProps) {
  const dispatch = useDispatch();
  const mediaDrafts = useManagedMediaDrafts();

  const [title, setTitle] = useState("");
  const [url, setURL] = useState("");

  useEffect(() => {
    if (!open) {
      setTitle("");
      setURL("");
    }
  }, [open]);

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value);
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
    void mediaDrafts.discardDrafts(url);
    const id = uuid();
    dispatch(addTrack({ track: { id, title, url }, playlistId }));
    dispatch(addTrackToQueueIfNeeded({ playlistId, trackId: id }));
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Add Track</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <AudioSelector
            value={url}
            onChange={handleURLChange}
            onFileName={setTitle}
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
            value={title}
            onChange={handleTitleChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button disabled={!title || !url} type="submit">
            Add
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

import React, { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";

import { showWindowControls } from "../../common/showWindowControls";
import { BookmarkGroup } from "./bookmarksSlice";

type BookmarkGroupDialogProps = {
  group?: BookmarkGroup;
  groupNames: string[];
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
};

export function BookmarkGroupDialog({
  group,
  groupNames,
  open,
  onClose,
  onSave,
}: BookmarkGroupDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setName(group?.name ?? "");
    }
  }, [group, open]);

  const trimmedName = name.trim();
  const duplicateName = groupNames.some(
    (groupName) => groupName.toLowerCase() === trimmedName.toLowerCase(),
  );

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (trimmedName && !duplicateName) {
      onSave(trimmedName);
    }
  }

  return (
    <Dialog
      fullScreen
      sx={{ width: 240 }}
      open={open}
      onClose={onClose}
      onKeyDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <DialogTitle
        sx={{
          textAlign: showWindowControls ? "left" : "right",
          py: showWindowControls ? 2 : 1.5,
        }}
      >
        {group ? "Rename Bookmark Group" : "New Bookmark Group"}
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
            helperText={duplicateName ? "Name must be unique" : undefined}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!trimmedName || duplicateName}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

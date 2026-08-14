import React from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";

import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { Bookmark, editBookmark, moveBookmark } from "./bookmarksSlice";

import { getDropURL } from "../../common/drop";
import { showWindowControls } from "../../common/showWindowControls";

type BookmarkSettingsProps = {
  bookmark: Bookmark;
  open: boolean;
  onClose: () => void;
};

export function BookmarkSettings({
  bookmark,
  open,
  onClose,
}: BookmarkSettingsProps) {
  const dispatch = useDispatch();
  const { bookmarks, groups } = useSelector(
    (state: RootState) => state.bookmarks,
  );
  const groupId =
    groups.allIds.find((id) =>
      groups.byId[id].bookmarkIds.includes(bookmark.id),
    ) ?? null;

  function handleURLChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editBookmark({ id: bookmark.id, url: event.target.value }));
  }

  function handleURLDrop(event: React.DragEvent<HTMLInputElement>) {
    event.preventDefault();
    const url = getDropURL(event.dataTransfer);
    if (url) {
      dispatch(editBookmark({ id: bookmark.id, url }));
    }
  }

  function handleTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    dispatch(editBookmark({ id: bookmark.id, title: event.target.value }));
  }
  function handleDestinationChange(event: React.ChangeEvent<HTMLInputElement>) {
    onClose();
    const destinationId =
      event.target.value === "ungrouped" ? null : event.target.value;
    const destinationIds = destinationId
      ? groups.byId[destinationId].bookmarkIds
      : bookmarks.ungroupedIds;
    dispatch(
      moveBookmark({
        id: bookmark.id,
        groupId: destinationId,
        index: destinationIds.length,
      }),
    );
  }

  function handleClose() {
    onClose();
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    handleClose();
  }

  return (
    <Dialog
      fullScreen
      sx={{ width: 240 }}
      open={open}
      onClose={handleClose}
      // Stop key events from propagating to prevent the track drag and drop from stealing the space bar
      onKeyDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <DialogTitle
        sx={{
          textAlign: showWindowControls ? "left" : "right",
          py: showWindowControls ? 2 : 1.5,
        }}
      >
        Edit Bookmark
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            id="url"
            label="URL"
            fullWidth
            variant="standard"
            autoComplete="off"
            InputLabelProps={{
              shrink: true,
            }}
            value={bookmark.url}
            onChange={handleURLChange}
            onDrop={handleURLDrop}
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
            value={bookmark.title}
            onChange={handleTitleChange}
          />
          <TextField
            select
            margin="dense"
            label="Group"
            fullWidth
            variant="standard"
            value={groupId ?? "ungrouped"}
            onChange={handleDestinationChange}
          >
            <MenuItem value="ungrouped">Ungrouped</MenuItem>
            {groups.allIds.map((id) => (
              <MenuItem key={id} value={id}>
                {groups.byId[id].name}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button type="submit">Done</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

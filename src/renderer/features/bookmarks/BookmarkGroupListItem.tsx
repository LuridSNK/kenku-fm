import React, { useState } from "react";
import DeleteIcon from "@mui/icons-material/DeleteRounded";
import DragIndicatorIcon from "@mui/icons-material/DragIndicatorRounded";
import EditIcon from "@mui/icons-material/EditRounded";
import ExpandLess from "@mui/icons-material/ExpandLessRounded";
import ExpandMore from "@mui/icons-material/ExpandMoreRounded";
import MoreIcon from "@mui/icons-material/MoreVertRounded";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { CSS } from "@dnd-kit/utilities";
import { useSortable } from "@dnd-kit/sortable";
import { useDispatch, useSelector } from "react-redux";

import { RootState } from "../../app/store";
import { showWindowControls } from "../../common/showWindowControls";
import {
  BookmarkDestinationList,
  groupDragId,
} from "./BookmarkDestinationList";
import { BookmarkGroup, removeBookmarkGroup } from "./bookmarksSlice";

type BookmarkGroupListItemProps = {
  group: BookmarkGroup;
  collapseForGroupDrag: boolean;
  onRename: (group: BookmarkGroup) => void;
  onMove: (offset: -1 | 1) => void;
};

export function BookmarkGroupListItem({
  group,
  collapseForGroupDrag,
  onMove,
  onRename,
}: BookmarkGroupListItemProps) {
  const dispatch = useDispatch();
  const bookmarksById = useSelector(
    (state: RootState) => state.bookmarks.bookmarks.byId,
  );
  const [open, setOpen] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { listeners, setNodeRef, transform, transition } = useSortable({
    id: groupDragId(group.id),
  });

  const bookmarks = group.bookmarkIds.map((id) => bookmarksById[id]);

  function openRename() {
    setMenuAnchor(null);
    onRename(group);
  }

  function openDelete() {
    setMenuAnchor(null);
    setDeleteOpen(true);
  }

  function handleDelete() {
    dispatch(removeBookmarkGroup(group.id));
    setDeleteOpen(false);
  }

  return (
    <>
      <List
        ref={setNodeRef}
        component="div"
        disablePadding
        style={{ transform: CSS.Transform.toString(transform), transition }}
      >
        <ListItem
          disablePadding
          sx={{
            mx: 1,
            my: 0.5,
            width: "auto",
            borderRadius: "12px",
            "&:hover": { bgcolor: "action.hover" },
            "& .MuiListItemButton-root": {
              m: 0,
              borderRadius: "inherit",
            },
            "& .MuiListItemButton-root:hover": { bgcolor: "transparent" },
          }}
          secondaryAction={
            <IconButton
              size="small"
              sx={{ "&:hover": { bgcolor: "transparent" } }}
              aria-label={`Manage ${group.name}`}
              onClick={(event) => setMenuAnchor(event.currentTarget)}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <MoreIcon />
            </IconButton>
          }
        >
          <IconButton
            size="small"
            sx={{ ml: 1, "&:hover": { bgcolor: "transparent" } }}
            aria-label={`Move ${group.name}`}
            onPointerDown={(event) => listeners?.onPointerDown(event)}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                event.stopPropagation();
                onMove(event.key === "ArrowUp" ? -1 : 1);
              }
            }}
          >
            <DragIndicatorIcon fontSize="small" />
          </IconButton>
          <ListItemButton
            dense
            sx={{ pl: 0, pr: 6 }}
            onKeyDown={(event) => event.stopPropagation()}
            onClick={() => setOpen((value) => !value)}
          >
            <ListItemText
              primary={group.name}
              primaryTypographyProps={{ noWrap: true }}
            />
            {open ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={open && !collapseForGroupDrag} timeout="auto">
          <BookmarkDestinationList
            bookmarks={bookmarks}
            destinationId={group.id}
          />
        </Collapse>
      </List>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={openRename}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem onClick={openDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog
        fullScreen
        sx={{ width: 240 }}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
      >
        <DialogTitle
          sx={{
            textAlign: showWindowControls ? "left" : "right",
            py: showWindowControls ? 2 : 1.5,
          }}
        >
          Delete Bookmark Group?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete &quot;{group.name}&quot; and its {group.bookmarkIds.length}
            bookmark{group.bookmarkIds.length === 1 ? "" : "s"}?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

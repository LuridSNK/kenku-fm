import React, { useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/AddRounded";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { v4 as uuid } from "uuid";
import { useDispatch, useSelector } from "react-redux";

import { RootState } from "../../app/store";
import { Tab } from "../tabs/tabsSlice";
import { BookmarkGroupDialog } from "./BookmarkGroupDialog";
import {
  addBookmark,
  addBookmarkGroup,
  BookmarkDestinationId,
  removeBookmark,
} from "./bookmarksSlice";

type BookmarkDestinationMenuProps = {
  anchorEl: HTMLElement | null;
  tab: Tab;
  onClose: () => void;
};

export function BookmarkDestinationMenu({
  anchorEl,
  tab,
  onClose,
}: BookmarkDestinationMenuProps) {
  const dispatch = useDispatch();
  const { bookmarks, groups } = useSelector(
    (state: RootState) => state.bookmarks,
  );
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const open = Boolean(anchorEl) || newGroupOpen;

  useEffect(() => {
    if (!open) return;
    window.kenku.hideBrowserView(tab.id);
    return () => window.kenku.showBrowserView(tab.id);
  }, [open, tab.id]);

  function destinationBookmarkId(groupId: BookmarkDestinationId) {
    const ids = groupId
      ? groups.byId[groupId].bookmarkIds
      : bookmarks.ungroupedIds;
    return ids.find((id) => bookmarks.byId[id].url === tab.url);
  }

  function toggleDestination(groupId: BookmarkDestinationId) {
    const bookmarkId = destinationBookmarkId(groupId);
    if (bookmarkId) {
      dispatch(removeBookmark(bookmarkId));
      return;
    }
    dispatch(
      addBookmark({
        bookmark: {
          id: uuid(),
          url: tab.url,
          title: tab.title,
          icon: tab.icon,
        },
        groupId,
      }),
    );
  }

  function openNewGroup() {
    onClose();
    setNewGroupOpen(true);
  }

  function createGroup(name: string) {
    const groupId = uuid();
    dispatch(addBookmarkGroup({ id: groupId, name, bookmarkIds: [] }));
    dispatch(
      addBookmark({
        bookmark: {
          id: uuid(),
          url: tab.url,
          title: tab.title,
          icon: tab.icon,
        },
        groupId,
      }),
    );
    setNewGroupOpen(false);
  }

  const groupNames = groups.allIds.map((id) => groups.byId[id].name);

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={onClose}
        MenuListProps={{
          dense: true,
          sx: {
            py: 0,
            "& .MuiMenuItem-root": { minHeight: 28, px: 1.5, py: 0 },
            "& .MuiListItemIcon-root": { minWidth: 32 },
          },
        }}
      >
        <MenuItem onClick={() => toggleDestination(null)}>
          <ListItemIcon>
            <Checkbox
              checked={Boolean(destinationBookmarkId(null))}
              disableRipple
              size="small"
              sx={{ p: 0 }}
            />
          </ListItemIcon>
          <ListItemText>Ungrouped</ListItemText>
        </MenuItem>
        {groups.allIds.map((groupId) => (
          <MenuItem key={groupId} onClick={() => toggleDestination(groupId)}>
            <ListItemIcon>
              <Checkbox
                checked={Boolean(destinationBookmarkId(groupId))}
                disableRipple
                size="small"
                sx={{ p: 0 }}
              />
            </ListItemIcon>
            <ListItemText>{groups.byId[groupId].name}</ListItemText>
          </MenuItem>
        ))}
        <Divider sx={{ my: 0 }} />
        <MenuItem onClick={openNewGroup}>
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>New group…</ListItemText>
        </MenuItem>
      </Menu>
      <BookmarkGroupDialog
        groupNames={groupNames}
        open={newGroupOpen}
        onClose={() => setNewGroupOpen(false)}
        onSave={createGroup}
      />
    </>
  );
}

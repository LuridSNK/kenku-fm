import React, { useState } from "react";
import AddIcon from "@mui/icons-material/AddRounded";
import ExpandLess from "@mui/icons-material/ExpandLessRounded";
import ExpandMore from "@mui/icons-material/ExpandMoreRounded";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { v4 as uuid } from "uuid";
import { useDispatch, useSelector } from "react-redux";

import { RootState } from "../../app/store";
import {
  BookmarkDestinationList,
  destinationDropId,
  getRawDragId,
  groupDragId,
} from "./BookmarkDestinationList";
import { BookmarkGroupDialog } from "./BookmarkGroupDialog";
import { BookmarkGroupListItem } from "./BookmarkGroupListItem";
import { BookmarkListItem } from "./BookmarkListItem";
import {
  addBookmarkGroup,
  BookmarkDestinationId,
  BookmarkGroup,
  editBookmarkGroup,
  moveBookmark,
  moveBookmarkGroup,
} from "./bookmarksSlice";

export function BookmarkListItems() {
  const dispatch = useDispatch();
  const { bookmarks, groups } = useSelector(
    (state: RootState) => state.bookmarks,
  );
  const [open, setOpen] = useState(true);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<BookmarkGroup>();
  const [dragId, setDragId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ungroupedBookmarks = bookmarks.ungroupedIds.map(
    (id) => bookmarks.byId[id],
  );
  const groupItems = groups.allIds.map((id) => groups.byId[id]);

  function bookmarkDestination(bookmarkId: string): BookmarkDestinationId {
    if (bookmarks.ungroupedIds.includes(bookmarkId)) {
      return null;
    }
    return (
      groups.allIds.find((groupId) =>
        groups.byId[groupId].bookmarkIds.includes(bookmarkId),
      ) ?? null
    );
  }

  function destinationIds(groupId: BookmarkDestinationId) {
    return groupId
      ? groups.byId[groupId]?.bookmarkIds ?? []
      : bookmarks.ungroupedIds;
  }

  function handleDragStart(event: DragStartEvent) {
    setDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    setDragId(null);
    if (!overId || activeId === overId) {
      return;
    }

    if (activeId.startsWith("group:")) {
      const activeGroupId = getRawDragId(activeId);
      let overGroupId: string | null = null;
      if (overId.startsWith("group:")) {
        overGroupId = getRawDragId(overId);
      } else if (overId.startsWith("bookmark:")) {
        overGroupId = bookmarkDestination(getRawDragId(overId));
      } else if (overId.startsWith("destination:") && overId !== destinationDropId(null)) {
        overGroupId = getRawDragId(overId);
      }
      if (overGroupId) {
        dispatch(moveBookmarkGroup({ active: activeGroupId, over: overGroupId }));
      }
      return;
    }

    const bookmarkId = getRawDragId(activeId);
    let destinationId: BookmarkDestinationId;
    let index: number;
    if (overId.startsWith("bookmark:")) {
      const overBookmarkId = getRawDragId(overId);
      destinationId = bookmarkDestination(overBookmarkId);
      index = destinationIds(destinationId).indexOf(overBookmarkId);
    } else if (overId.startsWith("group:")) {
      destinationId = getRawDragId(overId);
      index = destinationIds(destinationId).length;
    } else if (overId.startsWith("destination:")) {
      const rawDestinationId = getRawDragId(overId);
      destinationId = rawDestinationId === "ungrouped" ? null : rawDestinationId;
      index = destinationIds(destinationId).length;
    } else {
      return;
    }
    dispatch(moveBookmark({ id: bookmarkId, groupId: destinationId, index }));
  }

  function openNewGroup() {
    setEditingGroup(undefined);
    setGroupDialogOpen(true);
  }

  function openRenameGroup(group: BookmarkGroup) {
    setEditingGroup(group);
    setGroupDialogOpen(true);
  }

  function saveGroup(name: string) {
    if (editingGroup) {
      dispatch(editBookmarkGroup({ id: editingGroup.id, name }));
    } else {
      dispatch(addBookmarkGroup({ id: uuid(), name, bookmarkIds: [] }));
    }
    setGroupDialogOpen(false);
  }

  function moveGroupBy(groupId: string, offset: -1 | 1) {
    const currentIndex = groups.allIds.indexOf(groupId);
    const over = groups.allIds[currentIndex + offset];
    if (over) {
      dispatch(moveBookmarkGroup({ active: groupId, over }));
    }
  }

  const activeBookmark = dragId?.startsWith("bookmark:")
    ? bookmarks.byId[getRawDragId(dragId)]
    : undefined;
  const activeGroup = dragId?.startsWith("group:")
    ? groups.byId[getRawDragId(dragId)]
    : undefined;
  const unavailableGroupNames = groups.allIds
    .filter((id) => id !== editingGroup?.id)
    .map((id) => groups.byId[id].name);

  return (
    <>
      <ListItemButton onClick={() => setOpen((value) => !value)}>
        <ListItemText primary="Bookmarks" />
        <IconButton
          size="small"
          aria-label="Add bookmark group"
          onClick={(event) => {
            event.stopPropagation();
            openNewGroup();
          }}
        >
          <AddIcon />
        </IconButton>
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
      <Collapse in={open} timeout="auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragCancel={() => setDragId(null)}
          onDragEnd={handleDragEnd}
        >
          <BookmarkDestinationList
            bookmarks={ungroupedBookmarks}
            destinationId={null}
          />
          <SortableContext
            items={groups.allIds.map(groupDragId)}
            strategy={verticalListSortingStrategy}
          >
            <List component="div" disablePadding>
              {groupItems.map((group) => (
                <BookmarkGroupListItem
                  key={group.id}
                  group={group}
                  collapseForGroupDrag={Boolean(
                    dragId?.startsWith("group:"),
                  )}
                  onMove={(offset) => moveGroupBy(group.id, offset)}
                  onRename={openRenameGroup}
                />
              ))}
            </List>
          </SortableContext>
          <DragOverlay>
            {activeBookmark ? (
              <BookmarkListItem bookmark={activeBookmark} shadow />
            ) : activeGroup ? (
              <ListItemButton sx={{ boxShadow: 10 }}>
                <ListItemText primary={activeGroup.name} />
              </ListItemButton>
            ) : null}
          </DragOverlay>
        </DndContext>
      </Collapse>
      <BookmarkGroupDialog
        group={editingGroup}
        groupNames={unavailableGroupNames}
        open={groupDialogOpen}
        onClose={() => setGroupDialogOpen(false)}
        onSave={saveGroup}
      />
    </>
  );
}

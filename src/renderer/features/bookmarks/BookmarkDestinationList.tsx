import React from "react";
import List from "@mui/material/List";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { SortableItem } from "../../common/SortableItem";
import { BookmarkListItem } from "./BookmarkListItem";
import { Bookmark, BookmarkDestinationId } from "./bookmarksSlice";

export const bookmarkDragId = (id: string) => `bookmark:${id}`;
export const groupDragId = (id: string) => `group:${id}`;
export const destinationDropId = (id: BookmarkDestinationId) =>
  `destination:${id ?? "ungrouped"}`;

export const getRawDragId = (id: string) => id.slice(id.indexOf(":") + 1);

type BookmarkDestinationListProps = {
  bookmarks: Bookmark[];
  destinationId: BookmarkDestinationId;
};

export function BookmarkDestinationList({
  bookmarks,
  destinationId,
}: BookmarkDestinationListProps) {
  const dropId = destinationDropId(destinationId);
  const { isOver, setNodeRef } = useDroppable({ id: dropId });
  const itemIds = bookmarks.map((bookmark) => bookmarkDragId(bookmark.id));

  return (
    <List
      ref={setNodeRef}
      component="div"
      disablePadding
      sx={{ minHeight: 8, bgcolor: isOver ? "action.hover" : undefined }}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        {bookmarks.map((bookmark) => (
          <SortableItem key={bookmark.id} id={bookmarkDragId(bookmark.id)}>
            <BookmarkListItem bookmark={bookmark} />
          </SortableItem>
        ))}
      </SortableContext>
    </List>
  );
}

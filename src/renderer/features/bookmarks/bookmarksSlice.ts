import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Bookmark {
  url: string;
  icon: string;
  title: string;
  id: string;
}

export interface BookmarkGroup {
  id: string;
  name: string;
  bookmarkIds: string[];
}

export type BookmarkDestinationId = string | null;

export interface BookmarksState {
  bookmarks: {
    byId: Record<string, Bookmark>;
    ungroupedIds: string[];
  };
  groups: {
    byId: Record<string, BookmarkGroup>;
    allIds: string[];
  };
}

const initialState: BookmarksState = {
  bookmarks: {
    byId: {},
    ungroupedIds: [],
  },
  groups: {
    byId: {},
    allIds: [],
  },
};

function removeBookmarkId(state: BookmarksState, bookmarkId: string) {
  state.bookmarks.ungroupedIds = state.bookmarks.ungroupedIds.filter(
    (id) => id !== bookmarkId,
  );
  for (const group of Object.values(state.groups.byId)) {
    group.bookmarkIds = group.bookmarkIds.filter((id) => id !== bookmarkId);
  }
}

function getDestinationIds(
  state: BookmarksState,
  groupId: BookmarkDestinationId,
): string[] | undefined {
  return groupId
    ? state.groups.byId[groupId]?.bookmarkIds
    : state.bookmarks.ungroupedIds;
}

export const bookmarksSlice = createSlice({
  name: "bookmarks",
  initialState,
  reducers: {
    addBookmark: (
      state,
      action: PayloadAction<{
        bookmark: Bookmark;
        groupId: BookmarkDestinationId;
      }>,
    ) => {
      const { bookmark, groupId } = action.payload;
      const ids = getDestinationIds(state, groupId);
      if (!ids) {
        return;
      }
      state.bookmarks.byId[bookmark.id] = bookmark;
      ids.push(bookmark.id);
    },
    removeBookmark: (state, action: PayloadAction<string>) => {
      delete state.bookmarks.byId[action.payload];
      removeBookmarkId(state, action.payload);
    },
    editBookmark: (state, action: PayloadAction<Partial<Bookmark>>) => {
      if (!action.payload.id) {
        throw Error("Id needed in editBookmark payload");
      }
      state.bookmarks.byId[action.payload.id] = {
        ...state.bookmarks.byId[action.payload.id],
        ...action.payload,
      };
    },
    moveBookmark: (
      state,
      action: PayloadAction<{
        id: string;
        groupId: BookmarkDestinationId;
        index: number;
      }>,
    ) => {
      const { id, groupId, index } = action.payload;
      if (
        !state.bookmarks.byId[id] ||
        (groupId && !state.groups.byId[groupId])
      ) {
        return;
      }
      removeBookmarkId(state, id);
      const ids = getDestinationIds(state, groupId);
      if (!ids) {
        return;
      }
      ids.splice(Math.min(Math.max(index, 0), ids.length), 0, id);
    },
    addBookmarkGroup: (state, action: PayloadAction<BookmarkGroup>) => {
      const group = action.payload;
      if (
        !group.name.trim() ||
        state.groups.allIds.some(
          (id) =>
            state.groups.byId[id].name.toLowerCase() ===
            group.name.toLowerCase(),
        )
      ) {
        return;
      }
      state.groups.byId[group.id] = group;
      state.groups.allIds.push(group.id);
    },
    editBookmarkGroup: (
      state,
      action: PayloadAction<{ id: string; name: string }>,
    ) => {
      const { id, name } = action.payload;
      if (
        !state.groups.byId[id] ||
        !name.trim() ||
        state.groups.allIds.some(
          (groupId) =>
            groupId !== id &&
            state.groups.byId[groupId].name.toLowerCase() ===
              name.toLowerCase(),
        )
      ) {
        return;
      }
      state.groups.byId[id].name = name;
    },
    removeBookmarkGroup: (state, action: PayloadAction<string>) => {
      const group = state.groups.byId[action.payload];
      if (!group) {
        return;
      }
      for (const bookmarkId of group.bookmarkIds) {
        delete state.bookmarks.byId[bookmarkId];
      }
      delete state.groups.byId[action.payload];
      state.groups.allIds = state.groups.allIds.filter(
        (id) => id !== action.payload,
      );
    },
    moveBookmarkGroup: (
      state,
      action: PayloadAction<{ active: string; over: string }>,
    ) => {
      const oldIndex = state.groups.allIds.indexOf(action.payload.active);
      const newIndex = state.groups.allIds.indexOf(action.payload.over);
      if (oldIndex === -1 || newIndex === -1) {
        return;
      }
      state.groups.allIds.splice(oldIndex, 1);
      state.groups.allIds.splice(newIndex, 0, action.payload.active);
    },
  },
});

export const {
  addBookmark,
  removeBookmark,
  editBookmark,
  moveBookmark,
  addBookmarkGroup,
  editBookmarkGroup,
  removeBookmarkGroup,
  moveBookmarkGroup,
} = bookmarksSlice.actions;

export default bookmarksSlice.reducer;

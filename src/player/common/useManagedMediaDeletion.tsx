import React, { useRef, useState } from "react";
import { useStore } from "react-redux";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

import { RootState } from "../app/store";

export const isManagedMediaURL = (url: string) =>
  /^kenku-media:\/\/asset\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\.[a-z0-9]+)?$/.test(
    url,
  );


export function useManagedMediaDrafts() {
  const drafts = useRef(new Set<string>());

  function registerDraft(url: string, imported = false) {
    if (imported) drafts.current.add(url);
  }

  async function discardDrafts(keep?: string) {
    const urls = [...drafts.current].filter((url) => url !== keep);
    drafts.current.clear();
    if (urls.length === 0) return;
    try {
      await window.player.deleteManagedMedia(urls);
    } catch (error) {
      console.error("Failed to discard unreferenced managed media", error);
    }
  }

  return { registerDraft, discardDrafts };
}

export function getFinalManagedMediaURLs(
  state: RootState,
  removedURLs: string[],
) {
  const references = [
    ...Object.values(state.playlists.tracks).map((track) => track.url),
    ...Object.values(state.playlists.playlists.byId).map(
      (playlist) => playlist.background,
    ),
    ...Object.values(state.soundboards.sounds).map((sound) => sound.url),
    ...Object.values(state.soundboards.soundboards.byId).map(
      (soundboard) => soundboard.background,
    ),
  ];
  const counts = (urls: string[]) =>
    urls.reduce<Record<string, number>>((result, url) => {
      result[url] = (result[url] ?? 0) + 1;
      return result;
    }, {});
  const referenceCounts = counts(references);
  const removedCounts = counts(removedURLs);

  return Object.keys(removedCounts).filter(
    (url) =>
      isManagedMediaURL(url) &&
      removedCounts[url] >= (referenceCounts[url] ?? 0),
  );
}

type PendingDeletion = {
  urls: string[];
  onDelete: () => void;
};

export function useManagedMediaDeletion() {
  const store = useStore<RootState>();
  const [pending, setPending] = useState<PendingDeletion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  function requestDeletion(urls: string[], onDelete: () => void) {
    const finalURLs = getFinalManagedMediaURLs(store.getState(), urls);
    if (finalURLs.length === 0) {
      onDelete();
      return;
    }
    setError("");
    setPending({ urls: finalURLs, onDelete });
  }

  function cancelDeletion() {
    setPending(null);
    setError("");
  }

  async function confirmDeletion() {
    if (!pending) return;
    setDeleting(true);
    setError("");
    try {
      await window.player.deleteManagedMedia(pending.urls);
      pending.onDelete();
      setPending(null);
    } catch {
      setError("The media files could not be deleted. Nothing was changed.");
    } finally {
      setDeleting(false);
    }
  }

  const count = pending?.urls.length ?? 0;
  const dialog = (
    <Dialog open={Boolean(pending)} onClose={deleting ? undefined : cancelDeletion}>
      <DialogTitle>
        Delete {count === 1 ? "media file" : `${count} media files`}?
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {count === 1
            ? "This is the last reference to this managed file. Deleting it will permanently remove the file from your media library."
            : "These are the last references to these managed files. Deleting them will permanently remove the files from your media library."}
        </DialogContentText>
        {error && (
          <DialogContentText color="error" sx={{ mt: 1 }}>
            {error}
          </DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={cancelDeletion} disabled={deleting}>
          Cancel
        </Button>
        <Button onClick={confirmDeletion} color="error" disabled={deleting}>
          {deleting ? <CircularProgress size={20} /> : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { requestDeletion, dialog };
}

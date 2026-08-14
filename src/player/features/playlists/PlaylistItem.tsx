import React from "react";
import PlayArrowIcon from "@mui/icons-material/PlayArrowRounded";
import PauseIcon from "@mui/icons-material/PauseRounded";
import IconButton from "@mui/material/IconButton";

import { getBackgroundSource, isBackground } from "../../backgrounds";
import { MediaTile } from "../../common/MediaTile";

import { Playlist, Track } from "./playlistsSlice";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../app/store";
import { playPause, startQueue } from "./playlistPlaybackSlice";

type PlaylistItemProps = {
  playlist: Playlist;
  onSelect: (id: string) => void;
  onPlay: (track: Track) => void;
};

export function PlaylistItem({
  playlist,
  onSelect,
  onPlay,
}: PlaylistItemProps) {
  const playlists = useSelector((state: RootState) => state.playlists);
  const playing = useSelector(
    (state: RootState) =>
      state.playlistPlayback.playing &&
      state.playlistPlayback.queue?.playlistId === playlist.id
  );
  const queue = useSelector((state: RootState) => state.playlistPlayback.queue);
  const shuffle = useSelector(
    (state: RootState) => state.playlistPlayback.shuffle
  );

  const dispatch = useDispatch();

  const defaultBackground = isBackground(playlist.background);
  const image = getBackgroundSource(playlist.background);

  function handlePlay() {
    if (queue?.playlistId === playlist.id) {
      dispatch(playPause(!playing));
    } else {
      let tracks = [...playlist.tracks];
      const trackIndex = shuffle
        ? Math.floor(Math.random() * tracks.length)
        : 0;
      const trackId = tracks[trackIndex];
      const track = playlists.tracks[trackId];
      if (track) {
        dispatch(startQueue({ tracks, trackId, playlistId: playlist.id }));
        onPlay(track);
      }
    }
  }

  return (
    <MediaTile
      title={playlist.title}
      image={image}
      imageHeight={defaultBackground ? 140 : undefined}
      onSelect={() => onSelect(playlist.id)}
      action={
        <IconButton
          size="small"
          aria-label={playing ? "pause" : "play"}
          onClick={handlePlay}
        >
          {playing ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
      }
    />
  );
}

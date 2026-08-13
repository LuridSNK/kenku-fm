import React from "react";
import ShuffleIcon from "@mui/icons-material/ShuffleRounded";
import IconButton from "@mui/material/IconButton";

import { getBackgroundSource, isBackground } from "../../backgrounds";
import { MediaTile } from "../../common/MediaTile";

import { Sound, Soundboard } from "./soundboardsSlice";
import { useSelector } from "react-redux";
import { RootState } from "../../app/store";

type SoundboardItemProps = {
  soundboard: Soundboard;
  onSelect: (id: string) => void;
  onPlay: (sound: Sound) => void;
};

export function SoundboardItem({
  soundboard,
  onSelect,
  onPlay,
}: SoundboardItemProps) {
  const soundboards = useSelector((state: RootState) => state.soundboards);
  const defaultBackground = isBackground(soundboard.background);
  const image = getBackgroundSource(soundboard.background);

  function handleShuffle() {
    let sounds = [...soundboard.sounds];
    // Play a random sound from the soundboard
    const soundId = sounds[Math.floor(Math.random() * sounds.length)];
    const sound = soundboards.sounds[soundId];
    if (sound) {
      onPlay(sound);
    }
  }

  return (
    <MediaTile
      title={soundboard.title}
      image={image}
      imageHeight={defaultBackground ? 140 : undefined}
      onSelect={() => onSelect(soundboard.id)}
      action={
        <IconButton size="small" aria-label="shuffle" onClick={handleShuffle}>
          <ShuffleIcon />
        </IconButton>
      }
    />
  );
}

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { v4 as uuid } from "uuid";

import AddIcon from "@mui/icons-material/AddCircleRounded";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import {
  closestCorners,
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
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import { RootState } from "../../app/store";
import { getRandomBackground } from "../../backgrounds";
import { SortableItem } from "../../common/SortableItem";
import { FolderDrop, useFolderDrop } from "../../common/useFolderDrop";
import { PlaylistAdd } from "../playlists/PlaylistAdd";
import { PlaylistItem } from "../playlists/PlaylistItem";
import {
  addPlaylist,
  addTracks,
  movePlaylist,
  Track,
} from "../playlists/playlistsSlice";
import { SoundboardAdd } from "../soundboards/SoundboardAdd";
import { SoundboardItem } from "../soundboards/SoundboardItem";
import {
  addSoundboard,
  addSounds,
  moveSoundboard,
  Sound,
} from "../soundboards/soundboardsSlice";

type HomeProps = {
  onPlayTrack: (track: Track) => void;
  onPlaySound: (sound: Sound) => void;
};
type GallerySectionProps = {
  title: string;
  addLabel: string;
  dropLabel: string;
  itemIds: string[];
  folderDrop: FolderDrop;
  onAdd: () => void;
  children: React.ReactNode;
};


function GallerySection({
  title,
  addLabel,
  dropLabel,
  itemIds,
  folderDrop,
  onAdd,
  children,
}: GallerySectionProps) {
  return (
    <Card sx={{ position: "relative" }} {...folderDrop.containerListeners}>
      <CardContent>
        <Stack
          gap={1}
          justifyContent="space-between"
          alignItems="center"
          direction="row"
        >
          <Typography variant="h5" component="div">
            {title}
          </Typography>
          <Tooltip title={addLabel}>
            <IconButton aria-label={addLabel} onClick={onAdd}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </CardContent>
      <CardContent>
        <SortableContext items={itemIds} strategy={rectSortingStrategy}>
          <Box sx={{ columnWidth: "220px", columnGap: 2 }}>{children}</Box>
        </SortableContext>
      </CardContent>
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: folderDrop.dragging ? "flex" : "none",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "rgba(0, 0, 0, 0.8)",
        }}
        {...folderDrop.overlayListeners}
      >
        <Typography sx={{ pointerEvents: "none" }}>{dropLabel}</Typography>
      </Box>
    </Card>
  );
}


export function Home({ onPlayTrack, onPlaySound }: HomeProps) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const playlists = useSelector((state: RootState) => state.playlists);
  const soundboards = useSelector((state: RootState) => state.soundboards);
  const playlistIds = playlists.playlists.allIds;
  const soundboardIds = soundboards.soundboards.allIds;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [dragId, setDragId] = useState<string | null>(null);
  const [playlistAddOpen, setPlaylistAddOpen] = useState(false);
  const [soundboardAddOpen, setSoundboardAddOpen] = useState(false);

  function handleDragStart({ active }: DragStartEvent) {
    setDragId(String(active.id));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const activeId = String(active.id);
    const overId = over ? String(over.id) : null;

    if (overId && activeId !== overId) {
      if (playlistIds.includes(activeId) && playlistIds.includes(overId)) {
        dispatch(movePlaylist({ active: activeId, over: overId }));
      } else if (
        soundboardIds.includes(activeId) &&
        soundboardIds.includes(overId)
      ) {
        dispatch(moveSoundboard({ active: activeId, over: overId }));
      }
    }

    setDragId(null);
  }

  const playlistDrop = useFolderDrop((directories) => {
    for (const directory of Object.values(directories)) {
      if (directory.audioFiles.length > 0 && directory.path !== "/") {
        const id = uuid();
        dispatch(
          addPlaylist({
            id,
            background: getRandomBackground(),
            title: directory.name,
            tracks: [],
          })
        );
        dispatch(
          addTracks({ tracks: directory.audioFiles, playlistId: id })
        );
      }
    }
  });

  const soundboardDrop = useFolderDrop((directories) => {
    for (const directory of Object.values(directories)) {
      if (directory.audioFiles.length > 0 && directory.path !== "/") {
        const id = uuid();
        dispatch(
          addSoundboard({
            id,
            background: getRandomBackground(),
            title: directory.name,
            sounds: [],
          })
        );
        dispatch(
          addSounds({
            soundboardId: id,
            sounds: directory.audioFiles.map((file) => ({
              ...file,
              loop: false,
              volume: 1,
              fadeIn: 100,
              fadeOut: 100,
            })),
          })
        );
      }
    }
  });

  const draggedPlaylist = dragId
    ? playlists.playlists.byId[dragId]
    : undefined;
  const draggedSoundboard = dragId
    ? soundboards.soundboards.byId[dragId]
    : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragCancel={() => setDragId(null)}
      onDragEnd={handleDragEnd}
    >
      <Container
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          mt: 4,
          mb: "248px",
        }}
      >
        <GallerySection
          title="Playlists"
          addLabel="Add Playlist"
          dropLabel="Drop the playlists here..."
          itemIds={playlistIds}
          folderDrop={playlistDrop}
          onAdd={() => setPlaylistAddOpen(true)}
        >
          {playlistIds.map((id) => {
            const playlist = playlists.playlists.byId[id];
            return (
              <Box key={id} sx={{ breakInside: "avoid", mb: 2 }}>
                <SortableItem id={id}>
                  <PlaylistItem
                    playlist={playlist}
                    onSelect={(playlistId) =>
                      navigate(`/playlists/${playlistId}`)
                    }
                    onPlay={onPlayTrack}
                  />
                </SortableItem>
              </Box>
            );
          })}
        </GallerySection>

        <GallerySection
          title="Soundboards"
          addLabel="Add Soundboard"
          dropLabel="Drop the soundboards here..."
          itemIds={soundboardIds}
          folderDrop={soundboardDrop}
          onAdd={() => setSoundboardAddOpen(true)}
        >
          {soundboardIds.map((id) => {
            const soundboard = soundboards.soundboards.byId[id];
            return (
              <Box key={id} sx={{ breakInside: "avoid", mb: 2 }}>
                <SortableItem id={id}>
                  <SoundboardItem
                    soundboard={soundboard}
                    onSelect={(soundboardId) =>
                      navigate(`/soundboards/${soundboardId}`)
                    }
                    onPlay={onPlaySound}
                  />
                </SortableItem>
              </Box>
            );
          })}
        </GallerySection>

        <DragOverlay>
          {draggedPlaylist ? (
            <PlaylistItem
              playlist={draggedPlaylist}
              onSelect={() => {}}
              onPlay={() => {}}
            />
          ) : draggedSoundboard ? (
            <SoundboardItem
              soundboard={draggedSoundboard}
              onSelect={() => {}}
              onPlay={() => {}}
            />
          ) : null}
        </DragOverlay>

        <PlaylistAdd
          open={playlistAddOpen}
          onClose={() => setPlaylistAddOpen(false)}
        />
        <SoundboardAdd
          open={soundboardAddOpen}
          onClose={() => setSoundboardAddOpen(false)}
        />
      </Container>
    </DndContext>
  );
}

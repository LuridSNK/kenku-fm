import { useState } from "react";
import { v4 as uuid } from "uuid";

import { cleanFileName } from "../../renderer/common/drop";

export interface AudioFile {
  id: string;
  url: string;
  title: string;
}

const supportedFileTypes = [
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
  "audio/webm",
  "audio/ogg",
  "audio/webm",
  "audio/flac",
];

function isFileSystemFileEntry(
  entry: FileSystemEntry
): entry is FileSystemFileEntry {
  return entry.isFile;
}

function isFileSystemDirectoryEntry(
  entry: FileSystemEntry
): entry is FileSystemDirectoryEntry {
  return entry.isDirectory;
}

export type Directory = {
  path: string;
  name: string;
  audioFiles: AudioFile[];
};

export type FolderDrop = {
  dragging: boolean;
  containerListeners: {
    onDragEnter: React.DragEventHandler<HTMLDivElement>;
  };
  overlayListeners: {
    onDragLeave: React.DragEventHandler<HTMLDivElement>;
    onDragOver: React.DragEventHandler<HTMLDivElement>;
    onDrop: React.DragEventHandler<HTMLDivElement>;
  };
};

export type Directories = Record<string, Directory>;

async function getFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

async function getEntries(
  entry: FileSystemDirectoryEntry
): Promise<FileSystemEntry[]> {
  const reader = entry.createReader();
  const entries: FileSystemEntry[] = [];
  while (true) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    if (batch.length === 0) return entries;
    entries.push(...batch);
  }
}

async function getDirectories(
  entries: FileSystemEntry[],
  path: string = "/",
  directories: Directories = {
    "/": { path: "/", name: "root", audioFiles: [] },
  },
  importedURLs: string[] = [],
): Promise<Directories> {
  for (const entry of entries) {
    if (isFileSystemFileEntry(entry)) {
      const file = await getFile(entry);
      if (supportedFileTypes.includes(file.type)) {
        const url = await window.player.importMediaFile(file);
        importedURLs.push(url);
        directories[path].audioFiles.push({
          url,
          title: cleanFileName(file.name),
          id: uuid(),
        });
      }
    } else if (isFileSystemDirectoryEntry(entry)) {
      const folderPath = `${path === "/" ? "" : path}/${entry.name}`;
      directories[folderPath] = {
        path: folderPath,
        name: entry.name,
        audioFiles: [],
      };
      await getDirectories(
        await getEntries(entry),
        folderPath,
        directories,
        importedURLs,
      );
    }
  }
  return directories;
}

export function useFolderDrop(
  onDrop: (directories: Directories) => void
): FolderDrop {
  const [dragging, setDragging] = useState(false);
  function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const importedURLs: string[] = [];
    try {
      const entries = Array.from(event.dataTransfer.items).map((item) =>
        item.webkitGetAsEntry(),
      );
      const directories = await getDirectories(
        entries,
        "/",
        undefined,
        importedURLs,
      );
      onDrop(directories);
    } catch {
      await window.player.deleteManagedMedia(importedURLs);
    } finally {
      setDragging(false);
    }
  }

  const containerListeners = {
    onDragEnter: handleDragEnter,
  };
  const overlayListeners = {
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  };

  return { dragging, containerListeners, overlayListeners };
}

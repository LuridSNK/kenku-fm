import React, { useCallback, useEffect, useRef, useState } from "react";

export type FileInfo = { url: string; name: string };

function useFileDrop({
  onDrop,
  multiple,
  accept,
}: {
  onDrop: (files: FileInfo[]) => void;
  multiple: React.HTMLProps<HTMLInputElement>["multiple"];
  accept: React.HTMLProps<HTMLInputElement>["accept"];
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const importGeneration = useRef(0);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      importGeneration.current += 1;
    };
  }, []);

  function onDragEnter(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }

  function onDragLeave(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.relatedTarget !== rootRef.current.parentElement) {
      return;
    }
    setIsDragging(false);
  }

  function onDragOver(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  }

  async function onFileDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const eventFiles = event.dataTransfer.files;
    if (eventFiles) {
      await onFiles(eventFiles);
    }
  }

  function onClick() {
    setIsDragging(false);
    const input = inputRef.current;
    if (input) {
      input.click();
    }
  }

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const importPromise = onFiles(event.target.files);
    event.target.value = "";
    await importPromise;
  }

  async function discardImports(files: FileInfo[]) {
    if (files.length === 0) return;
    try {
      await window.player.deleteManagedMedia(files.map((file) => file.url));
    } catch (error) {
      console.error("Failed to discard imported media", error);
    }
  }

  async function onFiles(fileList: FileList | null) {
    if (!fileList) {
      return;
    }
    const maxFiles = multiple ? fileList.length : Math.min(fileList.length, 1);
    const files = Array.from(fileList)
      .slice(0, maxFiles)
      .filter((file) => checkAccept(file.type));

    const generation = ++importGeneration.current;
    setImportError(null);
    const results = await Promise.allSettled(
      files.map(async (file) => ({
        url: await window.player.importMediaFile(file),
        name: file.name,
      })),
    );
    const imported = results
      .filter(
        (result): result is PromiseFulfilledResult<FileInfo> =>
          result.status === "fulfilled",
      )
      .map((result) => result.value);
    if (!active.current || generation !== importGeneration.current) {
      await discardImports(imported);
      return;
    }
    if (results.some((result) => result.status === "rejected")) {
      await discardImports(imported);
      setImportError("Unable to import this file. Please try again.");
      return;
    }
    onDrop(imported);
  }

  // TODO: Make this check better i.e. check for explicit accepted files but this works for now
  function checkAccept(type: string) {
    if (accept.endsWith("*")) {
      return type.startsWith(accept.slice(0, -1));
    } else {
      return type === accept;
    }
  }

  // Use ref callback to make TS happy
  const rootRefCallback = useCallback((node: HTMLElement | null) => {
    rootRef.current = node;
  }, []);

  const rootProps = {
    onDragEnter,
    onDragLeave,
    onDragOver,
    onDrop: onFileDrop,
    onClick,
    ref: rootRefCallback,
  };

  const inputProps = {
    ref: inputRef,
    multiple,
    accept,
    style: {
      display: "none",
    },
    type: "file",
    onChange,
  };

  return {
    isDragging,
    importError,
    clearImportError: () => {
      importGeneration.current += 1;
      setImportError(null);
    },
    importFiles: onFiles,
    rootProps,
    inputProps,
  };
}

export default useFileDrop;

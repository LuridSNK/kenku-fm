import React, { useCallback } from "react";

import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Link } from "@mui/material";

import { cleanFileName } from "../../renderer/common/drop";
import useFileDrop, { FileInfo } from "./useFileDrop";

type AudioSelectorProps = {
  value: string;
  onChange: (value: string, imported?: boolean) => void;
  onFileName: (name: string) => void;
};

const formats = ["mp3", "flac", "wav", "ogg", "mp4", "3gp", "webm", "mpeg"];

export function AudioSelector({
  value,
  onChange,
  onFileName,
}: AudioSelectorProps) {
  const onDrop = useCallback(
    (acceptedFiles: FileInfo[]) => {
      const file = acceptedFiles[0];
      if (file) {
        onChange(file.url, true);
        onFileName(cleanFileName(file.name));
      }
    },
    [onChange, onFileName]
  );

  const {
    rootProps,
    inputProps,
    isDragging,
    importError,
    clearImportError,
    importFiles,
  } = useFileDrop({
    onDrop,
    accept: "audio/*",
    multiple: false,
  });
  function handleURLChange(event: React.ChangeEvent<HTMLInputElement>) {
    clearImportError();
    onChange(event.target.value);
  }

  async function handleURLDrop(event: React.DragEvent<HTMLInputElement>) {
    event.preventDefault();
    await importFiles(event.dataTransfer.files);
  }

  const warning =
    value && !formats.some((format) => value.toLowerCase().endsWith(format));

  return (
    <>
      <TextField
        autoFocus
        margin="dense"
        id="url"
        label="Source"
        placeholder="Enter a URL or select a track below"
        fullWidth
        variant="standard"
        autoComplete="off"
        InputLabelProps={{
          shrink: true,
        }}
        value={value}
        onChange={handleURLChange}
        onDrop={handleURLDrop}
        error={Boolean(importError)}
        color={warning ? "warning" : undefined}
        helperText={
          importError ||
          (warning ? (
            <>
              Unable to verify audio format, this file may not be supported. See{" "}
              <Link
                href="https://www.kenku.fm/docs/using-kenku-player"
                target="_blank"
                rel="noopener noreferrer"
              >
                here
              </Link>{" "}
              for more information.
            </>
          ) : undefined)
        }
      />
      <Button
        sx={{
          p: 2,
          borderStyle: "dashed",
          my: 1,
        }}
        variant="outlined"
        fullWidth
        {...rootProps}
      >
        <input {...inputProps} />
        {isDragging ? (
          <Typography variant="caption">Drop the track here...</Typography>
        ) : (
          <Typography variant="caption">
            Drag and drop or click to select a track
          </Typography>
        )}
      </Button>
    </>
  );
}

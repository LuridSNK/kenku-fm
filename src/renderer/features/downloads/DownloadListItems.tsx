import React, { useEffect, useState } from "react";
import CancelIcon from "@mui/icons-material/CancelRounded";
import DeleteIcon from "@mui/icons-material/DeleteOutlineRounded";
import FolderOpenIcon from "@mui/icons-material/FolderOpenRounded";
import RetryIcon from "@mui/icons-material/ReplayRounded";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  YouTubeDownloadJob,
  YouTubeDownloadUpdate,
} from "../../../types/youtubeDownloads";

const ACTIVE_STATES = new Set(["queued", "downloading", "saving", "canceling"]);

export function DownloadListItems() {
  const [jobsById, setJobsById] = useState<Record<string, YouTubeDownloadJob>>(
    {},
  );
  const jobs = Object.values(jobsById).sort(
    (left, right) => left.createdAt - right.createdAt,
  );

  useEffect(() => {
    let active = true;
    void window.kenku.listYouTubeDownloads().then((jobs) => {
      if (active) {
        setJobsById(Object.fromEntries(jobs.map((job) => [job.id, job])));
      }
    });
    const unsubscribe = window.kenku.onYouTubeDownloadUpdated(
      (update: YouTubeDownloadUpdate) => {
        setJobsById((current) => {
          const next = { ...current };
          if (update.job) next[update.id] = update.job;
          else delete next[update.id];
          return next;
        });
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (jobs.length === 0) return null;

  return (
    <>
      <ListItem sx={{ px: 3, py: 0.5 }}>
        <ListItemText primary="Downloads" />
      </ListItem>
      <List component="div" disablePadding>
        {jobs.map((job) => (
          <DownloadItem key={job.id} job={job} />
        ))}
      </List>
    </>
  );
}

function DownloadItem({ job }: { job: YouTubeDownloadJob }) {
  const canCancel = ["queued", "downloading"].includes(job.state);
  const canRetry = ["failed", "canceled"].includes(job.state);
  const canDismiss = ["failed", "canceled", "completed"].includes(job.state);
  const progress = job.state === "downloading" ? job.progress : undefined;
  const title = job.resolvedTitle || job.title || "YouTube audio";

  return (
    <Box sx={{ px: 2, py: 0.75 }}>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap title={title}>
            {title}
          </Typography>
          {job.error ? (
            <Tooltip
              title={job.error}
              placement="bottom-start"
              arrow
              componentsProps={{ tooltip: { sx: { maxWidth: 220 } } }}
            >
              <Typography
                variant="body2"
                color="error"
                noWrap
                sx={{ cursor: "help" }}
              >
                {job.error}
              </Typography>
            </Tooltip>
          ) : (
            <Typography variant="body2" color="text.secondary" noWrap>
              {stateLabel(job)}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: "flex", flexShrink: 0 }}>
          {canCancel && (
            <Tooltip title="Cancel">
              <IconButton
                size="small"
                aria-label="Cancel download"
                onClick={() => void window.kenku.cancelYouTubeDownload(job.id)}
              >
                <CancelIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canRetry && (
            <Tooltip title="Retry">
              <IconButton
                size="small"
                aria-label="Retry download"
                onClick={() => void window.kenku.retryYouTubeDownload(job.id)}
              >
                <RetryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {job.state === "completed" && (
            <Tooltip title="Show in folder">
              <IconButton
                size="small"
                aria-label="Show downloaded file in folder"
                onClick={() => void window.kenku.revealYouTubeDownload(job.id)}
              >
                <FolderOpenIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canDismiss && (
            <Tooltip title="Remove">
              <IconButton
                size="small"
                aria-label="Remove download"
                onClick={() => void window.kenku.dismissYouTubeDownload(job.id)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      {ACTIVE_STATES.has(job.state) && (
        <LinearProgress
          sx={{ mt: 0.75 }}
          variant={progress === undefined ? "indeterminate" : "determinate"}
          value={progress}
          aria-label={stateLabel(job)}
        />
      )}
    </Box>
  );
}

function stateLabel(job: YouTubeDownloadJob): string {
  switch (job.state) {
    case "queued":
      return "Queued";
    case "downloading":
      return job.progress === undefined
        ? "Downloading"
        : `Downloading ${Math.round(job.progress)}%`;
    case "saving":
      return "Saving";
    case "completed":
      return "Saved";
    case "canceling":
      return "Canceling";
    case "canceled":
      return "Canceled";
    default:
      return "Failed";
  }
}

import { app, ipcMain, shell, webContents, WebContents } from "electron";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { createInterface } from "readline";
import {
  access,
  copyFile,
  lstat,
  mkdir,
  readdir,
  rename,
  rm,
} from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  canonicalizeYouTubeUrl,
  YouTubeDownloadJob,
  YouTubeDownloadRequest,
  YouTubeDownloadUpdate,
} from "../types/youtubeDownloads";

const CONCURRENCY = 5;
const MAX_JOBS = 50;
const SUPPORTED_EXTENSIONS = new Set([".m4a"]);

type InternalJob = {
  value: YouTubeDownloadJob;
  senderId: number;
  destinationPath?: string;
  child?: ChildProcessWithoutNullStreams;
  tempDirectory?: string;
};

type DownloadResult = { filePath: string; title: string };

const jobs = new Map<string, InternalJob>();
const queue: string[] = [];
const running = new Set<string>();
const reservedPaths = new Set<string>();
let tempRoot = "";
let quitting = false;
let javaScriptRuntime: string | undefined;

async function findExecutable(name: string): Promise<string | undefined> {
  const extensions =
    process.platform === "win32"
      ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";")
      : [""];
  for (const directory of (process.env.PATH || "").split(path.delimiter)) {
    for (const extension of extensions) {
      const candidate = path.join(directory, `${name}${extension}`);
      try {
        await access(candidate);
        return candidate;
      } catch {
        // Keep searching PATH.
      }
    }
  }
  return undefined;
}

async function findJavaScriptRuntime(): Promise<string | undefined> {
  for (const name of ["deno", "node", "bun"]) {
    const executable = await findExecutable(name);
    if (executable) return `${name}:${executable}`;
  }
  return undefined;
}

function snapshot(job: InternalJob): YouTubeDownloadJob {
  return { ...job.value };
}

function publish(job: InternalJob) {
  const sender = webContents.fromId(job.senderId);
  if (!sender?.isDestroyed()) {
    const update: YouTubeDownloadUpdate = {
      id: job.value.id,
      job: snapshot(job),
    };
    sender.send("YOUTUBE_DOWNLOAD_UPDATED", update);
  }
}

function publishRemoval(job: InternalJob) {
  const sender = webContents.fromId(job.senderId);
  if (!sender?.isDestroyed()) {
    const update: YouTubeDownloadUpdate = { id: job.value.id };
    sender.send("YOUTUBE_DOWNLOAD_UPDATED", update);
  }
}

function update(job: InternalJob, patch: Partial<YouTubeDownloadJob>) {
  job.value = { ...job.value, ...patch };
  publish(job);
}

function isCanceling(job: InternalJob): boolean {
  return job.value.state === "canceling";
}

function errorMessage(error: unknown): string {
  if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
    return "yt-dlp was not found. Install it and restart Kenku FM.";
  }
  return error instanceof Error ? error.message : "YouTube download failed";
}

function validateRequest(input: unknown): YouTubeDownloadRequest {
  if (!input || typeof input !== "object") throw new Error("Invalid download");
  const request = input as YouTubeDownloadRequest;
  const sourceUrl = canonicalizeYouTubeUrl(request.sourceUrl);
  if (!sourceUrl) throw new Error("Invalid YouTube download request");
  return {
    sourceUrl,
    title:
      typeof request.title === "string"
        ? request.title.trim().slice(0, 200)
        : undefined,
  };
}

function jobsFor(senderId: number): YouTubeDownloadJob[] {
  return [...jobs.values()]
    .filter((job) => job.senderId === senderId)
    .map(snapshot)
    .sort((left, right) => left.createdAt - right.createdAt);
}

function activeJobCount(): number {
  return [...jobs.values()].filter((job) =>
    ["queued", "downloading", "saving", "canceling"].includes(job.value.state),
  ).length;
}

function enqueue(sender: WebContents, input: unknown): YouTubeDownloadJob {
  if (activeJobCount() >= MAX_JOBS) throw new Error("Download queue is full");
  const request = validateRequest(input);
  const job: InternalJob = {
    senderId: sender.id,
    value: {
      ...request,
      id: randomUUID(),
      state: "queued",
      createdAt: Date.now(),
    },
  };
  jobs.set(job.value.id, job);
  queue.push(job.value.id);
  publish(job);
  schedule();
  return snapshot(job);
}

function schedule() {
  if (quitting) return;
  while (running.size < CONCURRENCY && queue.length > 0) {
    const id = queue.shift();
    const job = id ? jobs.get(id) : undefined;
    if (!job || job.value.state !== "queued") continue;
    running.add(job.value.id);
    void runJob(job).finally(() => {
      running.delete(job.value.id);
      schedule();
    });
  }
}

async function runJob(job: InternalJob) {
  job.tempDirectory = path.join(tempRoot, job.value.id);
  try {
    await mkdir(job.tempDirectory);
    update(job, { state: "downloading", progress: 0, error: undefined });
    const result = await runYtDlp(job);
    if (isCanceling(job)) throw new Error("Download canceled");

    const filePath = await validateOutput(job.tempDirectory, result.filePath);
    if (isCanceling(job)) throw new Error("Download canceled");
    const resolvedTitle = cleanTitle(result.title);
    job.destinationPath = await reserveDownloadPath(resolvedTitle);
    update(job, {
      state: "saving",
      progress: 100,
      resolvedTitle,
    });
    await saveOutput(filePath, job.destinationPath, job.value.id);
    update(job, { state: "completed" });
  } catch (error) {
    if (job.destinationPath) {
      reservedPaths.delete(job.destinationPath);
      job.destinationPath = undefined;
    }
    update(job, {
      state: isCanceling(job) ? "canceled" : "failed",
      error: isCanceling(job) ? undefined : errorMessage(error),
    });
  } finally {
    job.child = undefined;
    if (job.tempDirectory) {
      await rm(job.tempDirectory, { recursive: true, force: true }).catch(
        console.error,
      );
    }
  }
}

function cleanTitle(value: string): string {
  return (
    value
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .trim()
      .slice(0, 200) || "YouTube audio"
  );
}

function safeFileName(value: string): string {
  return (
    cleanTitle(value)
      .replace(/[<>:"/\\|?*]/g, " ")
      .replace(/[. ]+$/g, "")
      .trim() || "YouTube audio"
  );
}

async function reserveDownloadPath(title: string): Promise<string> {
  const directory = app.getPath("downloads");
  const baseName = safeFileName(title);
  for (let number = 1; ; number += 1) {
    const suffix = number === 1 ? "" : ` (${number})`;
    const candidate = path.join(directory, `${baseName}${suffix}.m4a`);
    if (reservedPaths.has(candidate)) continue;
    try {
      await access(candidate);
      continue;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (reservedPaths.has(candidate)) continue;
    reservedPaths.add(candidate);
    return candidate;
  }
}

async function saveOutput(
  sourcePath: string,
  destinationPath: string,
  jobId: string,
) {
  const stagingPath = path.join(
    path.dirname(destinationPath),
    `.${path.basename(destinationPath)}.${jobId}.tmp`,
  );
  try {
    await copyFile(sourcePath, stagingPath);
    if (process.platform === "win32") {
      await rm(destinationPath, { force: true });
    }
    await rename(stagingPath, destinationPath);
  } finally {
    await rm(stagingPath, { force: true }).catch(console.error);
  }
}

async function validateOutput(
  directory: string,
  reportedPath: string,
): Promise<string> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries.filter(
    (entry) =>
      entry.isFile() &&
      SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
  );
  if (files.length !== 1)
    throw new Error("yt-dlp did not produce one supported audio file");

  const filePath = path.join(directory, files[0].name);
  if (path.resolve(filePath) !== path.resolve(reportedPath)) {
    throw new Error("yt-dlp reported an unexpected output file");
  }
  if (!(await lstat(filePath)).isFile())
    throw new Error("Downloaded audio is invalid");
  return filePath;
}

function runYtDlp(job: InternalJob): Promise<DownloadResult> {
  if (!job.tempDirectory) {
    return Promise.reject(new Error("Missing download directory"));
  }
  const { promise, resolve, reject } = Promise.withResolvers<DownloadResult>();
  const args = [
    "--ignore-config",
    "--no-plugin-dirs",
    "--no-remote-components",
    "--no-playlist",
    "--match-filter",
    "!is_live",
    "--format",
    "ba[ext=m4a]",
    "--fixup",
    "never",
    ...(javaScriptRuntime
      ? ["--no-js-runtimes", "--js-runtimes", javaScriptRuntime]
      : []),
    "--newline",
    "--no-colors",
    "--no-simulate",
    "--progress-template",
    "download:KENKU_PROGRESS\t%(progress._percent_str)s",
    "--print",
    "after_move:KENKU_RESULT\t%(filepath)j\t%(title)j\t%(ext)j",
    "--paths",
    job.tempDirectory,
    "--output",
    "audio.%(ext)s",
    "--",
    job.value.sourceUrl,
  ];
  const child = spawn("yt-dlp", args, {
    detached: process.platform !== "win32",
    shell: false,
    windowsHide: true,
  });
  job.child = child;
  let result: DownloadResult | undefined;
  let stderr = "";
  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    if (line.startsWith("KENKU_PROGRESS\t")) {
      const progress = Number.parseFloat(line.slice("KENKU_PROGRESS\t".length));
      if (Number.isFinite(progress)) {
        update(job, { progress: Math.max(0, Math.min(100, progress)) });
      }
    } else if (line.startsWith("KENKU_RESULT\t")) {
      try {
        const [filePath, title] = line
          .slice("KENKU_RESULT\t".length)
          .split("\t")
          .map((value) => JSON.parse(value));
        if (typeof filePath === "string" && typeof title === "string") {
          result = { filePath, title };
        }
      } catch {
        // Ignore output that does not match the fixed result template.
      }
    }
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderr = `${stderr}${chunk.toString()}`.slice(-16_384);
  });
  child.once("error", reject);
  child.once("close", (code) => {
    lines.close();
    if (job.value.state === "canceling") {
      reject(new Error("Download canceled"));
    } else if (code !== 0) {
      reject(new Error(lastError(stderr) || `yt-dlp exited with code ${code}`));
    } else if (!result) {
      reject(new Error("yt-dlp returned no audio file"));
    } else {
      resolve(result);
    }
  });
  return promise;
}

function lastError(stderr: string): string {
  return (
    stderr
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-1)[0]
      ?.replace(/^ERROR:\s*/, "")
      .slice(0, 500) ?? ""
  );
}

function terminate(job: InternalJob) {
  const child = job.child;
  if (!child?.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/PID", String(child.pid), "/T"], {
      shell: false,
      windowsHide: true,
    });
    setTimeout(() => {
      if (child.exitCode === null) {
        spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
          shell: false,
          windowsHide: true,
        });
      }
    }, 3000).unref();
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
    setTimeout(() => {
      if (child.exitCode === null) {
        try {
          process.kill(-child.pid, "SIGKILL");
        } catch {
          child.kill("SIGKILL");
        }
      }
    }, 3000).unref();
  }
}

function cancel(senderId: number, id: string): YouTubeDownloadJob {
  const job = ownedJob(senderId, id);
  if (job.value.state === "queued") {
    const index = queue.indexOf(id);
    if (index >= 0) queue.splice(index, 1);
    update(job, { state: "canceled", error: undefined });
    return snapshot(job);
  }
  if (job.value.state === "downloading") {
    update(job, { state: "canceling" });
    terminate(job);
  }
  return snapshot(job);
}

function retry(senderId: number, id: string): YouTubeDownloadJob {
  if (activeJobCount() >= MAX_JOBS) throw new Error("Download queue is full");
  const job = ownedJob(senderId, id);
  if (!["failed", "canceled"].includes(job.value.state)) {
    throw new Error("Download cannot be retried");
  }
  update(job, {
    state: "queued",
    progress: undefined,
    resolvedTitle: undefined,
    error: undefined,
  });
  queue.push(id);
  schedule();
  return snapshot(job);
}

function dismiss(senderId: number, id: string) {
  const job = ownedJob(senderId, id);
  if (!["completed", "failed", "canceled"].includes(job.value.state)) {
    throw new Error("Download cannot be removed");
  }
  jobs.delete(id);
  if (job.destinationPath) reservedPaths.delete(job.destinationPath);
  publishRemoval(job);
}
function reveal(senderId: number, id: string) {
  const job = ownedJob(senderId, id);
  if (job.value.state !== "completed" || !job.destinationPath) {
    throw new Error("Downloaded file is unavailable");
  }
  shell.showItemInFolder(job.destinationPath);
}

function ownedJob(senderId: number, id: string): InternalJob {
  const job = jobs.get(id);
  if (!job || job.senderId !== senderId) throw new Error("Download not found");
  return job;
}

function cancelSender(senderId: number) {
  for (const job of jobs.values()) {
    if (job.senderId === senderId) cancel(senderId, job.value.id);
  }
}

export async function registerYouTubeDownloads() {
  javaScriptRuntime = await findJavaScriptRuntime();
  tempRoot = path.join(app.getPath("temp"), "kenku-fm-downloads");
  await rm(tempRoot, { recursive: true, force: true });
  await mkdir(tempRoot, { recursive: true });

  ipcMain.handle("YOUTUBE_DOWNLOAD_ENQUEUE", (event, input) =>
    enqueue(event.sender, input),
  );
  ipcMain.handle("YOUTUBE_DOWNLOAD_LIST", (event) => jobsFor(event.sender.id));
  ipcMain.handle("YOUTUBE_DOWNLOAD_CANCEL", (event, id: string) =>
    cancel(event.sender.id, id),
  );
  ipcMain.handle("YOUTUBE_DOWNLOAD_RETRY", (event, id: string) =>
    retry(event.sender.id, id),
  );
  ipcMain.handle("YOUTUBE_DOWNLOAD_DISMISS", (event, id: string) =>
    dismiss(event.sender.id, id),
  );
  ipcMain.handle("YOUTUBE_DOWNLOAD_REVEAL", (event, id: string) =>
    reveal(event.sender.id, id),
  );

  app.on("before-quit", () => {
    quitting = true;
    for (const job of jobs.values()) {
      if (["queued", "downloading", "canceling"].includes(job.value.state)) {
        cancel(job.senderId, job.value.id);
      }
    }
  });
  app.on("web-contents-created", (_, contents) => {
    contents.once("destroyed", () => cancelSender(contents.id));
  });
}

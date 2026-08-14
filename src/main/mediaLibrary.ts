import { randomUUID } from "crypto";
import { constants } from "fs";
import {
  copyFile,
  cp,
  lstat,
  mkdir,
  readdir,
  rename,
  rm,
  stat,
} from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  net,
  protocol,
} from "electron";
import Store from "electron-store";

const SCHEME = "kenku-media";
const ASSET_FILENAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:\.[a-z0-9]+)?$/;

export function registerMediaLibraryScheme() {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true,
      },
    },
  ]);
}

function resolveManagedUrl(root: string, value: string): string {
  const url = new URL(value);
  const filename = url.pathname.slice(1);
  if (
    url.protocol !== `${SCHEME}:` ||
    url.hostname !== "asset" ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    !ASSET_FILENAME.test(filename) ||
    value !== `${SCHEME}://asset/${filename}`
  ) {
    throw new Error("Invalid managed media URL");
  }

  const mediaDirectory = path.resolve(root, "media");
  const filePath = path.resolve(mediaDirectory, filename);
  const relativePath = path.relative(mediaDirectory, filePath);
  if (
    !relativePath ||
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error("Invalid managed media URL");
  }
  return filePath;
}

async function listFiles(root: string): Promise<Map<string, number>> {
  const files = new Map<string, number>();

  async function visit(directory: string, relativeDirectory = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relativePath = path.join(relativeDirectory, entry.name);
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(filePath, relativePath);
      } else if (entry.isFile()) {
        files.set(relativePath, (await stat(filePath)).size);
      } else {
        throw new Error(`Unsupported media library entry: ${relativePath}`);
      }
    }
  }

  await visit(root);
  return files;
}

async function verifyCopy(source: string, destination: string) {
  const [sourceFiles, destinationFiles] = await Promise.all([
    listFiles(source),
    listFiles(destination),
  ]);
  if (sourceFiles.size !== destinationFiles.size) {
    throw new Error("Media library copy verification failed");
  }
  for (const [relativePath, size] of sourceFiles) {
    if (destinationFiles.get(relativePath) !== size) {
      throw new Error("Media library copy verification failed");
    }
  }
}

function containsPath(parent: string, child: string): boolean {
  const relativePath = path.relative(parent, child);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

async function migrateMediaRoot(
  store: Store<{ mediaRoot: string }>,
  selectedRoot: string,
): Promise<string> {
  const oldRoot = path.resolve(store.get("mediaRoot"));
  const newRoot = path.resolve(selectedRoot);
  if (path.relative(oldRoot, newRoot) === "") {
    return oldRoot;
  }

  const oldMedia = path.join(oldRoot, "media");
  const newMedia = path.join(newRoot, "media");
  if (containsPath(oldMedia, newMedia) || containsPath(newMedia, oldMedia)) {
    throw new Error("Media library roots cannot overlap");
  }

  const staging = path.join(newRoot, `.kenku-media-${randomUUID()}`);
  let installed = false;
  let switched = false;

  try {
    await mkdir(newRoot, { recursive: true });
    try {
      await lstat(newMedia);
      throw new Error("The selected root already contains a media library");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }

    let sourceExists = true;
    try {
      const source = await lstat(oldMedia);
      if (!source.isDirectory()) {
        throw new Error("The current media library is not a directory");
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
      sourceExists = false;
    }

    if (sourceExists) {
      await cp(oldMedia, staging, {
        recursive: true,
        force: false,
        errorOnExist: true,
      });
      await verifyCopy(oldMedia, staging);
    } else {
      await mkdir(staging);
    }
    await rename(staging, newMedia);
    installed = true;
    store.set("mediaRoot", newRoot);
    switched = true;
    await rm(oldMedia, { recursive: true, force: true }).catch((error) => {
      console.error("Failed to remove the previous media directory", error);
    });
    return newRoot;
  } catch (error) {
    await rm(staging, { recursive: true, force: true }).catch(
      (): undefined => undefined,
    );
    if (installed && !switched) {
      await rm(newMedia, { recursive: true, force: true }).catch(
        (): undefined => undefined,
      );
    }
    throw error;
  }
}

export function registerMediaLibrary() {
  const store = new Store<{ mediaRoot: string }>({
    defaults: { mediaRoot: path.join(app.getPath("music"), "Kenku FM") },
  });
  let previousMutation = Promise.resolve();
  function runMediaMutation<T>(operation: () => Promise<T>): Promise<T> {
    const result = previousMutation.then(operation, operation);
    previousMutation = result.then(
      (): undefined => undefined,
      (): undefined => undefined,
    );
    return result;
  }

  protocol.handle(SCHEME, async (request) => {
    let filePath: string;
    try {
      filePath = resolveManagedUrl(store.get("mediaRoot"), request.url);
    } catch {
      return new Response("Invalid managed media URL", { status: 400 });
    }

    try {
      if (!(await lstat(filePath)).isFile()) {
        return new Response("Managed media not found", { status: 404 });
      }
    } catch {
      return new Response("Managed media not found", { status: 404 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });

  ipcMain.handle("MEDIA_LIBRARY_GET_ROOT", () => store.get("mediaRoot"));
  ipcMain.handle("MEDIA_LIBRARY_CHOOSE_ROOT", async (event) => {
    const options: Electron.OpenDialogOptions = {
      properties: ["openDirectory", "createDirectory"],
    };
    const owner = BrowserWindow.fromWebContents(event.sender);
    const result = owner
      ? await dialog.showOpenDialog(owner, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return runMediaMutation(() =>
      migrateMediaRoot(store, result.filePaths[0]),
    );
  });
  ipcMain.handle("MEDIA_LIBRARY_IMPORT", (_, sourcePath: string) =>
    runMediaMutation(async () => {
      if (typeof sourcePath !== "string" || !path.isAbsolute(sourcePath)) {
        throw new Error("Invalid media file path");
      }
      const source = await stat(sourcePath);
      if (!source.isFile()) {
        throw new Error("Media import source is not a file");
      }

      const extension = path.extname(sourcePath).toLowerCase();
      const safeExtension = /^\.[a-z0-9]+$/.test(extension)
        ? extension
        : "";
      const filename = `${randomUUID()}${safeExtension}`;
      const mediaDirectory = path.join(store.get("mediaRoot"), "media");
      const destination = path.join(mediaDirectory, filename);
      await mkdir(mediaDirectory, { recursive: true });
      await copyFile(sourcePath, destination, constants.COPYFILE_EXCL);
      return `${SCHEME}://asset/${filename}`;
    }),
  );
  ipcMain.handle("MEDIA_LIBRARY_DELETE", (_, urls: string[]) =>
    runMediaMutation(async () => {
      if (
        !Array.isArray(urls) ||
        !urls.every((url) => typeof url === "string")
      ) {
        throw new Error("Invalid managed media URLs");
      }

      const mediaDirectory = path.join(store.get("mediaRoot"), "media");
      const files = [
        ...new Set(
          urls.map((url) => resolveManagedUrl(store.get("mediaRoot"), url)),
        ),
      ];
      if (files.length === 0) return;

      const trash = path.join(
        mediaDirectory,
        `.kenku-delete-${randomUUID()}`,
      );
      const moved: { source: string; destination: string }[] = [];
      await mkdir(trash, { recursive: true });
      try {
        for (const source of files) {
          const destination = path.join(trash, path.basename(source));
          try {
            await rename(source, destination);
            moved.push({ source, destination });
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          }
        }
      } catch (error) {
        const rollbacks = await Promise.allSettled(
          moved.map(({ source, destination }) => rename(destination, source)),
        );
        const rollbackErrors = rollbacks
          .filter(
            (result): result is PromiseRejectedResult =>
              result.status === "rejected",
          )
          .map((result) => result.reason);
        if (rollbackErrors.length > 0) {
          console.error("Media deletion rollback failed", error, rollbackErrors);
          throw new Error("Media deletion rollback failed");
        }
        await rm(trash, { recursive: true, force: true });
        throw error;
      }

      void runMediaMutation(() =>
        rm(trash, { recursive: true, force: true }),
      ).catch((error) => {
        console.error("Failed to remove deleted media files", error);
      });
    }),
  );
}

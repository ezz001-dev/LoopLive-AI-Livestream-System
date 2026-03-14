import { ChildProcess, spawn } from "child_process";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { AudioEvent, shiftAudioEvent } from "@/lib/audio-event-manager";
import path from "path";

type ActiveAudioBatch = {
  id: string;
  mode: "single" | "concat";
  inputPath: string;
  sourceEvents: AudioEvent[];
  durationMs: number;
  manifestPath: string | null;
};

type ManagedSession = {
  liveId: string;
  videoInput: string;
  streamUrl: string;
  loopMode: "infinite" | "count";
  loopCount: number | null;
  sourceHasAudio: boolean | null;
  manualStop: boolean;
  intentionalRespawn: boolean;
  restartAttempts: number;
  restartTimer: NodeJS.Timeout | null;
  audioPollTimer: NodeJS.Timeout | null;
  audioActivationTimer: NodeJS.Timeout | null;
  currentAudioBatch: ActiveAudioBatch | null;
  currentAudioEventTimer: NodeJS.Timeout | null;
  process: ChildProcess | null;
};

const MAX_RESTART_ATTEMPTS = 10;
const BASE_RESTART_DELAY_MS = 5000;
const MAX_RESTART_DELAY_MS = 60000;
const AUDIO_QUEUE_POLL_MS = 1500;
const AUDIO_EVENT_FALLBACK_DURATION_MS = 3000;
const AUDIO_BATCH_MAX_ITEMS = 5;
const AUDIO_BATCH_ACCUMULATION_MS = 400;
const AUDIO_BATCH_DIR = path.join(process.cwd(), "logs", "audio-batches");

function getStringEnv(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

function getNumberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getFfmpegConfig() {
  return {
    videoCodec: getStringEnv("FFMPEG_VIDEO_CODEC", "libx264"),
    preset: getStringEnv("FFMPEG_PRESET", "veryfast"),
    tune: getStringEnv("FFMPEG_TUNE", "zerolatency"),
    pixelFormat: getStringEnv("FFMPEG_PIXEL_FORMAT", "yuv420p"),
    fps: getNumberEnv("FFMPEG_FPS", 30),
    gop: getNumberEnv("FFMPEG_GOP", 60),
    videoBitrate: getStringEnv("FFMPEG_VIDEO_BITRATE", "2500k"),
    maxrate: getStringEnv("FFMPEG_MAXRATE", "2500k"),
    bufsize: getStringEnv("FFMPEG_BUFSIZE", "5000k"),
    audioCodec: getStringEnv("FFMPEG_AUDIO_CODEC", "aac"),
    audioRate: getNumberEnv("FFMPEG_AUDIO_RATE", 44100),
    audioChannels: getNumberEnv("FFMPEG_AUDIO_CHANNELS", 2),
    audioBitrate: getStringEnv("FFMPEG_AUDIO_BITRATE", "128k"),
    maxRestartAttempts: getNumberEnv("FFMPEG_MAX_RESTART_ATTEMPTS", MAX_RESTART_ATTEMPTS),
    baseRestartDelayMs: getNumberEnv("FFMPEG_RESTART_DELAY_MS", BASE_RESTART_DELAY_MS),
    maxRestartDelayMs: getNumberEnv("FFMPEG_MAX_RESTART_DELAY_MS", MAX_RESTART_DELAY_MS),
    duckingEnabled: getStringEnv("STREAM_AUDIO_DUCKING_ENABLED", "true") === "true",
    duckingLevel: getStringEnv("STREAM_AUDIO_DUCKING_LEVEL", "0.35"),
    eventGain: getStringEnv("STREAM_AUDIO_EVENT_GAIN", "1.0"),
    mainGain: getStringEnv("STREAM_AUDIO_MAIN_GAIN", "1.0"),
    eventFadeInSeconds: getStringEnv("STREAM_AUDIO_EVENT_FADE_IN_SECONDS", "0.12"),
    eventFadeOutSeconds: getStringEnv("STREAM_AUDIO_EVENT_FADE_OUT_SECONDS", "0.18"),
  };
}

function resolveAudioPath(audioPath: string) {
  if (audioPath.startsWith("/")) {
    return path.join(process.cwd(), "public", audioPath.replace(/^\/+/, ""));
  }

  return audioPath;
}

async function getAudioDurationMs(audioPath: string) {
  const resolvedAudioPath = resolveAudioPath(audioPath);
  if (!fs.existsSync(resolvedAudioPath)) {
    console.warn(`[WorkerManager][AudioQueue] Audio file not found for duration probe: ${resolvedAudioPath}`);
    return AUDIO_EVENT_FALLBACK_DURATION_MS;
  }

  return new Promise<number>((resolve) => {
    const ffprobe = spawn("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      resolvedAudioPath,
    ]);

    let output = "";

    ffprobe.stdout.on("data", (data) => {
      output += data.toString();
    });

    ffprobe.on("error", () => {
      resolve(AUDIO_EVENT_FALLBACK_DURATION_MS);
    });

    ffprobe.on("close", () => {
      const durationSeconds = Number(output.trim());
      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
        resolve(AUDIO_EVENT_FALLBACK_DURATION_MS);
        return;
      }

      resolve(Math.ceil(durationSeconds * 1000));
    });
  });
}

function ensureAudioBatchDir() {
  if (!fs.existsSync(AUDIO_BATCH_DIR)) {
    fs.mkdirSync(AUDIO_BATCH_DIR, { recursive: true });
  }
}

function escapeConcatPath(filepath: string) {
  return filepath.replace(/'/g, "'\\''");
}

async function buildAudioBatch(liveId: string, firstEvent: AudioEvent) {
  const events: AudioEvent[] = [firstEvent];

  while (events.length < AUDIO_BATCH_MAX_ITEMS) {
    const next = await shiftAudioEvent(liveId);
    if (!next) break;
    events.push(next);
  }

  const durations = await Promise.all(events.map((event) => getAudioDurationMs(event.audioPath)));
  const durationMs = durations.reduce((total, value) => total + value, 0);

  if (events.length === 1) {
    return {
      id: firstEvent.id,
      mode: "single" as const,
      inputPath: resolveAudioPath(firstEvent.audioPath),
      sourceEvents: events,
      durationMs,
      manifestPath: null,
    };
  }

  ensureAudioBatchDir();
  const manifestPath = path.join(AUDIO_BATCH_DIR, `${liveId}-${Date.now()}-${firstEvent.id}.txt`);
  const manifestContents = events
    .map((event) => `file '${escapeConcatPath(resolveAudioPath(event.audioPath))}'`)
    .join("\n");

  await fs.promises.writeFile(manifestPath, manifestContents, "utf8");

  return {
    id: firstEvent.id,
    mode: "concat" as const,
    inputPath: manifestPath,
    sourceEvents: events,
    durationMs,
    manifestPath,
  };
}

async function cleanupAudioBatchFiles(batch: ActiveAudioBatch | null) {
  if (!batch?.manifestPath) return;

  try {
    await fs.promises.unlink(batch.manifestPath);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== "ENOENT") {
      console.warn(`[WorkerManager][AudioQueue] Failed to remove audio batch manifest ${batch.manifestPath}:`, error);
    }
  }
}

function getEventFadeOutStartSeconds(durationMs: number, fadeOutSeconds: number) {
  const totalSeconds = durationMs / 1000;
  const safeFadeOut = Math.max(0, fadeOutSeconds);
  return Math.max(0, totalSeconds - safeFadeOut);
}

async function probeInputHasAudio(input: string) {
  return new Promise<boolean>((resolve) => {
    const ffprobe = spawn("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "a:0",
      "-show_entries",
      "stream=codec_type",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      input,
    ]);

    let output = "";

    ffprobe.stdout.on("data", (data) => {
      output += data.toString();
    });

    ffprobe.on("error", () => resolve(false));
    ffprobe.on("close", () => resolve(output.trim().includes("audio")));
  });
}

/**
 * WorkerManager handles FFmpeg processes for loop streaming.
 * It is implemented as a singleton to maintain process state across API requests.
 */
class WorkerManager {
  private sessions: Map<string, ManagedSession> = new Map();

  constructor() {
    console.log("[WorkerManager] Initialized");
  }

  /**
   * Starts a livestream loop for a specific session.
   * @param liveId The unique ID of the live session.
   * @param videoInput The local file path or remote URL for FFmpeg input.
   * @param streamUrl The RTMP ingestion URL for a platform destination or internal relay.
   */
  public start(
    liveId: string,
    videoInput: string,
    streamUrl: string,
    loopOptions?: { loopMode?: "infinite" | "count"; loopCount?: number | null }
  ) {
    const existing = this.sessions.get(liveId);
    if (existing?.process) {
      console.warn(`[WorkerManager] Session ${liveId} is already running.`);
      return;
    }

    const isRemoteInput = /^https?:\/\//i.test(videoInput);
    if (!isRemoteInput && !fs.existsSync(videoInput)) {
      throw new Error(`Video file not found: ${videoInput}`);
    }

    const session: ManagedSession = existing ?? {
      liveId,
      videoInput,
      streamUrl,
      loopMode: loopOptions?.loopMode === "count" ? "count" : "infinite",
      loopCount:
        loopOptions?.loopMode === "count" && Number.isInteger(loopOptions.loopCount) && Number(loopOptions.loopCount) > 0
          ? Number(loopOptions.loopCount)
          : null,
      sourceHasAudio: null,
      manualStop: false,
      intentionalRespawn: false,
      restartAttempts: 0,
      restartTimer: null,
      audioPollTimer: null,
      audioActivationTimer: null,
      currentAudioBatch: null,
      currentAudioEventTimer: null,
      process: null,
    };

    session.videoInput = videoInput;
    session.streamUrl = streamUrl;
    session.loopMode = loopOptions?.loopMode === "count" ? "count" : "infinite";
    session.loopCount =
      session.loopMode === "count" && Number.isInteger(loopOptions?.loopCount) && Number(loopOptions?.loopCount) > 0
        ? Number(loopOptions?.loopCount)
        : null;
    session.sourceHasAudio = null;
    session.manualStop = false;
    session.intentionalRespawn = false;
    if (session.restartTimer) {
      clearTimeout(session.restartTimer);
      session.restartTimer = null;
    }

    this.sessions.set(liveId, session);
    this.startAudioPolling(session);
    this.spawnProcess(session);
  }

  private startAudioPolling(session: ManagedSession) {
    if (session.audioPollTimer) return;

    session.audioPollTimer = setInterval(() => {
      void this.processNextAudioEvent(session);
    }, AUDIO_QUEUE_POLL_MS);

    void this.processNextAudioEvent(session);
  }

  private async processNextAudioEvent(session: ManagedSession) {
    if (
      session.manualStop ||
      session.currentAudioBatch ||
      session.currentAudioEventTimer ||
      session.audioActivationTimer
    ) {
      return;
    }

    const nextEvent = await shiftAudioEvent(session.liveId);
    if (!nextEvent) {
      return;
    }

    session.audioActivationTimer = setTimeout(() => {
      void this.activateAudioBatch(session, nextEvent);
    }, AUDIO_BATCH_ACCUMULATION_MS);
  }

  private async activateAudioBatch(session: ManagedSession, firstEvent: AudioEvent) {
    session.audioActivationTimer = null;

    if (session.manualStop || session.currentAudioBatch) {
      return;
    }

    const batch = await buildAudioBatch(session.liveId, firstEvent);
    session.currentAudioBatch = batch;

    const batchTypes = batch.sourceEvents.map((event) => event.type).join(", ");
    console.log(
      `[WorkerManager][AudioQueue] Activated audio batch for ${session.liveId}: ${batch.sourceEvents.length} event(s), types=[${batchTypes}], duration≈${batch.durationMs}ms`
    );

    this.respawnForAudioTransition(session, `audio-batch-started:${batch.sourceEvents.length}`);

    session.currentAudioEventTimer = setTimeout(() => {
      void this.finishAudioBatch(session);
    }, batch.durationMs);
  }

  private async finishAudioBatch(session: ManagedSession) {
    const finishedBatch = session.currentAudioBatch;

    if (finishedBatch) {
      console.log(
        `[WorkerManager][AudioQueue] Finished audio batch for ${session.liveId}: ${finishedBatch.sourceEvents.length} event(s)`
      );
    }

    session.currentAudioBatch = null;
    session.currentAudioEventTimer = null;

    await cleanupAudioBatchFiles(finishedBatch);

    this.respawnForAudioTransition(session, "audio-batch-finished");
  }

  private async spawnProcess(session: ManagedSession) {
    const isRemoteInput = /^https?:\/\//i.test(session.videoInput);
    const ffmpegConfig = getFfmpegConfig();
    if (session.sourceHasAudio === null) {
      session.sourceHasAudio = await probeInputHasAudio(session.videoInput);
      console.log(
        `[WorkerManager] Source audio probe for ${session.liveId}: ${session.sourceHasAudio ? "audio track found" : "no audio track"}`
      );
    }

    console.log(
      `[WorkerManager] Starting stream for ${session.liveId} using ${session.videoInput} [loop=${session.loopMode}${
        session.loopMode === "count" ? `:${session.loopCount}` : ""
      }]${
        session.currentAudioBatch
          ? ` + audio batch ${session.currentAudioBatch.inputPath} (${session.currentAudioBatch.sourceEvents.length} event)`
          : ""
      }`
    );

    const inputArgs = isRemoteInput
      ? [
          "-reconnect", "1",
          "-reconnect_streamed", "1",
          "-reconnect_on_network_error", "1",
          "-reconnect_on_http_error", "4xx,5xx",
          "-reconnect_delay_max", "5",
          "-rw_timeout", "15000000",
          "-protocol_whitelist", "file,http,https,tcp,tls,crypto",
          "-user_agent", "LoopLive-FFmpeg/1.0",
        ]
      : [];

    const ffmpegArgs = [...inputArgs, "-re"];

    if (session.loopMode === "infinite") {
      ffmpegArgs.push("-stream_loop", "-1");
    } else if (session.loopMode === "count" && session.loopCount && session.loopCount > 1) {
      ffmpegArgs.push("-stream_loop", String(session.loopCount - 1));
    }

    ffmpegArgs.push("-i", session.videoInput);

    if (session.currentAudioBatch) {
      if (session.currentAudioBatch.mode === "concat") {
        ffmpegArgs.push("-f", "concat", "-safe", "0", "-i", session.currentAudioBatch.inputPath);
      } else {
        ffmpegArgs.push("-i", session.currentAudioBatch.inputPath);
      }
    }

    const baseEncodingArgs = [
      "-c:v", ffmpegConfig.videoCodec,
      "-preset", ffmpegConfig.preset,
      "-tune", ffmpegConfig.tune,
      "-pix_fmt", ffmpegConfig.pixelFormat,
      "-r", String(ffmpegConfig.fps),
      "-g", String(ffmpegConfig.gop),
      "-keyint_min", String(ffmpegConfig.gop),
      "-sc_threshold", "0",
      "-b:v", ffmpegConfig.videoBitrate,
      "-maxrate", ffmpegConfig.maxrate,
      "-bufsize", ffmpegConfig.bufsize,
      "-c:a", ffmpegConfig.audioCodec,
      "-ar", String(ffmpegConfig.audioRate),
      "-ac", String(ffmpegConfig.audioChannels),
      "-b:a", ffmpegConfig.audioBitrate,
      "-f", "flv",
      session.streamUrl,
    ];

    if (session.currentAudioBatch) {
      const fadeOutStart = getEventFadeOutStartSeconds(
        session.currentAudioBatch.durationMs,
        Number(ffmpegConfig.eventFadeOutSeconds)
      );
      const eventFilter = [
        `volume=${ffmpegConfig.eventGain}`,
        `afade=t=in:st=0:d=${ffmpegConfig.eventFadeInSeconds}`,
        `afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${ffmpegConfig.eventFadeOutSeconds}`,
      ].join(",");

      const duckingFilter = ffmpegConfig.duckingEnabled
        ? `[main_pre][event_sc]sidechaincompress=threshold=0.02:ratio=10:attack=25:release=650:makeup=1[ducked_sc];[ducked_sc]volume=${ffmpegConfig.duckingLevel}[ducked]`
        : `[main_pre]volume=${ffmpegConfig.mainGain}[ducked]`;

      const filterComplex = session.sourceHasAudio
        ? `[0:a:0]volume=${ffmpegConfig.mainGain}[main_pre];[1:a]${eventFilter}[event_pre];[event_pre]asplit=2[event_mix][event_sc];${duckingFilter};[ducked][event_mix]amix=inputs=2:duration=first:dropout_transition=0.20:normalize=0[aout]`
        : `anullsrc=channel_layout=stereo:sample_rate=${ffmpegConfig.audioRate}[base];[base]volume=${ffmpegConfig.mainGain}[main_pre];[1:a]${eventFilter}[event_pre];[event_pre]asplit=2[event_mix][event_sc];${duckingFilter};[ducked][event_mix]amix=inputs=2:duration=first:dropout_transition=0.20:normalize=0[aout]`;

      ffmpegArgs.push(
        "-filter_complex",
        filterComplex,
        "-map",
        "0:v:0",
        "-map",
        "[aout]",
        ...baseEncodingArgs
      );
    } else {
      ffmpegArgs.push(
        "-map",
        "0:v:0",
        ...(session.sourceHasAudio ? ["-map", "0:a:0?"] : []),
        ...baseEncodingArgs
      );
    }

    const ffmpeg = spawn("ffmpeg", ffmpegArgs, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    session.process = ffmpeg;

    // Temporarily disabled to keep YouTube comment and sound-effect debugging readable.
    // ffmpeg.stderr.on("data", (data) => {
    //   const message = data.toString().trim();
    //   if (message) {
    //     console.error(`[FFmpeg ${session.liveId}] ${message}`);
    //   }
    // });

    ffmpeg.on("error", (error) => {
      console.error(`[WorkerManager] FFmpeg process error for ${session.liveId}:`, error);
    });

    ffmpeg.on("close", (code, signal) => {
      void this.handleProcessClose(session, code, signal);
    });
  }

  private respawnForAudioTransition(session: ManagedSession, reason: string) {
    if (!session.process || session.manualStop) {
      return;
    }

    console.log(`[WorkerManager][AudioQueue] Respawning FFmpeg for ${session.liveId}: ${reason}`);
    session.intentionalRespawn = true;
    session.process.kill("SIGTERM");
  }

  private async handleProcessClose(
    session: ManagedSession,
    code: number | null,
    signal: NodeJS.Signals | null
  ) {
    const ffmpegConfig = getFfmpegConfig();

    console.log(
      `[WorkerManager] FFmpeg process for ${session.liveId} exited with code ${code} and signal ${signal}`
    );

    session.process = null;

    if (session.intentionalRespawn) {
      session.intentionalRespawn = false;
      if (session.manualStop) {
        await this.updateSessionStatus(session.liveId, "STOPPED");
        this.cleanupSession(session.liveId);
        return;
      }

      void this.spawnProcess(session);
      return;
    }

    if (session.manualStop) {
      await this.updateSessionStatus(session.liveId, "STOPPED");
      this.cleanupSession(session.liveId);
      return;
    }

    if (session.restartAttempts >= ffmpegConfig.maxRestartAttempts) {
      console.error(
        `[WorkerManager] Session ${session.liveId} reached max restart attempts (${ffmpegConfig.maxRestartAttempts}).`
      );
      await this.updateSessionStatus(session.liveId, "ERROR");
      this.cleanupSession(session.liveId);
      return;
    }

    session.restartAttempts += 1;
    const delay = Math.min(
      ffmpegConfig.baseRestartDelayMs * session.restartAttempts,
      ffmpegConfig.maxRestartDelayMs
    );

    console.warn(
      `[WorkerManager] Scheduling restart ${session.restartAttempts}/${ffmpegConfig.maxRestartAttempts} for ${session.liveId} in ${delay}ms`
    );

    session.restartTimer = setTimeout(() => {
      session.restartTimer = null;
      if (session.manualStop) {
        void this.updateSessionStatus(session.liveId, "STOPPED");
        this.cleanupSession(session.liveId);
        return;
      }

      void this.spawnProcess(session);
    }, delay);
  }

  private async updateSessionStatus(liveId: string, status: "STOPPED" | "ERROR") {
    try {
      await prisma.live_sessions.update({
        where: { id: liveId },
        data: {
          status,
          ...(status === "STOPPED" ? { viewer_count: 0 } : {}),
        },
      });
    } catch (error) {
      console.log(
        `[WorkerManager] Failed to update session ${liveId} status to ${status}:`,
        error
      );
    }
  }

  private cleanupSession(liveId: string) {
    const session = this.sessions.get(liveId);
    if (!session) return;

    if (session.restartTimer) {
      clearTimeout(session.restartTimer);
      session.restartTimer = null;
    }

    if (session.audioActivationTimer) {
      clearTimeout(session.audioActivationTimer);
      session.audioActivationTimer = null;
    }

    if (session.currentAudioEventTimer) {
      clearTimeout(session.currentAudioEventTimer);
      session.currentAudioEventTimer = null;
    }

    if (session.audioPollTimer) {
      clearInterval(session.audioPollTimer);
      session.audioPollTimer = null;
    }

    void cleanupAudioBatchFiles(session.currentAudioBatch);
    session.currentAudioBatch = null;

    this.sessions.delete(liveId);
  }

  /**
   * Stops a livestream for a specific session.
   * @param liveId The unique ID of the live session.
   */
  public stop(liveId: string) {
    const session = this.sessions.get(liveId);
    if (!session) {
      return false;
    }

    session.manualStop = true;
    session.restartAttempts = 0;

    if (session.restartTimer) {
      clearTimeout(session.restartTimer);
      session.restartTimer = null;
    }

    if (session.audioActivationTimer) {
      clearTimeout(session.audioActivationTimer);
      session.audioActivationTimer = null;
    }

    if (session.currentAudioEventTimer) {
      clearTimeout(session.currentAudioEventTimer);
      session.currentAudioEventTimer = null;
    }

    if (session.audioPollTimer) {
      clearInterval(session.audioPollTimer);
      session.audioPollTimer = null;
    }

    void cleanupAudioBatchFiles(session.currentAudioBatch);
    session.currentAudioBatch = null;

    if (session.process) {
      console.log(`[WorkerManager] Killing process for ${liveId}`);
      session.process.kill("SIGTERM");
    } else {
      this.cleanupSession(liveId);
    }

    return true;
  }

  /**
   * Checks if a session is currently streaming or waiting for restart.
   */
  public isRunning(liveId: string): boolean {
    return this.sessions.has(liveId);
  }
}

// Singleton Pattern for Next.js
const globalForWorker = global as unknown as { workerManager: WorkerManager };
export const workerManager = globalForWorker.workerManager || new WorkerManager();

if (process.env.NODE_ENV !== "production") globalForWorker.workerManager = workerManager;

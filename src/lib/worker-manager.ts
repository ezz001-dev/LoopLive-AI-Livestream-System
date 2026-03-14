import { ChildProcess, spawn } from "child_process";
import fs from "fs";
import { prisma } from "@/lib/prisma";

type ManagedSession = {
  liveId: string;
  videoInput: string;
  streamUrl: string;
  manualStop: boolean;
  restartAttempts: number;
  restartTimer: NodeJS.Timeout | null;
  process: ChildProcess | null;
};

const MAX_RESTART_ATTEMPTS = 10;
const BASE_RESTART_DELAY_MS = 5000;
const MAX_RESTART_DELAY_MS = 60000;

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
  };
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
  public start(liveId: string, videoInput: string, streamUrl: string) {
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
      manualStop: false,
      restartAttempts: 0,
      restartTimer: null,
      process: null,
    };

    session.videoInput = videoInput;
    session.streamUrl = streamUrl;
    session.manualStop = false;
    if (session.restartTimer) {
      clearTimeout(session.restartTimer);
      session.restartTimer = null;
    }

    this.sessions.set(liveId, session);
    this.spawnProcess(session);
  }

  private spawnProcess(session: ManagedSession) {
    const isRemoteInput = /^https?:\/\//i.test(session.videoInput);
    const ffmpegConfig = getFfmpegConfig();

    console.log(`[WorkerManager] Starting stream for ${session.liveId} using ${session.videoInput}`);

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

    const ffmpegArgs = [
      ...inputArgs,
      "-re",
      "-stream_loop", "-1",
      "-i", session.videoInput,
      "-map", "0:v:0",
      "-map", "0:a:0?",
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

    const ffmpeg = spawn("ffmpeg", ffmpegArgs, {
      stdio: ["ignore", "ignore", "pipe"],
    });

    session.process = ffmpeg;

    ffmpeg.stderr.on("data", (data) => {
      const message = data.toString().trim();
      if (message) {
        console.error(`[FFmpeg ${session.liveId}] ${message}`);
      }
    });

    ffmpeg.on("error", (error) => {
      console.error(`[WorkerManager] FFmpeg process error for ${session.liveId}:`, error);
    });

    ffmpeg.on("close", (code, signal) => {
      void this.handleProcessClose(session, code, signal);
    });
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

      this.spawnProcess(session);
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

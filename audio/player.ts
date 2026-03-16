import path from "path";
import { fileURLToPath } from "url";
import { spawn, type ChildProcess } from "child_process";
import findExec from "./utils/findExec.js";

type SoundName =
  | "achievement"
  | "capture"
  | "castle"
  | "click"
  | "correct"
  | "decline"
  | "drawoffer"
  | "event-end"
  | "event-start"
  | "event-warning"
  | "game-draw"
  | "game-end"
  | "game-lose"
  | "game-start"
  | "game-win"
  | "game-win-3"
  | "illegal"
  | "incorrect"
  | "lesson-fail"
  | "lesson-pass"
  | "move-check"
  | "move-opponent"
  | "move-self"
  | "notification"
  | "notify"
  | "premove"
  | "promote"
  | "puzzle-correct-2"
  | "puzzle-correct"
  | "puzzle-wrong"
  | "scatter"
  | "shoutout"
  | "tenseconds";

interface AudioPlayerOptions {
  soundDir?: string;
  player?: string | null;
  players?: string[];
  enabled?: boolean;
  debug?: boolean;
}

const defaultPlayers = [
  "mplayer",
  "afplay",
  "mpg123",
  "mpg321",
  "play",
  "omxplayer",
  "aplay",
  "cmdmp3",
  "cvlc",
  "powershell",
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AudioPlayer {
  private readonly enabled: boolean;
  private readonly debug: boolean;
  private readonly player: string | null;
  private readonly soundDir: string;

  constructor(options: AudioPlayerOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.debug = options.debug ?? false;
    this.player = options.player ?? findExec(options.players ?? defaultPlayers);
    this.soundDir =
      options.soundDir ?? path.resolve(__dirname, "../sounds");
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log("[AudioPlayer]", ...args);
    }
  }

  private getSoundPath(name: SoundName): string {
    return path.resolve(this.soundDir, `${name}.mp3`);
  }

  private spawnPowerShellMp3(filePath: string): ChildProcess {
    const escaped = filePath.replace(/'/g, "''");

    const script = [
      "Add-Type -AssemblyName PresentationCore",
      "$player = New-Object System.Windows.Media.MediaPlayer",
      `$player.Open([Uri]'${escaped}')`,
      "$player.Volume = 1.0",
      "$player.Play()",
      "Start-Sleep -Milliseconds 1200",
    ].join("; ");

    this.log("powershell script:", script);

    return spawn("powershell", ["-NoProfile", "-Command", script], {
      stdio: "ignore",
      windowsHide: true,
    });
  }

  private spawnExternal(player: string, filePath: string): ChildProcess {
    return spawn(player, [filePath], {
      stdio: "ignore",
      windowsHide: true,
    });
  }

  public play(name: SoundName): ChildProcess | null {
    if (!this.enabled) {
      return null;
    }

    const filePath = this.getSoundPath(name);

    this.log("player:", this.player);
    this.log("file:", filePath);

    if (!this.player) {
      console.error("[AudioPlayer] Kein Audio-Player gefunden.");
      return null;
    }

    let process: ChildProcess;

    if (this.player === "powershell") {
      process = this.spawnPowerShellMp3(filePath);
    } else {
      process = this.spawnExternal(this.player, filePath);
    }

    process.on("error", (err) => {
      console.error(`[AudioPlayer] Fehler bei ${name}:`, err.message);
    });

    return process;
  }

  public move(): ChildProcess | null {
    return this.play("move-self");
  }

  public opponentMove(): ChildProcess | null {
    return this.play("move-opponent");
  }

  public capture(): ChildProcess | null {
    return this.play("capture");
  }

  public castle(): ChildProcess | null {
    return this.play("castle");
  }

  public check(): ChildProcess | null {
    return this.play("move-check");
  }

  public illegal(): ChildProcess | null {
    return this.play("illegal");
  }

  public promote(): ChildProcess | null {
    return this.play("promote");
  }

  public notify(): ChildProcess | null {
    return this.play("notification");
  }

  public gameStart(): ChildProcess | null {
    return this.play("game-start");
  }

  public gameEnd(): ChildProcess | null {
    return this.play("game-end");
  }

  public gameWin(): ChildProcess | null {
    return this.play("game-win");
  }

  public gameLose(): ChildProcess | null {
    return this.play("game-lose");
  }

  public gameDraw(): ChildProcess | null {
    return this.play("game-draw");
  }

  public test(): ChildProcess | null {
    return this.move();
  }
}

export default function createAudioPlayer(
  options: AudioPlayerOptions = {}
): AudioPlayer {
  return new AudioPlayer(options);
}
import { execSync } from "child_process";
import os from "os";

const platform = os.platform();

export default function findExec(commands: string[]): string | null {
  for (const command of commands) {
    if (isExec(findCommand(command))) {
      return command;
    }
  }

  return null;
}

function isExec(command: string): boolean {
  try {
    execSync(command, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function findCommand(command: string): string {
  if (platform.startsWith("win")) {
    return `where ${command}`;
  }
  return `command -v ${command}`;
}
import { existsSync } from "fs";
import { resolve } from "path";
import { spawn } from "child_process";

const repoRoot = resolve(process.cwd());
const workspaceRoot = resolve(repoRoot, "..");
const defaultVenvPython = resolve(
  workspaceRoot,
  ".venv",
  "Scripts",
  "python.exe",
);

function getPythonCommand(): string {
  if (process.env.THUNAI_PYTHON_PATH) {
    return process.env.THUNAI_PYTHON_PATH;
  }

  if (existsSync(defaultVenvPython)) {
    return defaultVenvPython;
  }

  return "python";
}

export function runPythonJson<TInput, TOutput>(
  relativeScriptPath: string,
  payload: TInput,
): Promise<TOutput> {
  const scriptPath = resolve(repoRoot, relativeScriptPath);
  const pythonCommand = getPythonCommand();

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(pythonCommand, [scriptPath], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
        THUNAI_WORKSPACE_ROOT: workspaceRoot,
        THUNAI_REPO_ROOT: repoRoot,
        THUNAI_WEBAPP_DIR: resolve(workspaceRoot, "webapp"),
      },
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      rejectPromise(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        rejectPromise(
          new Error(
            stderr.trim() || `Python bridge exited with status ${code ?? -1}.`,
          ),
        );
        return;
      }

      try {
        resolvePromise(JSON.parse(stdout.trim()) as TOutput);
      } catch (error) {
        rejectPromise(
          new Error(
            `Failed to parse Python response: ${
              error instanceof Error ? error.message : "unknown error"
            }`,
          ),
        );
      }
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

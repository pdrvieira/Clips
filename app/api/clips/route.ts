import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { del, head, put } from "@vercel/blob";
import { MAX_UPLOAD_MB, MAX_VIDEO_MINUTES, UPLOAD_PREFIX } from "@/app/limits";

export const maxDuration = 300;

const CLIP_SECONDS = 30;
const CLIP_COUNT = 3;

// Binário incluído no bundle da função via outputFileTracingIncludes (next.config.ts).
const FFMPEG = path.join(
  process.cwd(),
  "node_modules",
  "ffmpeg-static",
  process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg",
);

const run = promisify(execFile);

class UserError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// Duração em segundos lida da saída do `ffmpeg -i`; null se o arquivo não tiver vídeo.
async function probeDuration(file: string): Promise<number | null> {
  // Sem arquivo de saída o ffmpeg termina com erro, mas imprime as informações do arquivo no stderr.
  const { stderr = "" } = await run(FFMPEG, ["-hide_banner", "-i", file]).catch((err) => {
    if (err.code === "ENOENT") throw new Error(`FFmpeg não encontrado em ${FFMPEG}. Rode: node node_modules/ffmpeg-static/install.js`);
    return err;
  });
  const match = /Duration: (\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(stderr);
  if (!match || !/Stream #.*Video:/.test(stderr)) return null;
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

export async function POST(request: Request) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "clips-"));
  let uploadUrl: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.url !== "string") throw new UserError("Envie um vídeo primeiro.");

    // Só processa arquivos enviados ao nosso Blob store: head() falha para qualquer outra URL.
    const upload = await head(body.url).catch(() => null);
    if (!upload || !upload.pathname.startsWith(UPLOAD_PREFIX)) {
      throw new UserError("Vídeo não encontrado. Envie de novo.", 404);
    }
    uploadUrl = upload.url;
    if (upload.size > MAX_UPLOAD_MB * 1024 * 1024) {
      throw new UserError(`O vídeo deve ter no máximo ${MAX_UPLOAD_MB} MB.`);
    }

    // 1. Baixa o vídeo do Blob para o /tmp da função.
    const input = path.join(dir, "input.mp4");
    const res = await fetch(upload.url);
    if (!res.ok) throw new Error(`Blob respondeu ${res.status}`);
    await writeFile(input, Buffer.from(await res.arrayBuffer()));

    // 2. Confere se é um vídeo válido e dentro do limite de duração.
    const duration = await probeDuration(input);
    if (!duration) throw new UserError("Não foi possível ler o vídeo. Envie um arquivo .mp4 válido.");
    if (duration > MAX_VIDEO_MINUTES * 60) {
      throw new UserError(`O vídeo deve ter no máximo ${MAX_VIDEO_MINUTES} minutos.`);
    }

    // 3. Três cortes distribuídos: um no centro de cada terço do vídeo.
    const segment = duration / CLIP_COUNT;
    const clipLength = Math.min(CLIP_SECONDS, segment);
    const clips = await Promise.all(
      Array.from({ length: CLIP_COUNT }, async (_, i) => {
        const start = i * segment + (segment - clipLength) / 2;
        const out = path.join(dir, `clip-${i + 1}.mp4`);
        await run(
          FFMPEG,
          [
            "-hide_banner", "-loglevel", "error",
            "-ss", start.toFixed(2),
            "-i", input,
            "-t", clipLength.toFixed(2),
            // Lado menor em no máximo 720px, para o processamento caber no tempo da função.
            "-vf", "scale='if(gt(iw,ih),-2,min(720,iw))':'if(gt(iw,ih),min(720,ih),-2)'",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            "-y", out,
          ],
          { timeout: 120_000 },
        ).catch((err) => {
          console.error("ffmpeg falhou:", err.stderr || err);
          throw new UserError("Falha ao processar o vídeo.", 500);
        });

        // 4. Upload do corte para o Vercel Blob; a resposta leva só as URLs.
        const blob = await put(`clips/corte-${i + 1}.mp4`, await readFile(out), {
          access: "public",
          contentType: "video/mp4",
          addRandomSuffix: true,
        });
        return { url: blob.url, downloadUrl: blob.downloadUrl, start, end: start + clipLength };
      }),
    );

    return Response.json({ duration, clips });
  } catch (err) {
    if (err instanceof UserError) {
      return Response.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return Response.json({ error: "Erro inesperado. Tente novamente." }, { status: 500 });
  } finally {
    await rm(dir, { recursive: true, force: true });
    // O original não é mais necessário: ficam só os cortes.
    if (uploadUrl) await del(uploadUrl).catch((err) => console.error("del falhou:", err));
  }
}

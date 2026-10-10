"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { MAX_UPLOAD_MB, MAX_VIDEO_MINUTES, UPLOAD_PREFIX } from "@/app/limits";

type Clip = { url: string; downloadUrl: string; start: number; end: number };
type Phase = "idle" | "uploading" | "processing";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [clips, setClips] = useState<Clip[] | null>(null);
  const busy = phase !== "idle";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setClips(null);
    if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) {
      setError("Envie um arquivo .mp4.");
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`O vídeo deve ter no máximo ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    try {
      // O vídeo vai direto do navegador para o Vercel Blob.
      setProgress(0);
      setPhase("uploading");
      const blob = await upload(`${UPLOAD_PREFIX}${file.name.replace(/[^\w.-]+/g, "-")}`, file, {
        access: "public",
        contentType: "video/mp4",
        handleUploadUrl: "/api/upload",
        multipart: file.size > 50 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });

      setPhase("processing");
      const res = await fetch("/api/clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: blob.url }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Falha no servidor (${res.status}). Tente novamente.`);
      setClips(data.clips);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setPhase("idle");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-16 sm:py-24">
      <header className="mb-10 text-center">
        <p className="mb-4 inline-block rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
          Vídeo → 3 cortes de 30s
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Clip Maker</h1>
        <p className="mt-3 text-zinc-400">Envie um vídeo .mp4 e receba 3 cortes prontos para baixar.</p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label className="flex h-12 flex-1 cursor-pointer items-center gap-3 overflow-hidden rounded-xl border border-dashed border-zinc-700 bg-zinc-900 px-4 text-zinc-400 transition hover:border-zinc-500">
          <input
            type="file"
            accept="video/mp4"
            required
            disabled={busy}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
          {file ? (
            <span className="truncate text-zinc-100">
              {file.name} <span className="text-zinc-500">· {(file.size / 1024 / 1024).toFixed(1)} MB</span>
            </span>
          ) : (
            <span>Escolher vídeo .mp4</span>
          )}
        </label>
        <button
          type="submit"
          disabled={busy || !file}
          className="h-12 rounded-xl bg-white px-6 font-medium text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Gerando…" : "Gerar cortes"}
        </button>
      </form>
      <p className="mt-3 text-center text-xs text-zinc-500">
        Até {MAX_UPLOAD_MB} MB e {MAX_VIDEO_MINUTES} minutos. Envie apenas vídeos que você tem direito de usar.
      </p>

      {phase === "uploading" && (
        <div className="mx-auto mt-12 w-full max-w-sm text-center text-sm text-zinc-400">
          Enviando vídeo… {progress}%
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full bg-white transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {phase === "processing" && (
        <div className="mt-12 flex items-center justify-center gap-3 text-zinc-400">
          <span className="size-4 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
          Gerando cortes… pode levar até 1 minuto.
        </div>
      )}

      {error && (
        <div className="mt-10 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {clips && (
        <section className="mt-12 grid gap-5 sm:grid-cols-3">
          {clips.map((clip, i) => (
            <div key={clip.url} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
              <video src={clip.url} controls preload="metadata" playsInline className="aspect-video w-full bg-black" />
              <div className="flex items-center justify-between gap-2 p-3">
                <span className="text-sm text-zinc-400">
                  Corte {i + 1} · {formatTime(clip.start)}–{formatTime(clip.end)}
                </span>
                <a
                  href={clip.downloadUrl}
                  className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-black transition hover:bg-zinc-200"
                >
                  Baixar
                </a>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

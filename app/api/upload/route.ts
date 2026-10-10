import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { MAX_UPLOAD_MB, UPLOAD_PREFIX } from "@/app/limits";

// Gera o token para o navegador enviar o vídeo direto ao Vercel Blob
// (uma Vercel Function não aceita corpos maiores que 4,5 MB).
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(UPLOAD_PREFIX)) throw new Error("Caminho de upload inválido.");
        return {
          allowedContentTypes: ["video/mp4"],
          maximumSizeInBytes: MAX_UPLOAD_MB * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(json);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Falha no upload." }, { status: 400 });
  }
}

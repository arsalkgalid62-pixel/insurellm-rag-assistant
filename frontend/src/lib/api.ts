import type { DebugData, PipelineData, SourceChunk } from "../types";

const API = "/api";

export async function fetchHealth() {
  const r = await fetch(`${API}/health`);
  return r.json();
}

export async function fetchExamples() {
  const r = await fetch(`${API}/examples`);
  return r.json();
}

export async function fetchStats() {
  const r = await fetch(`${API}/stats`);
  return r.json();
}

export async function sendChat(
  message: string,
  history: { role: string; content: string }[],
  debug: boolean,
  model?: string
) {
  const r = await fetch(`${API}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, debug, model }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({ detail: r.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return r.json();
}

export function streamChat(
  message: string,
  history: { role: string; content: string }[],
  debug: boolean,
  model: string | undefined,
  onMeta: (data: {
    sources: SourceChunk[];
    pipeline: PipelineData;
    confidence: number;
    confidence_label: string;
    follow_ups: string[];
    debug?: DebugData;
  }) => void,
  onToken: (token: string) => void,
  onDone: () => void,
  onError: (err: Error) => void
) {
  fetch(`${API}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, debug, model }),
  })
    .then(async (r) => {
      if (!r.ok) throw new Error(await r.text());
      const reader = r.body?.getReader();
      if (!reader) throw new Error("No stream");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));
          if (data.type === "meta") {
            onMeta({
              sources: data.sources,
              pipeline: data.pipeline,
              confidence: data.confidence,
              confidence_label: data.confidence_label,
              follow_ups: data.follow_ups,
              debug: data.debug,
            });
          }
          else if (data.type === "token") onToken(data.content);
          else if (data.type === "done") onDone();
        }
      }
      onDone();
    })
    .catch(onError);
}

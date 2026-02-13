import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useRef, useState } from "react";

type EventEntry =
  | { type: "iteration_start"; iteration: number }
  | { type: "llm_query_start" }
  | { type: "llm_query_end" }
  | { type: "code_execution_start"; code: string }
  | { type: "code_execution_end"; output?: string }
  | { type: "final_answer"; answer: string }
  | {
      type: "result";
      answer: { message: string; data?: unknown };
      usage: {
        totalCalls: number;
        subCalls: number;
        tokenUsage: {
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
        };
        executionTimeMs: number;
      };
      iterations: number;
    }
  | { type: "error"; message: string };

type Status = "idle" | "analyzing" | "done" | "error";

export default function RllmDemo() {
  const [context, setContext] = useState("");
  const [question, setQuestion] = useState("");
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const logEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAnalyze = async () => {
    if (!context.trim() || !question.trim()) return;

    setEvents([]);
    setStatus("analyzing");

    try {
      const res = await fetch("/rllm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, question }),
      });

      if (!res.ok || !res.body) {
        setStatus("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;

          try {
            const event = JSON.parse(payload) as EventEntry;
            setEvents((prev) => [...prev, event]);
            if (event.type === "result") setStatus("done");
            if (event.type === "error") setStatus("error");
            setTimeout(scrollToBottom, 50);
          } catch {
            // skip malformed events
          }
        }
      }

      setStatus((s) => (s === "analyzing" ? "done" : s));
    } catch {
      setStatus("error");
    }
  };

  const resultEvent = events.find((e) => e.type === "result") as
    | Extract<EventEntry, { type: "result" }>
    | undefined;

  return (
    <div className="flex h-full gap-4 p-6">
      {/* Input Panel */}
      <div className="flex w-1/3 flex-col gap-4">
        <h2 className="text-lg font-semibold">RLLM Demo</h2>
        <p className="text-sm text-muted-foreground">
          Paste a large document and ask a question. Watch the LLM recursively
          analyze it by writing and executing code.
        </p>
        <Button
          variant="default"
          disabled={status === "analyzing"}
          onClick={async () => {
            const res = await fetch("/rllm/example");
            if (!res.ok) return;
            const data = await res.json();
            setContext(data.context);
            setQuestion(data.question);
          }}
        >
          Load example
        </Button>
        <textarea
          className="flex-1 resize-none rounded-md border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Paste your document here..."
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
        <Input
          placeholder="What do you want to know?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && status !== "analyzing") handleAnalyze();
          }}
        />
        <Button
          onClick={handleAnalyze}
          disabled={status === "analyzing" || !context.trim() || !question.trim()}
        >
          {status === "analyzing" ? (
            <>
              <Spinner className="size-4" />
              Analyzing...
            </>
          ) : (
            "Analyze"
          )}
        </Button>
        {context && (
          <p className="text-xs text-muted-foreground">
            {context.length.toLocaleString()} chars &middot; ~{Math.ceil(context.length / 4).toLocaleString()} tokens (est.)
          </p>
        )}
      </div>

      {/* Execution Panel */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-md border p-4">
        {events.length === 0 && status === "idle" && (
          <p className="text-sm text-muted-foreground">
            Execution log will appear here...
          </p>
        )}

        {events.map((event, i) => (
          <EventBlock key={i} event={event} />
        ))}

        <div ref={logEndRef} />

        {resultEvent && (
          <div className="mt-2 flex flex-wrap gap-4 rounded-md border border-primary/20 bg-muted p-3 text-xs">
            <span><strong>{resultEvent.iterations}</strong> iterations</span>
            <span><strong>{resultEvent.usage.subCalls}</strong> sub-LLM calls</span>
            <span><strong>{resultEvent.usage.tokenUsage.promptTokens.toLocaleString()}</strong> input tokens</span>
            <span><strong>{resultEvent.usage.tokenUsage.completionTokens.toLocaleString()}</strong> output tokens</span>
            <span><strong>{resultEvent.usage.tokenUsage.totalTokens.toLocaleString()}</strong> total tokens</span>
            <span><strong>{(resultEvent.usage.executionTimeMs / 1000).toFixed(1)}s</strong> elapsed</span>
          </div>
        )}
      </div>
    </div>
  );
}

function EventBlock({ event }: { event: EventEntry }) {
  switch (event.type) {
    case "iteration_start":
      return (
        <div className="flex items-center gap-2 text-sm font-medium">
          <div className="size-2 rounded-full bg-primary" />
          Iteration {event.iteration}
        </div>
      );

    case "llm_query_start":
      return (
        <div className="flex items-center gap-2 pl-4 text-sm text-muted-foreground">
          <Spinner className="size-3" />
          LLM thinking...
        </div>
      );

    case "llm_query_end":
      return null;

    case "code_execution_start":
      return (
        <div className="pl-4">
          <p className="mb-1 text-xs text-muted-foreground">
            Generated code:
          </p>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
            <code>{event.code}</code>
          </pre>
        </div>
      );

    case "code_execution_end":
      return event.output ? (
        <div className="pl-4">
          <p className="mb-1 text-xs text-muted-foreground">Output:</p>
          <pre className="overflow-x-auto rounded-md bg-muted p-2 text-xs">
            {event.output}
          </pre>
        </div>
      ) : (
        <div className="flex items-center gap-1 pl-4 text-xs text-green-500">
          Code executed
        </div>
      );

    case "final_answer":
      return (
        <Card className="mt-2 border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Answer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{event.answer}</p>
          </CardContent>
        </Card>
      );

    case "result":
      return (
        <Card className="mt-2 border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Answer</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {event.answer.message}
            </p>
          </CardContent>
        </Card>
      );

    case "error":
      return (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Error: {event.message}
        </div>
      );

    default:
      return null;
  }
}

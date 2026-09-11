'use client';

import { useState } from 'react';
import { AgentspaceConfig } from './ConfigSidebar';
import { API_BASE_URL } from '@/lib/api';
import { Badge, RawJsonView, EmptyState, ConfigWarning, MarkdownText } from '@/components/ui';

interface DeepResearchViewProps {
  config: AgentspaceConfig;
  agentName: string;
}

type FlowState = 'idle' | 'planning' | 'planned' | 'running' | 'done' | 'error';

interface DocumentMetadata {
  uri?: string;
  title?: string;
  domain?: string;
}

interface GroundingReference {
  documentMetadata?: DocumentMetadata;
}

interface GroundingSegment {
  startIndex?: string;
  endIndex?: string;
  referenceIndices?: number[];
  text?: string;
}

interface TextGroundingMetadata {
  references?: GroundingReference[];
  segments?: GroundingSegment[];
}

interface ContentFile {
  mimeType?: string;
  fileId?: string;
}

interface ReplyContent {
  role?: string;
  text?: string;
  file?: ContentFile;
}

interface ContentMetadata {
  contentKind?: string;
  textGroundingMetadata?: TextGroundingMetadata;
}

interface GroundedContent {
  content?: ReplyContent;
  contentMetadata?: ContentMetadata;
}

interface AssistReply {
  groundedContent?: GroundedContent;
}

interface AssistAnswer {
  state?: string;
  name?: string;
  replies?: AssistReply[];
}

interface RunChunk {
  answer?: AssistAnswer;
  sessionInfo?: { session?: string };
}

interface PlanResponse {
  request_params?: unknown;
  request_url?: unknown;
  request_payload?: unknown;
  response?: { plan_text?: string; chunks?: unknown };
  session_info?: { session_id?: string };
  error?: { message?: string };
  success?: boolean;
}

/** Builds a GFM markdown string from grounded content, converting citation
 * references into footnote syntax ([^n] + a [^n]: [label](url) definition list)
 * so MarkdownText can render both the prose and its citations natively. */
function buildMarkdownWithFootnotes(groundedContent?: GroundedContent): string {
  const text = groundedContent?.content?.text;
  if (!text) return '';

  const grounding = groundedContent?.contentMetadata?.textGroundingMetadata;
  const segments = grounding?.segments;
  const references = grounding?.references;
  if (!segments || segments.length === 0 || !references) return text;

  const refNumberByIndex = new Map<number, number>();
  let nextRefNumber = 1;
  let body = '';

  for (const segment of segments) {
    body += segment.text ?? '';
    const uniqueRefIndices = Array.from(new Set(segment.referenceIndices ?? []));
    for (const refIdx of uniqueRefIndices) {
      const docMeta = references[refIdx]?.documentMetadata;
      if (!docMeta?.uri) continue;
      let num = refNumberByIndex.get(refIdx);
      if (num === undefined) {
        num = nextRefNumber++;
        refNumberByIndex.set(refIdx, num);
      }
      body += `[^${num}]`;
    }
  }

  if (refNumberByIndex.size === 0) return body;

  const footnotes = Array.from(refNumberByIndex.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([refIdx, num]) => {
      const docMeta = references[refIdx]?.documentMetadata;
      const label = docMeta?.domain || docMeta?.title || `source ${num}`;
      return `[^${num}]: [${label}](${docMeta?.uri})`;
    })
    .join('\n');

  return `${body}\n\n${footnotes}`;
}

/** Renders a single reply's text as markdown, converting textGroundingMetadata
 * citations into GFM footnotes when present, falling back to plain markdown
 * otherwise. Defensive throughout: the upstream shape is not part of any
 * published schema we control. */
function GroundedText({ groundedContent }: { groundedContent?: GroundedContent }) {
  const markdown = buildMarkdownWithFootnotes(groundedContent);
  if (!markdown) return null;
  return <MarkdownText text={markdown} />;
}

/** Renders one reply according to its contentKind. Every known kind gets a visually
 * distinct treatment; unrecognized kinds fall back to plain grounded text so nothing
 * silently disappears. */
function ReplyView({ reply, index }: { reply: AssistReply; index: number }) {
  const groundedContent = reply.groundedContent;
  const kind = groundedContent?.contentMetadata?.contentKind;

  if (kind === 'RESEARCH_QUESTION') {
    return (
      <div key={index} className="mt-4">
        <h3 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
          <Badge variant="purple">Question</Badge>
          {groundedContent?.content?.text}
        </h3>
      </div>
    );
  }

  if (kind === 'RESEARCH_ANSWER') {
    return (
      <div key={index} className="mt-2 pl-4 border-l-2 border-gray-200 text-sm text-gray-800">
        <GroundedText groundedContent={groundedContent} />
      </div>
    );
  }

  if (kind === 'RESEARCH_REPORT') {
    return (
      <div key={index} className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Badge variant="blue">Final Report</Badge>
        </h3>
        <div className="text-sm text-gray-900">
          <GroundedText groundedContent={groundedContent} />
        </div>
      </div>
    );
  }

  if (kind === 'RESEARCH_AUDIO_SUMMARY') {
    const file = groundedContent?.content?.file;
    return (
      <div key={index} className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <Badge variant="amber" className="mr-2">
          Audio Summary
        </Badge>
        Audio summary generated (fileId: {file?.fileId ?? 'not provided'}, mimeType:{' '}
        {file?.mimeType ?? 'not provided'}). Playback isn&apos;t available: the Discovery Engine API doesn&apos;t
        currently expose a download endpoint for session audio files.
      </div>
    );
  }

  // Unknown/unmapped kind: still surface it so nothing silently vanishes.
  const text = groundedContent?.content?.text;
  if (!text) return null;
  return (
    <div key={index} className="mt-2 text-sm text-gray-600">
      <Badge variant="gray" className="mr-2">
        {kind || 'unknown'}
      </Badge>
      <span className="whitespace-pre-wrap">{text}</span>
    </div>
  );
}

export default function DeepResearchView({ config, agentName }: DeepResearchViewProps) {
  const [state, setState] = useState<FlowState>('idle');
  const [query, setQuery] = useState('');
  const [planText, setPlanText] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [runChunks, setRunChunks] = useState<RunChunk[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [planRaw, setPlanRaw] = useState<{ request: unknown; response: unknown } | undefined>(undefined);

  const { projectNumber, location, engineId, assistantId, useAdcQuota } = config;
  const isConfigured = Boolean(projectNumber && engineId);

  const handleReset = () => {
    setState('idle');
    setQuery('');
    setPlanText('');
    setSessionId('');
    setRunChunks([]);
    setErrorMessage('');
    setPlanRaw(undefined);
  };

  // A run failure keeps the plan and session_id valid - only the run call itself
  // failed. Dismissing the error should let the user retry the run (or resubmit
  // the plan form, if the plan step itself was what failed) without discarding
  // work already done. Full reset stays available via the "New Research
  // Question" header link.
  const handleDismissError = () => {
    setErrorMessage('');
    setState(sessionId ? 'planned' : 'idle');
  };

  const handleGetPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !isConfigured || state === 'planning') return;

    setState('planning');
    setErrorMessage('');

    const payload = {
      query: query.trim(),
      project_number: projectNumber,
      location,
      engine_id: engineId,
      assistant_id: assistantId,
      agent_name: agentName,
      use_adc_quota: useAdcQuota,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api-explorer/deep-research/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        const bodyText = await response.text().catch(() => '');
        setPlanRaw({
          request: { url: `${API_BASE_URL}/api-explorer/deep-research/plan`, payload },
          response: bodyText,
        });
        setErrorMessage(`Plan request failed with status ${response.status}: ${bodyText.slice(0, 300) || response.statusText}`);
        setState('error');
        return;
      }

      // The plan endpoint streams SSE (periodic ": keep-alive" comments,
      // then one "data:" event with the result) rather than a single JSON
      // body - the upstream call routinely takes 30-90s, long enough that a
      // silent connection gets torn down by this environment's ~30s idle
      // network timeout before a plain response could ever arrive.
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let data: PlanResponse | undefined;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          const dataLine = event.split('\n').find((line) => line.startsWith('data:'));
          if (!dataLine) continue; // keep-alive comment line - ignore
          const jsonText = dataLine.slice('data:'.length).trim();
          if (!jsonText) continue;
          try {
            data = JSON.parse(jsonText);
          } catch {
            // Malformed event - keep waiting, the final well-formed one wins.
          }
        }
      }

      setPlanRaw({
        request: { url: `${API_BASE_URL}/api-explorer/deep-research/plan`, payload },
        response: data,
      });

      if (!data) {
        setErrorMessage('Plan request completed without a readable result.');
        setState('error');
        return;
      }

      if (data.success && data.response?.plan_text && data.session_info?.session_id) {
        setPlanText(data.response.plan_text);
        setSessionId(data.session_info.session_id);
        setState('planned');
      } else {
        setErrorMessage(data.error?.message || 'Failed to generate a research plan.');
        setState('error');
      }
    } catch (error) {
      setPlanRaw({
        request: { url: `${API_BASE_URL}/api-explorer/deep-research/plan`, payload },
        response: undefined,
      });
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error while requesting the plan.');
      setState('error');
    }
  };

  const handleStartResearch = async () => {
    if (!sessionId || !isConfigured) return;

    setState('running');
    setErrorMessage('');
    setRunChunks([]);

    const payload = {
      session_id: sessionId,
      project_number: projectNumber,
      location,
      engine_id: engineId,
      assistant_id: assistantId,
      agent_name: agentName,
      use_adc_quota: useAdcQuota,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api-explorer/deep-research/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !response.body) {
        setErrorMessage(`Run request failed with status ${response.status}`);
        setState('error');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let finished = false;

      while (!finished) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const event of events) {
          const dataLine = event
            .split('\n')
            .find((line) => line.startsWith('data:'));
          if (!dataLine) continue;
          const jsonText = dataLine.slice('data:'.length).trim();
          if (!jsonText) continue;

          let parsed: unknown;
          try {
            parsed = JSON.parse(jsonText);
          } catch {
            continue;
          }

          const record = parsed as { type?: string; error?: string } & RunChunk;

          if (record.type === 'done') {
            finished = true;
            setState((prev) => (prev === 'error' ? prev : 'done'));
            break;
          }
          if (record.type === 'error') {
            setErrorMessage(record.error || 'Research run failed.');
            setState('error');
            finished = true;
            break;
          }

          setRunChunks((prev) => [...prev, record]);
          if (record.answer?.state === 'SUCCEEDED') {
            finished = true;
            setState('done');
            break;
          }
        }
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error while running research.');
      setState('error');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="border-b border-gray-200 p-6 bg-white">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Deep Research
            <Badge variant="purple">{agentName}</Badge>
          </h1>
          {state !== 'idle' && (
            <button onClick={handleReset} className="text-sm text-gray-600 hover:text-gray-900">
              New Research Question
            </button>
          )}
        </div>
        <p className="text-gray-600">
          Two-phase research flow: request a plan, confirm it, then let the agent research and report back.
        </p>

        {!isConfigured && <ConfigWarning feature="Deep Research" />}
      </div>

      <div className="flex-1 p-6 space-y-6">
        {(state === 'idle' || state === 'planning') && (
          <form onSubmit={handleGetPlan} className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Research question</label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={state === 'planning'}
              placeholder="What would you like the agent to research?"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={!query.trim() || !isConfigured || state === 'planning'}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {state === 'planning' ? 'Generating plan...' : 'Get Plan'}
            </button>
          </form>
        )}

        {state === 'error' && (
          <div className="p-4 bg-red-100 border border-red-300 rounded-lg text-red-800">
            <p className="font-semibold">✗ Something went wrong</p>
            <p className="text-sm mt-1">{errorMessage || 'Unknown error.'}</p>
            <button
              onClick={handleDismissError}
              className="mt-3 px-4 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              {sessionId ? 'Retry Research' : 'Try Again'}
            </button>
          </div>
        )}

        {(state === 'planned' || (state === 'error' && planText)) && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Research Plan</h3>
            <MarkdownText text={planText} className="text-sm text-gray-800" />
            {state === 'planned' && (
              <button
                onClick={handleStartResearch}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Start Research
              </button>
            )}
          </div>
        )}

        {planRaw && <RawJsonView data={planRaw.request} label="View raw plan request" />}
        {planRaw && <RawJsonView data={planRaw.response} label="View raw plan response" />}

        {(state === 'running' || state === 'done') && (
          <div className="space-y-2">
            {state === 'running' && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                Running... this can take several minutes. Results stream in as they arrive.
              </div>
            )}
            {state === 'done' && (
              <div className="p-3 bg-green-100 border border-green-300 rounded-lg text-sm text-green-800">
                ✓ Research complete
              </div>
            )}

            {runChunks.length === 0 ? (
              <EmptyState title="Waiting for the first result..." />
            ) : (
              (() => {
                const flatReplies = runChunks.flatMap((chunk, chunkIdx) =>
                  (chunk.answer?.replies ?? []).map((reply, replyIdx) => ({
                    reply,
                    key: `${chunkIdx}-${replyIdx}`,
                    replyIdx,
                  })),
                );
                const reportReplies = flatReplies.filter(
                  (r) => r.reply.groundedContent?.contentMetadata?.contentKind === 'RESEARCH_REPORT',
                );
                const traceReplies = flatReplies.filter(
                  (r) => r.reply.groundedContent?.contentMetadata?.contentKind !== 'RESEARCH_REPORT',
                );
                return (
                  <>
                    {reportReplies.length > 0 && (
                      <div className="p-4 bg-white border border-gray-200 rounded-lg">
                        {reportReplies.map(({ reply, key, replyIdx }) => (
                          <ReplyView key={key} reply={reply} index={replyIdx} />
                        ))}
                      </div>
                    )}
                    <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <summary className="cursor-pointer font-semibold text-sm text-gray-700 hover:text-gray-900">
                        Research trace ({traceReplies.length} item{traceReplies.length === 1 ? '' : 's'})
                      </summary>
                      <div className="mt-4 p-4 bg-white rounded border border-gray-200">
                        {traceReplies.map(({ reply, key, replyIdx }) => (
                          <ReplyView key={key} reply={reply} index={replyIdx} />
                        ))}
                      </div>
                    </details>
                  </>
                );
              })()
            )}

            <RawJsonView data={runChunks} label="View raw run chunks" />
          </div>
        )}
      </div>
    </div>
  );
}

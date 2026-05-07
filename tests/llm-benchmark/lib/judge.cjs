/**
 * LLM-as-Judge evaluator for natural_language assertions.
 *
 * Configuration (via environment variables):
 *   LLM_JUDGE_MODEL    — model to use (falls back to LLM_MODEL, then "gpt-4o-mini")
 *   LLM_JUDGE_API_KEY  — API key (falls back to LLM_API_KEY)
 *   LLM_JUDGE_BASE_URL — base URL (falls back to LLM_BASE_URL, then "https://api.openai.com")
 *
 * Fixed parameters: temperature=0, max_tokens=500, timeout=30s
 */

const https = require("node:https");
const http = require("node:http");

const JUDGE_TEMPERATURE = 0;
const JUDGE_MAX_TOKENS = 500;
const JUDGE_TIMEOUT_MS = 30_000;

/**
 * Build a compact summary of the agent output for the judge prompt.
 * @param {object} state - AgentState returned by runFull
 * @returns {string}
 */
function summarizeAgentOutput(state) {
  const parts = [];

  if (state.structuralTypeKey) {
    parts.push(`Structural type: ${state.structuralTypeKey}`);
  }

  if (state.model) {
    const nodes = Array.isArray(state.model.nodes) ? state.model.nodes.length : 0;
    const elements = Array.isArray(state.model.elements) ? state.model.elements.length : 0;
    parts.push(`Model: ${nodes} nodes, ${elements} elements`);
  }

  if (state.analysisResult) {
    const keys = Object.keys(state.analysisResult).filter((k) => k !== "_raw").join(", ");
    parts.push(`Analysis result keys: ${keys || "(present)"}`);
    const displacements =
      state.analysisResult.displacements || state.analysisResult.nodeDisplacements;
    if (Array.isArray(displacements) && displacements.length > 0) {
      parts.push(`Sample displacement: ${JSON.stringify(displacements[0])}`);
    }
    const reactions = state.analysisResult.reactions || state.analysisResult.nodeReactions;
    if (Array.isArray(reactions) && reactions.length > 0) {
      parts.push(`Sample reaction: ${JSON.stringify(reactions[0])}`);
    }
  }

  if (state.report?.markdown) {
    parts.push(`Report excerpt: ${state.report.markdown.slice(0, 500)}`);
  }

  return parts.length > 0 ? parts.join("\n") : "(no agent output)";
}

/**
 * Build the judge prompt.
 * @param {string} description - natural language criterion
 * @param {string} agentOutput - compact summary of agent state
 * @returns {string}
 */
function buildJudgePrompt(description, agentOutput) {
  return [
    "You are a structural engineering test evaluator.",
    "Based on the agent output below, judge whether the following criterion is satisfied.",
    "",
    `Criterion: ${description}`,
    "",
    "Agent output:",
    agentOutput,
    "",
    'Respond ONLY with a JSON object on a single line: {"pass": true} or {"pass": false, "reason": "brief explanation"}',
    "Do not include any other text.",
  ].join("\n");
}

/**
 * Call the LLM judge API.
 * @param {string} prompt
 * @returns {Promise<string>} raw response text
 */
function callLlmJudgeApi(prompt) {
  const apiKey = process.env.LLM_JUDGE_API_KEY || process.env.LLM_API_KEY || "";
  const model = process.env.LLM_JUDGE_MODEL || process.env.LLM_MODEL || "gpt-4o-mini";
  const rawBase =
    process.env.LLM_JUDGE_BASE_URL || process.env.LLM_BASE_URL || "https://api.openai.com";
  const base = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;

  const bodyStr = JSON.stringify({
    model,
    temperature: JUDGE_TEMPERATURE,
    max_tokens: JUDGE_MAX_TOKENS,
    messages: [{ role: "user", content: prompt }],
  });

  const url = new URL(`${base}/v1/chat/completions`);
  const isHttps = url.protocol === "https:";
  const lib = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "Content-Length": Buffer.byteLength(bodyStr),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(
              new Error(`Judge API returned HTTP ${res.statusCode}: ${data.slice(0, 200)}`),
            );
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.message?.content ?? "";
            resolve(content.trim());
          } catch {
            reject(new Error(`Failed to parse judge response: ${data.slice(0, 200)}`));
          }
        });
      },
    );

    req.setTimeout(JUDGE_TIMEOUT_MS, () => {
      req.destroy(new Error("LLM judge request timed out after 30s"));
    });
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

/**
 * Evaluate a natural_language assertion against the agent state using LLM-as-Judge.
 *
 * @param {string} description - the natural language criterion to evaluate
 * @param {object} state - AgentState returned by runFull
 * @returns {Promise<{ pass: boolean, reason?: string }>}
 */
async function evaluateNaturalLanguage(description, state) {
  const agentOutput = summarizeAgentOutput(state);
  const prompt = buildJudgePrompt(description, agentOutput);

  try {
    const response = await callLlmJudgeApi(prompt);
    // Extract JSON — response may be wrapped in markdown code fences
    const jsonMatch = response.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return { pass: false, reason: `Judge returned non-JSON: ${response.slice(0, 100)}` };
    }
    const result = JSON.parse(jsonMatch[0]);
    return {
      pass: result.pass === true,
      reason: typeof result.reason === "string" ? result.reason : undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { pass: false, reason: `Judge error: ${msg}` };
  }
}

module.exports = { evaluateNaturalLanguage };

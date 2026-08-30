// Prompt-injection / jailbreak screening for the AI assistant, using Meta's
// Llama Prompt Guard 2 (86M) served by Groq. Runs the customer's message
// through the classifier before it ever reaches Claude.
//
// Env vars:
//   GROQ_API_KEY              (required to enable the guard; absent = guard off)
//   GROQ_PROMPT_GUARD_MODEL   (optional, default meta-llama/llama-prompt-guard-2-86m)
//   GROQ_GUARD_THRESHOLD      (optional, default 0.5 — attack probability cutoff)
//
// Fails open: if the guard is not configured or Groq is unreachable, it returns
// attack:false so the assistant keeps working. Set GROQ_GUARD_FAIL_CLOSED=true
// to block instead when the guard errors.

export async function isPromptAttack(text) {
  const key = process.env.GROQ_API_KEY;
  if (!key || !text) return { configured: !!key, attack: false };

  const model = process.env.GROQ_PROMPT_GUARD_MODEL || "meta-llama/llama-prompt-guard-2-86m";
  const threshold = Number(process.env.GROQ_GUARD_THRESHOLD) || 0.5;
  const failClosed = process.env.GROQ_GUARD_FAIL_CLOSED === "true";

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      // Prompt Guard has a 512-token window; keep the input well under it.
      body: JSON.stringify({ model, messages: [{ role: "user", content: String(text).slice(0, 2000) }] }),
    });
    if (!res.ok) return { configured: true, attack: failClosed };
    const data = await res.json();
    const out = String(data?.choices?.[0]?.message?.content ?? "").trim();
    // Prompt Guard 2 returns an attack probability (0..1). Fall back to label
    // keywords if a non-numeric string comes back.
    const num = parseFloat(out);
    const attack = Number.isNaN(num)
      ? /jailbreak|inject|malicious|unsafe|\btrue\b|\b1\b/i.test(out)
      : num >= threshold;
    return { configured: true, attack };
  } catch {
    return { configured: true, attack: failClosed };
  }
}

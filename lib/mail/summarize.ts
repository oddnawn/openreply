/**
 * Turns an email body into the one or two sentences that carry the ask.
 *
 * Extractive, not generative. A model call per message would cost money on
 * every inbox refresh and add seconds to a page opened all day — and most of
 * what makes an email hard to skim is boilerplate, not complexity. Strip the
 * greeting, the quoted thread, the signature and the legal footer, and what
 * remains is usually already the point.
 *
 * If this proves too blunt, the upgrade is a model pass over `cleanBody` only —
 * the cleaning is the part worth keeping either way.
 */

// Everything from a quote marker onward belongs to a previous message.
const QUOTE_MARKERS = [
  /^\s*On .{0,120}\bwrote:\s*$/im,
  /^\s*-{2,}\s*Original Message\s*-{2,}/im,
  /^\s*_{5,}\s*$/m,
  /^\s*From:\s.+$/im,
  /^\s*>{1,}/m,
];

// Signature and footer starts. Cutting at the first of these loses nothing.
const SIGNATURE_MARKERS = [
  /^\s*--\s*$/m,
  /^\s*(best|thanks|thank you|regards|cheers|sincerely|warmly|all the best)[,!.]?\s*$/im,
  /^\s*sent from my \w+/im,
  /^\s*unsubscribe\b/im,
  /^\s*you (are )?receiv(ed|ing) this (email|message)/im,
  /^\s*this (e-?mail|message) (and any attachments )?is (confidential|intended)/im,
];

const GREETING =
  /^\s*(hi|hey|hello|dear|good (morning|afternoon|evening))\b[^.!?\n]{0,40}[,!.]?\s*/i;

const PLEASANTRIES = [
  /\b(i )?hope (you'?re|you are|this (email|message) finds you) (doing )?(well|great|fine)\b[^.!?]*[.!?]/gi,
  /\bhope (you'?re having|your) [^.!?]*[.!?]/gi,
  /\bmy name is [^.!?]*[.!?]/gi,
  /\bi hope this (email|note) finds you[^.!?]*[.!?]/gi,
];

function firstIndexOf(text: string, patterns: RegExp[]): number {
  let cut = -1;
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.index != null && (cut === -1 || m.index < cut)) cut = m.index;
  }
  return cut;
}

/** Body with quoted history, signature, greeting and pleasantries removed. */
export function cleanBody(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n");

  const quoteCut = firstIndexOf(text, QUOTE_MARKERS);
  if (quoteCut > 0) text = text.slice(0, quoteCut);

  const sigCut = firstIndexOf(text, SIGNATURE_MARKERS);
  if (sigCut > 0) text = text.slice(0, sigCut);

  text = text.replace(GREETING, "");
  for (const re of PLEASANTRIES) text = text.replace(re, "");

  // Collapse the whitespace that HTML-to-text conversion leaves behind.
  return text.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
}

/**
 * One or two sentences, at most `maxChars`.
 *
 * Prefers sentences that contain an ask — a question, a number, or money —
 * because that is what you need to decide whether to open the thing.
 */
export function summarize(raw: string, maxChars = 220): string {
  const body = cleanBody(raw);
  if (!body) return "";

  const sentences = body
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12 && /[a-z]/i.test(s));

  if (!sentences.length) return body.slice(0, maxChars);

  const score = (s: string) => {
    let n = 0;
    if (/\?/.test(s)) n += 3;
    if (/[$£€]\s?\d|\b\d+[k]\b|\b\d{3,}\b/i.test(s)) n += 3;
    if (/\b(would|could|can|want|looking for|interested in|reaching out|propose|offer)\b/i.test(s)) n += 2;
    if (/\b(deadline|by (monday|tuesday|wednesday|thursday|friday|next week)|asap|urgent)\b/i.test(s)) n += 2;
    // Long sentences are usually context, not the ask.
    if (s.length > 200) n -= 1;
    return n;
  };

  // Always keep the opening sentence — it carries the topic — then add the
  // highest-scoring other sentence if there is room.
  const first = sentences[0];
  const rest = sentences.slice(1).sort((a, b) => score(b) - score(a));
  const best = rest.find((s) => score(s) > 0);

  let out = first;
  if (best && out.length + best.length + 1 <= maxChars) out = `${out} ${best}`;

  return out.length > maxChars ? `${out.slice(0, maxChars - 1).trimEnd()}…` : out;
}

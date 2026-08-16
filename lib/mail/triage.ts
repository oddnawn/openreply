/**
 * Classifier for inbound mail.
 *
 * Deliberately deterministic rules rather than a model call. Two reasons: a
 * model on every inbox refresh costs money per read and adds latency to a page
 * you open all day, and a wrong confident label is worse than an honest shrug —
 * rules can be read, argued with, and corrected. Anything that does not score
 * clearly lands in "unsorted" on purpose.
 *
 * Categories are shared with the Instagram DM triage so a sponsorship email and
 * a sponsorship DM end up in the same bucket. `billing`, `community` and
 * `assets` are email-shaped and will rarely fire on a DM; that is fine.
 */

export type Category =
  | "sponsorship"
  | "opportunity"
  | "community"
  | "question"
  | "app"
  | "assets"
  | "billing"
  | "noise"
  | "unsorted";

export const CATEGORIES: Record<
  Category,
  { label: string; blurb: string; accent: string; priority: number }
> = {
  sponsorship: {
    label: "Sponsorship",
    blurb: "Brand deals, paid promo, affiliate offers",
    accent: "#0f9d6e",
    priority: 1,
  },
  opportunity: {
    label: "Opportunity",
    blurb: "Client work, collabs, podcasts, speaking",
    accent: "#0a60f7",
    priority: 2,
  },
  community: {
    label: "Community",
    blurb: "Skool members, joins, cancellations, member questions",
    accent: "#7c5cff",
    priority: 3,
  },
  question: {
    label: "Question",
    blurb: "Real people asking how you did something",
    accent: "#dc5b05",
    priority: 4,
  },
  app: {
    label: "App / OpenReply",
    blurb: "Support, bugs, and feature asks for your tool",
    accent: "#bb9af7",
    priority: 5,
  },
  assets: {
    label: "Assets",
    blurb: "Files, footage, licences, fonts, music clearances",
    accent: "#e0af68",
    priority: 6,
  },
  billing: {
    label: "Billing",
    blurb: "Receipts, invoices, renewals, failed payments",
    accent: "#93a1c0",
    priority: 7,
  },
  unsorted: {
    label: "Needs a look",
    blurb: "Didn't match cleanly — read it yourself",
    accent: "#8b96a5",
    priority: 8,
  },
  noise: {
    label: "Noise",
    blurb: "Newsletters, notifications, automated mail",
    accent: "#565f89",
    priority: 9,
  },
};

interface Rule {
  cat: Category;
  w: number;
  re: RegExp;
}

const RULES: Rule[] = [
  // --- sponsorship ---
  { cat: "sponsorship", w: 5, re: /\b(sponsor(ship|ed|ing)?|brand (deal|partnership)|paid (promo|collaboration|partnership))\b/i },
  { cat: "sponsorship", w: 4, re: /\bwe'?d love to (work with|partner with|sponsor)\b/i },
  { cat: "sponsorship", w: 3, re: /\b(budget|flat fee|cpm|rate card|deliverables|usage rights|media kit)\b/i },
  { cat: "sponsorship", w: 3, re: /\b(affiliate|commission|revenue share|rev ?share)\b/i },
  { cat: "sponsorship", w: 2, re: /\b(ugc|integration|dedicated video|shout ?out)\b/i },

  // --- opportunity ---
  { cat: "opportunity", w: 4, re: /\b(podcast|interview|guest|speaking|panel|webinar)\b/i },
  { cat: "opportunity", w: 4, re: /\b(hire|hiring|freelance|contract|retainer|consulting)\b/i },
  { cat: "opportunity", w: 3, re: /\b(collab(oration)?|work together|team up)\b/i },
  { cat: "opportunity", w: 3, re: /\b(edit my|manage (my|our) (content|channel))\b/i },

  // --- community (Skool and friends) ---
  { cat: "community", w: 5, re: /\bskool\b/i },
  { cat: "community", w: 4, re: /\b(new member|member joined|joined your (group|community)|cancelled their membership|membership (renewed|cancelled))\b/i },
  { cat: "community", w: 3, re: /\b(community|group) (post|comment|question|member)\b/i },
  { cat: "community", w: 3, re: /\b(discord|circle\.so|patreon)\b/i },

  // --- question ---
  { cat: "question", w: 4, re: /\bhow (do|did|can|does) (you|i|it)\b/i },
  { cat: "question", w: 4, re: /\bwhat (tool|software|app|model) (do|did) you\b/i },
  { cat: "question", w: 3, re: /\b(tutorial|walk me through|step by step|teach me)\b/i },
  { cat: "question", w: 3, re: /\b(can you help|need help|stuck on|struggling with)\b/i },
  { cat: "question", w: 4, re: /\b(how|what|where|when|why|which|who|can|could|do|does|did|is|are|would|should)\b[^?]{0,120}\?/i },

  // --- app ---
  { cat: "app", w: 5, re: /\bopen ?reply\b/i },
  { cat: "app", w: 3, re: /\b(bug|broken|not working|crash|can'?t log ?in|failed to)\b/i },
  { cat: "app", w: 3, re: /\b(feature request|would be great if|any plans to (add|support))\b/i },

  // --- assets ---
  { cat: "assets", w: 4, re: /\b(licen[cs]e|licensing|clearance|copyright claim|royalty[- ]free)\b/i },
  { cat: "assets", w: 4, re: /\b(footage|b[- ]?roll|raw files|project files|stock (video|music|photo))\b/i },
  { cat: "assets", w: 3, re: /\b(font|lut|preset|template pack|sound ?pack)\b/i },
  { cat: "assets", w: 3, re: /\b(google drive|dropbox|wetransfer|frame\.io)\b.{0,40}\b(shared|sent|upload)/i },

  // --- billing ---
  { cat: "billing", w: 5, re: /\b(receipt|invoice|your order|payment (received|failed|method)|subscription (renew|cancel))\b/i },
  { cat: "billing", w: 4, re: /\b(billed|charged|refund|card (declined|expiring)|renews on)\b/i },
  { cat: "billing", w: 3, re: /\b(stripe|paypal|quickbooks)\b/i },

  // --- noise ---
  { cat: "noise", w: 5, re: /\b(unsubscribe|view (this )?(email )?in browser|manage preferences)\b/i },
  { cat: "noise", w: 4, re: /\b(newsletter|digest|weekly roundup|webinar reminder|product update)\b/i },
  { cat: "noise", w: 4, re: /\b(verify your email|password reset|security alert|sign-?in attempt|new device)\b/i },
  { cat: "noise", w: 3, re: /\b(follow(ed|s) you|liked your|mentioned you|new follower)\b/i },
];

const NOISE_SENDERS =
  /(no-?reply|do-?not-?reply|notifications?@|mailer@|bounce|postmaster|automated@|updates@|news@)/i;

// Below this the classifier admits it does not know.
const MIN_SCORE = 3;

export interface TriageResult {
  category: Category;
  confidence: number;
  signals: string[];
}

export function classify(msg: {
  subject?: string | null;
  snippet?: string | null;
  body?: string | null;
  from?: string | null;
}): TriageResult {
  const haystack = [msg.subject, msg.snippet, msg.body].filter(Boolean).join("\n");
  const scores = new Map<Category, number>();
  const signals: string[] = [];

  const add = (cat: Category, w: number) => scores.set(cat, (scores.get(cat) ?? 0) + w);

  // A sender that never reads replies is noise regardless of wording — but only
  // weakly, because plenty of real sponsorship mail comes from no-reply relays.
  if (msg.from && NOISE_SENDERS.test(msg.from)) {
    add("noise", 4);
    signals.push("automated sender");
  }

  for (const rule of RULES) {
    const hit = haystack.match(rule.re);
    if (hit) {
      add(rule.cat, rule.w);
      signals.push(hit[0].toLowerCase().trim().slice(0, 30));
    }
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  if (!ranked.length || ranked[0][1] < MIN_SCORE) {
    return { category: "unsorted", confidence: 0, signals: [...new Set(signals)].slice(0, 5) };
  }

  const [category, top] = ranked[0];
  const runnerUp = ranked[1]?.[1] ?? 0;
  // Confidence is about how decisively the winner beat second place, not how
  // many rules fired. A tie between sponsorship and noise is not confident.
  const confidence = Math.min(
    1,
    ((top - runnerUp) / Math.max(top, 1)) * 0.6 + Math.min(top / 10, 0.4)
  );

  return {
    category,
    confidence: Number(confidence.toFixed(2)),
    signals: [...new Set(signals)].slice(0, 5),
  };
}

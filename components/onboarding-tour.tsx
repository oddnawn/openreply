"use client";

/**
 * First-run guided tour.
 *
 * Points at real sidebar elements via their data-tour attributes, so restyling
 * the nav cannot silently break it — a missing target is detected and skipped
 * rather than leaving a spotlight on empty space.
 *
 * Positioning is done imperatively against refs instead of through state. A
 * measure-then-setState effect would re-render on every scroll and resize, and
 * React rightly flags setState in an effect body as a cascading render.
 *
 * On skip or finish the card flies to the Tutorial nav item and pulses it, so
 * dismissing this teaches where the instructions went rather than just
 * removing them.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export const TOUR_STORAGE_KEY = "oddnawn:tour-seen";

interface Step {
  target: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    target: "account",
    title: "This is you",
    body: "Your connected Instagram account. Click it to change settings, read the guide, or sign out.",
  },
  {
    target: "dashboard",
    title: "Dashboard",
    body: "How things are going at a glance. Zeros here just mean nothing has happened yet — not that anything is broken.",
  },
  {
    target: "inbox",
    title: "Inbox",
    body: "Real people who messaged you. You read and reply here yourself. Nothing sends on its own.",
  },
  {
    target: "campaigns",
    title: "Campaigns",
    body: "The robot. Pick a post and a word like GUIDE, and anyone who comments it gets your link by DM automatically.",
  },
  {
    target: "research",
    title: "Research",
    body: "What is working for other creators right now, scored against their own usual numbers. This is where post ideas come from.",
  },
  {
    target: "tutorial",
    title: "Everything explained",
    body: "Every page in plain words. Open this whenever you are unsure — it is always here.",
  },
];

const CARD_WIDTH = 320;
const GAP = 14;

export default function OnboardingTour() {
  // Safe as a lazy initialiser because this component is only ever mounted
  // client-side (see onboarding-tour-mount), so there is no server render to
  // mismatch against.
  const [active, setActive] = useState(() => {
    try {
      return !window.localStorage.getItem(TOUR_STORAGE_KEY);
    } catch {
      return false;
    }
  });
  const [index, setIndex] = useState(0);

  const spotlightRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const finish = useCallback((animateToTutorial: boolean) => {
    try {
      window.localStorage.setItem(TOUR_STORAGE_KEY, "1");
    } catch {
      // Storage refused; the tour reappears next visit. Not worth blocking on.
    }

    const card = cardRef.current;
    const tutorial = document.querySelector<HTMLElement>('[data-tour="tutorial"]');

    if (!animateToTutorial || !card || !tutorial) {
      setActive(false);
      return;
    }

    // Fly the card into the Tutorial nav item, then pulse it.
    const from = card.getBoundingClientRect();
    const to = tutorial.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);

    card.style.transition = "transform .45s cubic-bezier(.4,0,.2,1), opacity .45s ease";
    card.style.transform = `translate(${dx}px, ${dy}px) scale(.12)`;
    card.style.opacity = "0";
    if (spotlightRef.current) spotlightRef.current.style.opacity = "0";

    tutorial.animate(
      [
        { boxShadow: "0 0 0 0 var(--color-accent)" },
        { boxShadow: "0 0 0 6px transparent" },
      ],
      { duration: 900, delay: 400, easing: "ease-out" },
    );

    window.setTimeout(() => setActive(false), 460);
  }, []);

  // Position the spotlight and card against the current target. Runs on step
  // change, and re-runs on resize and scroll so the highlight stays attached.
  useEffect(() => {
    if (!active) return;

    function place() {
      const step = STEPS[index];
      const target = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      const spotlight = spotlightRef.current;
      const card = cardRef.current;
      if (!spotlight || !card) return;

      const rect = target?.getBoundingClientRect();
      const visible = rect && rect.width > 0 && rect.height > 0;

      if (!visible) {
        // Off-canvas sidebar on mobile, or a target that isn't rendered.
        // Centre the card and drop the spotlight rather than pointing at 0,0.
        spotlight.style.opacity = "0";
        card.style.left = "50%";
        card.style.top = "50%";
        card.style.transform = "translate(-50%, -50%)";
        return;
      }

      spotlight.style.opacity = "1";
      spotlight.style.left = `${rect.left - 6}px`;
      spotlight.style.top = `${rect.top - 6}px`;
      spotlight.style.width = `${rect.width + 12}px`;
      spotlight.style.height = `${rect.height + 12}px`;

      const roomRight = window.innerWidth - rect.right;
      const placeRight = roomRight > CARD_WIDTH + GAP * 2;

      card.style.transform = "none";
      card.style.left = placeRight
        ? `${rect.right + GAP}px`
        : `${Math.max(GAP, rect.left)}px`;
      card.style.top = `${Math.min(
        Math.max(GAP, rect.top),
        Math.max(GAP, window.innerHeight - card.offsetHeight - GAP),
      )}px`;
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [active, index]);

  useEffect(() => {
    if (!active) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") finish(true);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active, finish]);

  if (!active) return null;

  const step = STEPS[index];
  const last = index === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Getting started">
      {/* The dim is painted by an enormous spread shadow on the spotlight box,
          which is what cuts a genuine hole rather than faking one with four
          panels around the target. */}
      <div
        ref={spotlightRef}
        className="pointer-events-none absolute rounded-xl transition-all duration-300"
        style={{ boxShadow: "0 0 0 9999px rgba(8, 12, 24, .62)" }}
      />

      <div
        ref={cardRef}
        className="panel absolute w-[320px] max-w-[calc(100vw-28px)] p-4"
        style={{ transformOrigin: "center" }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
          {index + 1} of {STEPS.length}
        </p>
        <h2 className="mt-1 text-base font-semibold">{step.title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => finish(true)}
            className="text-sm text-muted hover:text-foreground"
          >
            Skip
          </button>

          <div className="ml-auto flex gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex((i) => i - 1)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:border-border-hover"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? finish(true) : setIndex((i) => i + 1))}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-white"
            >
              {last ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

/**
 * Loads the tour client-side only.
 *
 * Whether the tour runs depends on localStorage, which the server cannot see.
 * Rendering it on the server and correcting afterwards is either a hydration
 * mismatch or a setState-in-effect; skipping SSR entirely avoids both, and the
 * tour is not content worth server-rendering anyway.
 */

import dynamic from "next/dynamic";

const OnboardingTour = dynamic(() => import("@/components/onboarding-tour"), {
  ssr: false,
});

export default function OnboardingTourMount() {
  return <OnboardingTour />;
}

import { redirect } from "next/navigation";

/**
 * Root.
 *
 * This instance is one operator's private dashboard on their own domain, not a
 * public product page, so the front door goes straight to the app. Signed out,
 * /dashboard bounces to /login, which is the right landing for a stranger too.
 *
 * The upstream marketing page that used to live here is still in git history
 * (and the SEO routes under /templates, /manychat-alternative and friends are
 * untouched) — restore this one file if the public page is ever wanted back.
 */
export default function RootPage() {
  redirect("/dashboard");
}

/**
 * Tutorial
 *
 * Plain-language guide to every page. Written for someone who has never seen
 * the app and does not know what an API is. Short sentences, no jargon; where
 * a technical word is unavoidable it gets explained on the spot.
 */

interface Step {
  title: string;
  body: string[];
}

interface Section {
  page: string;
  oneLiner: string;
  steps: Step[];
}

const sections: Section[] = [
  {
    page: "Dashboard",
    oneLiner: "The front page. A quick look at how things are going.",
    steps: [
      {
        title: "What the numbers mean",
        body: [
          "DMs sent is how many automatic messages went out.",
          "Campaigns is how many of your auto-reply rules are switched on.",
          "Followers is how many people follow your Instagram.",
        ],
      },
      {
        title: "When it says zero",
        body: [
          "Zero is not a bug. It means nothing has happened yet.",
          "You need a post on Instagram, and a campaign turned on, before numbers start moving.",
        ],
      },
    ],
  },
  {
    page: "Inbox",
    oneLiner: "Real people sending you messages on Instagram.",
    steps: [
      {
        title: "Reading a message",
        body: [
          "The left side lists everyone who messaged you. Newest at the top.",
          "Click a name to read the whole chat.",
        ],
      },
      {
        title: "Writing back",
        body: [
          "Type in the box at the bottom and press send.",
          "Instagram has a rule: you can only reply within 24 hours of their last message. After that Instagram blocks the reply and you will see the reason on screen.",
        ],
      },
      {
        title: "This is not the robot",
        body: [
          "The Inbox is you, typing. Nothing here sends by itself.",
          "The robot that replies on its own lives under Campaigns.",
        ],
      },
    ],
  },
  {
    page: "Campaigns",
    oneLiner: "The robot. It sends a DM automatically when someone comments a word you pick.",
    steps: [
      {
        title: "How one works",
        body: [
          "You choose a post, and a word like GUIDE.",
          "Someone comments GUIDE on that post.",
          "The robot sends them a DM with your link. You do nothing.",
        ],
      },
      {
        title: "Making one",
        body: [
          "Click Campaigns, then New Campaign.",
          "Pick the post. Type the word people must comment. Write the message they get.",
          "Turn it on. That is it.",
        ],
      },
      {
        title: "Pick the word carefully",
        body: [
          "Use a word people would not say by accident. GUIDE or LINK is good. Nice is bad, because lots of people type nice.",
        ],
      },
    ],
  },
  {
    page: "Research",
    oneLiner: "Shows which posts by other creators did unusually well, so you know what to make.",
    steps: [
      {
        title: "What the x number means",
        body: [
          "This is the important part. 20x means that post got twenty times more views than that person normally gets.",
          "We compare a post to that same person's usual numbers. A big channel getting a normal week does not count as a win. A small channel doing five times better than usual does.",
          "Anything above 3x is worth a look.",
        ],
      },
      {
        title: "How to read a card",
        body: [
          "Why it worked explains the trick that made people watch.",
          "Your move is what you should actually do about it.",
          "Sometimes your move says skip this one. That is a real answer, not a mistake.",
        ],
      },
      {
        title: "Copy the shape, not the topic",
        body: [
          "Do not remake their video. You would just make a worse copy of something that already exists.",
          "Take the shape of it, and point it at something only you can talk about.",
        ],
      },
      {
        title: "The Run research button",
        body: [
          "This asks for fresh numbers. It does not run here on the website.",
          "The work happens on your own computer, because it needs programs that only live there.",
          "So your computer must be on, with the watcher running. If it is off, the request just waits in line until you turn it on.",
        ],
      },
    ],
  },
  {
    page: "DM Logs",
    oneLiner: "A receipt for every automatic message.",
    steps: [
      {
        title: "What to look for",
        body: [
          "SENT means it worked.",
          "FAILED means it did not, and the reason is written next to it.",
          "SKIPPED means the robot chose not to send, usually because that person already got the message.",
        ],
      },
    ],
  },
  {
    page: "Overview",
    oneLiner: "Charts of how things changed over time.",
    steps: [
      {
        title: "Why it exists",
        body: [
          "The Dashboard tells you today. This tells you the trend.",
          "Instagram only keeps about 30 days of follower history, so this app writes down your follower count each day to keep a longer record.",
        ],
      },
    ],
  },
  {
    page: "Settings",
    oneLiner: "Where you connect Instagram and change account details.",
    steps: [
      {
        title: "Connecting Instagram",
        body: [
          "Nothing in this app works until Instagram is connected here.",
          "Your account must be a Creator or Business account. A personal account cannot be connected. You can switch it in the Instagram app for free.",
        ],
      },
    ],
  },
  {
    page: "Diagnostics",
    oneLiner: "The health check. Open this when something seems broken.",
    steps: [
      {
        title: "Read it top to bottom",
        body: [
          "Green means that piece is fine.",
          "The one that matters most is the worker. The worker is the program that actually sends DMs. If the worker is unhealthy, no DM will ever go out, even though everything else looks normal.",
        ],
      },
    ],
  },
];

const faqs: { q: string; a: string }[] = [
  {
    q: "Why is everything showing zero?",
    a: "Because nothing has happened yet. You need a post on Instagram, and a campaign switched on. Zero means empty, not broken.",
  },
  {
    q: "What is the difference between Inbox and Campaigns?",
    a: "Inbox is you replying by hand to real people. Campaigns is the robot replying by itself to anyone who comments your keyword.",
  },
  {
    q: "Someone commented my keyword but got nothing.",
    a: "Check three things in order. Is the campaign switched on? Is it attached to that exact post? Then open Diagnostics and check the worker is healthy.",
  },
  {
    q: "Why can't I reply to an old message?",
    a: "Instagram's rule, not ours. You get 24 hours after someone messages you. After that Instagram refuses the reply.",
  },
  {
    q: "The Research page looks out of date.",
    a: "It shows the last run. Press Run research to ask for a new one, then make sure your computer is on with the watcher running.",
  },
];

export default function TutorialPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">How to use this</h1>
        <p className="mt-1.5 text-sm text-muted">
          Every page, in plain words. Read the part you need — you do not have to
          read it all.
        </p>
      </div>

      <div className="panel p-5">
        <h2 className="text-sm font-semibold">The whole thing in four sentences</h2>
        <ol className="mt-3 space-y-2 text-sm text-muted">
          <li>
            <span className="font-semibold text-foreground">1.</span> You post on
            Instagram and tell people to comment a word.
          </li>
          <li>
            <span className="font-semibold text-foreground">2.</span> This app
            watches for that word and sends those people a DM by itself.
          </li>
          <li>
            <span className="font-semibold text-foreground">3.</span> People who
            message you for real reasons show up in the Inbox for you to answer.
          </li>
          <li>
            <span className="font-semibold text-foreground">4.</span> Research
            tells you what to post next, based on what is working for other
            creators right now.
          </li>
        </ol>
      </div>

      {sections.map((section) => (
        <section key={section.page} className="space-y-3">
          <div>
            <h2 className="text-base font-semibold">{section.page}</h2>
            <p className="mt-0.5 text-sm text-muted">{section.oneLiner}</p>
          </div>

          <div className="space-y-2">
            {section.steps.map((step) => (
              <div key={step.title} className="panel p-4">
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <div className="mt-1.5 space-y-1.5">
                  {step.body.map((line, i) => (
                    <p key={i} className="text-sm leading-relaxed text-muted">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">When something goes wrong</h2>
        <div className="space-y-2">
          {faqs.map((f) => (
            <details key={f.q} className="panel p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                {f.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

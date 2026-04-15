import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const platformCards = [
  {
    title: "Disease Diagnostics",
    description:
      "Upload a leaf image, run the THUNAI disease pipeline, and keep treatment-ready notes in one place.",
    href: "/diagnostics",
  },
  {
    title: "Crop Switch Advisor",
    description:
      "Run the Tamil Nadu crop-switch model inside THUNAI instead of sending users to a separate interface.",
    href: "/crop-switch",
  },
  {
    title: "Community Context",
    description:
      "Keep room for farmer insight and human validation so model output stays useful on the ground.",
    href: "/#community",
  },
];

const workflow = [
  {
    step: "01",
    title: "Capture field context",
    body: "Start with either a diseased leaf image or a district-season crop decision.",
  },
  {
    step: "02",
    title: "Run a model-backed route",
    body: "THUNAI now talks to backend routes that handle crop-switch inference, disease analysis, and storage.",
  },
  {
    step: "03",
    title: "Track action and history",
    body: "Prediction history is stored locally so the rest of the team can keep building from a stable product base.",
  },
];

const communityPosts = [
  {
    title: "Leaf blight flagged early in turmeric block",
    author: "Farmer from Erode",
    meta: "4 replies",
  },
  {
    title: "Oddanchatram market movement after rain delay",
    author: "Trader from Dindigul",
    meta: "7 replies",
  },
  {
    title: "Need second opinion on rice brown spot severity",
    author: "Student volunteer",
    meta: "3 replies",
  },
];

export default function Index() {
  return (
    <main className="min-h-screen">
      <section id="hero" className="relative overflow-hidden bg-[#16351a] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(218,165,32,0.28),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(85,140,92,0.24),transparent_32%)]" />
        <div className="container relative py-24 md:py-32">
          <p className="mb-4 inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs tracking-[0.2em]">
            THUNAI AGRI INTELLIGENCE
          </p>
          <div className="grid gap-10 lg:grid-cols-[1.25fr_0.9fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-extrabold leading-tight md:text-6xl">
                One THUNAI workspace for disease diagnostics and crop-switch decisions.
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-white/85 md:text-xl">
                We're moving the working ML features into THUNAI itself so the
                team can keep the website, routes, and database together.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Button asChild size="lg" className="rounded-md">
                  <Link to="/diagnostics">Open Diagnostics</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="rounded-md bg-white/10 text-white hover:bg-white/20"
                >
                  <Link to="/crop-switch">Open Crop Switch</Link>
                </Button>
              </div>
            </div>

            <aside className="rounded-2xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">
                Build Focus
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white">
                Website-first integration with local persistence.
              </h2>
              <div className="mt-6 space-y-3 text-sm text-white/80">
                <p>Route-based pages inside THUNAI.</p>
                <p>SQLite-backed history for both modules.</p>
                <p>Python bridges into the existing ML workflows.</p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section id="features" className="bg-secondary py-20">
        <div className="container">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold md:text-4xl">
              THUNAI is shifting from a concept demo toward a usable agri platform.
            </h2>
            <p className="mt-3 text-foreground/70">
              These modules now connect to working server routes and persistent
              local storage rather than only showing mocked interactions.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {platformCards.map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <h3 className="text-xl font-semibold">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-foreground/70">
                  {card.description}
                </p>
                <div className="mt-6">
                  <Button asChild variant="outline" className="rounded-md">
                    <Link to={card.href}>Open module</Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="py-20">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div className="rounded-2xl border bg-[#1d4724] p-8 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">
                Workflow
              </p>
              <h2 className="mt-3 text-3xl font-bold">
                Built to move from prediction to action without context loss.
              </h2>
              <p className="mt-4 text-white/80">
                The website, the model calls, and the persistence layer are now
                being shaped as one product surface instead of separate demos.
              </p>
            </div>

            <div className="space-y-4">
              {workflow.map((item) => (
                <article key={item.step} className="rounded-2xl border bg-white p-6 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                    Step {item.step}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-foreground/70">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="community" className="bg-secondary py-20">
        <div className="container">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-3xl font-bold md:text-4xl">
                Community still matters alongside model output.
              </h2>
              <p className="mt-3 max-w-2xl text-foreground/70">
                The next stage is combining AI output with farmer validation and
                field feedback so the product stays grounded in real conditions.
              </p>
            </div>
            <Button asChild variant="outline" className="rounded-md">
              <a
                href="https://github.com/SBH1928/THUNAI.AI"
                target="_blank"
                rel="noreferrer"
              >
                View Repository
              </a>
            </Button>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {communityPosts.map((post) => (
              <article key={post.title} className="rounded-2xl border bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold">{post.title}</h3>
                <p className="mt-2 text-sm text-foreground/70">{post.author}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-primary">
                  {post.meta}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="py-20">
        <div className="container grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h2 className="text-3xl font-bold md:text-4xl">
              THUNAI is becoming the working shell for the full project.
            </h2>
            <p className="mt-4 max-w-2xl text-foreground/70">
              This gives the team a stronger base for the rest of the website
              work: model-backed pages, a local database, and routes ready for
              deeper backend features.
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              Team Direction
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-foreground/75">
              <li>Frontend can keep extending THUNAI instead of a separate Flask site.</li>
              <li>Backend routes now have room for persistence and model orchestration.</li>
              <li>The disease pipeline is ready to accept trained CNN weights later.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

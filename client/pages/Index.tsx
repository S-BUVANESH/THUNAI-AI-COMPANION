import { DemoResponse } from "@shared/api";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export default function Index() {
  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
      <InteractiveMockups />
      <Team />
    </main>
  );
}

function Hero() {
  return (
    <section id="hero" className="relative min-h-[80vh] md:min-h-[92vh] flex items-center">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <video className="h-full w-full object-cover" autoPlay muted loop playsInline poster="/public/placeholder.svg">
          <source src="/videos/drone-farm.mp4" type="video/mp4" />
          <source src="https://videos.pexels.com/video-files/857195/857195-uhd_2560_1440_30fps.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/20" />
      </div>
      <div className="container relative text-white py-24">
        <p className="mb-4 inline-block rounded-full bg-white/10 px-3 py-1 text-xs tracking-wider">
          The AI-Powered Decision Support System for Modern Agriculture.
        </p>
        <h1 className="max-w-3xl text-4xl md:text-6xl font-extrabold leading-tight">The Future of Farming is Data-Driven.</h1>
        <p className="mt-4 max-w-2xl text-white/90 text-lg md:text-xl">
          THUNAI is an enterprise-grade AI platform that equips farmers in Tamil Nadu with the real-time intelligence needed to mitigate risks, increase yield, and ensure sustainability.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button asChild size="lg" className="rounded-md">
            <a href="#how">Launch App</a>
          </Button>
          <a
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border bg-white/10 px-4 py-2 text-white hover:bg-white/20"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

function Features() {
  const cards = [
    {
      title: "AI Diagnostic Engine",
      desc: "Instant, hyper-local pest and disease identification with 95%+ accuracy.",
    },
    {
      title: "Conversational AI Assistant",
      desc: "A 24/7 accessible assistant via Tamil voice and text for all your queries.",
    },
    {
      title: "Peer Knowledge Network",
      desc: "Validate AI insights with trusted, real-world human experience.",
    },
  ];
  return (
    <section id="features" className="bg-secondary py-20">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">An Integrated Platform for Complete Decision Support</h2>
        <p className="text-foreground/70 mb-10">Built for reliability, privacy, and scale.</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div key={c.title} className="group rounded-lg border bg-card p-6 shadow-sm transition hover:shadow-md">
              <h3 className="text-xl font-semibold text-foreground mb-2 tracking-wide">{c.title}</h3>
              <p className="text-sm text-foreground/70 mb-4">{c.desc}</p>
              <a href="#how" className="text-primary font-medium inline-flex items-center gap-1">Learn More
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type TabKey = "diagnose" | "chat" | "community";

function InteractiveMockups() {
  const [tab, setTab] = useState<TabKey>("diagnose");
  return (
    <section id="how" className="py-20">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Experience the THUNAI Workflow</h2>
        <p className="text-foreground/70 mb-8">A realistic preview of Diagnose, Chat, and Community — all working together.</p>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b flex items-center gap-2 bg-secondary px-3 py-2">
            {([
              { key: "diagnose", label: "Diagnose" },
              { key: "chat", label: "Chat" },
              { key: "community", label: "Community" },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  tab === t.key ? "bg-white text-foreground shadow" : "text-foreground/70 hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "diagnose" && <Diagnose onConsultCommunity={() => setTab("community")} />}
          {tab === "chat" && <Chat />}
          {tab === "community" && <Community />}
        </div>
      </div>
    </section>
  );
}

function Diagnose({ onConsultCommunity }: { onConsultCommunity: () => void }) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const start = () => {
    setProgress(0);
    setDone(false);
    let p = 0;
    const id = setInterval(() => {
      p += Math.random() * 18 + 6;
      if (p >= 100) {
        p = 100;
        clearInterval(id);
        setDone(true);
      }
      setProgress(Math.round(p));
    }, 260);
  };

  return (
    <div className="p-6">
      {!done ? (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-lg border p-6">
            <p className="text-sm text-foreground/80 mb-4">Upload a photo of your crop to begin diagnosis.</p>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 rounded-md border px-4 py-2 cursor-pointer hover:bg-secondary">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                <span>Select Photo</span>
                <input type="file" className="hidden" onChange={start} />
              </label>
              <Button onClick={start} className="rounded-md">Upload</Button>
            </div>
            {progress > 0 && (
              <div className="mt-6">
                <div className="mb-2 flex justify-between text-xs text-foreground/70">
                  <span>Analyzing image…</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-secondary">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
          </div>
          <div className="rounded-lg border p-6 bg-secondary">
            <h4 className="font-semibold mb-2">Tips</h4>
            <ul className="list-disc pl-5 text-sm text-foreground/70 space-y-1">
              <li>Good lighting improves accuracy.</li>
              <li>Focus on the affected leaf area.</li>
              <li>Upload one clear image per diagnosis.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border overflow-hidden bg-white">
            <img src="/images/placeholder-leaf-disease.svg" alt="Diseased leaf" className="w-full h-full object-cover" />
          </div>
          <div className="rounded-lg border p-6 flex flex-col">
            <h3 className="text-2xl font-bold mb-2">Result: Leaf Blight</h3>
            <p className="text-sm text-foreground/70">Confidence: 97.2%</p>
            <div className="mt-6 space-y-3 text-sm">
              <p>Recommended next steps:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Isolate affected plants to prevent spread.</li>
                <li>Apply recommended bio-control agents.</li>
                <li>Consult the community for field-tested tips.</li>
              </ul>
            </div>
            <div className="mt-auto pt-6">
              <Button onClick={onConsultCommunity} className="rounded-md">Consult Community</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Chat() {
  const messages = useMemo(() => ([
    { role: "user", content: "(Shows an uploaded image of a tomato plant)", image: "/images/placeholder-tomato.svg" },
    { role: "assistant", content: "Diagnosis: Tomato Mosaic Virus. This is a viral infection." },
    { role: "user", content: "What are the approved organic treatments?" },
    { role: "assistant", content: "TNAU recommends removing and destroying infected plants to prevent spread. Neem oil can be used on surrounding plants as a preventive measure." },
    { role: "user", content: "What is the current price for coconuts in the Pollachi market?" },
    { role: "assistant", content: "As of 11:30 AM, the price for premium coconuts in the Pollachi Regulated Market is ₹32 per piece." },
  ]), []);

  return (
    <div className="p-6">
      <div className="h-[460px] rounded-lg border bg-secondary p-4 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-3", m.role === "user" ? "justify-start" : "justify-end") }>
              {m.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">U</div>
              )}
              <div className={cn("rounded-lg px-3 py-2 text-sm max-w-[80%]", m.role === "user" ? "bg-white border" : "bg-primary text-white") }>
                {m.image && (
                  <img src={m.image} alt="Uploaded tomato plant" className="mb-2 rounded border" />
                )}
                <p>{m.content}</p>
              </div>
              {m.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">T</div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input disabled className="flex-1 rounded-md border bg-secondary px-3 py-2 text-sm" placeholder="Input disabled in demo" />
        <Button disabled className="rounded-md">Send</Button>
      </div>
    </div>
  );
}

function Community() {
  const posts = [
    {
      id: 1,
      title: "AI diagnosed Leaf Blight on my turmeric. Has anyone used Trichoderma viride for this?",
      author: "Farmer from Erode",
      meta: "2 hours ago, 5 replies",
      body: "Looking for experiences using Trichoderma viride against Leaf Blight on turmeric. Did it help? Any recommended dosage and application schedule?",
      replies: [
        { author: "Farmer from Salem", text: "Yes, helped reduce spread. Applied as seed treatment and soil drench." },
        { author: "Agri student", text: "Combine with good field sanitation. Remove infected leaves early." },
      ],
    },
    {
      id: 2,
      title: "Market Price Alert: Onion prices are up in Oddanchatram.",
      author: "Farmer from Dindigul",
      meta: "4 hours ago, 12 replies",
      body: "Observed higher auction prices today. Anyone else seeing similar trends in nearby markets?",
      replies: [
        { author: "Trader", text: "Confirmed: prices trending up due to lower arrivals." },
      ],
    },
    {
      id: 3,
      title: "Moderator Post: Early warning for Fall Armyworm sightings near Tiruppur.",
      author: "Moderator",
      meta: "6 hours ago, 8 replies",
      body: "Please monitor your fields. Report any sightings with photos to improve regional alerts.",
      replies: [
        { author: "Extension worker", text: "Set pheromone traps and survey weekly." },
      ],
    },
  ];

  const [openId, setOpenId] = useState<number | null>(null);
  const current = posts.find((p) => p.id === openId);

  return (
    <div className="p-6">
      {!current ? (
        <div className="grid gap-4 md:grid-cols-2">
          {posts.map((p) => (
            <article key={p.id} className="rounded-lg border bg-white p-4 hover:shadow-sm transition">
              <h3>
                <button onClick={() => setOpenId(p.id)} className="text-left font-semibold text-foreground hover:underline">
                  {p.title}
                </button>
              </h3>
              <p className="text-xs text-foreground/60 mt-1">{p.author} • {p.meta}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-6">
          <button onClick={() => setOpenId(null)} className="mb-4 inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            Back to posts
          </button>
          <h3 className="text-xl font-bold">{current.title}</h3>
          <p className="text-xs text-foreground/60 mt-1">{current.author} • {current.meta}</p>
          <p className="mt-4 text-foreground/80">{current.body}</p>
          <div className="mt-6 space-y-3">
            {current.replies.map((r, i) => (
              <div key={i} className="rounded-md border bg-secondary p-3 text-sm">
                <p className="font-medium">{r.author}</p>
                <p className="text-foreground/80">{r.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-2">
            <input disabled placeholder="Replies are disabled in this demo" className="flex-1 rounded-md border bg-secondary px-3 py-2 text-sm" />
            <button disabled className="rounded-md bg-muted px-4 py-2 text-sm text-foreground/60">Reply</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Team() {
  const team = new Array(6).fill(0).map((_, i) => ({
    name: [
      "Project Lead",
      "AI/ML Developer",
      "Frontend Engineer",
      "Backend Engineer",
      "UX Designer",
      "Outreach Coordinator",
    ][i],
    role: [
      "Project Lead",
      "AI/ML Developer",
      "Frontend Engineer",
      "Backend Engineer",
      "UX Designer",
      "Outreach Coordinator",
    ][i],
  }));
  return (
    <section id="about" className="py-20 bg-secondary">
      <div className="container">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Our Mission & Team</h2>
        <p className="text-foreground/70 max-w-3xl">Our mission is to build accessible and powerful technological tools that empower local farmers. We are a dedicated, multi-disciplinary team based in Coimbatore, combining expertise in computer science and a deep understanding of regional agricultural challenges.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((m, i) => (
            <div key={i} className="rounded-lg border bg-white p-6 flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/15 grid place-items-center text-primary font-bold">{m.role.split(" ").map(w=>w[0]).join("")}</div>
              <div>
                <p className="font-semibold text-foreground">Member {i + 1}</p>
                <p className="text-sm text-foreground/70">{m.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div id="community" className="h-0" aria-hidden="true" />
    </section>
  );
}

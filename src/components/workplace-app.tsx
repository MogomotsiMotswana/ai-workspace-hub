"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Clock3,
  Copy,
  FileText,
  LayoutDashboard,
  Lightbulb,
  Mail,
  Menu,
  RefreshCw,
  Search,
  Send,
  Target,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import brandMark from "@/assets/workplace-ai-mark.png";

type View = "dashboard" | "email" | "research" | "chat";
type Tone = "Formal" | "Friendly" | "Persuasive";
type ChatMessage = { id: number; role: "user" | "assistant"; text: string };
type ResearchResult = { summary: string; insights: string[]; recommendations: string[] };

const navItems: Array<{ id: View; label: string; short: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "dashboard", label: "Dashboard", short: "Home", icon: LayoutDashboard },
  { id: "email", label: "Smart Email Generator", short: "Email", icon: Mail },
  { id: "research", label: "AI Research Assistant", short: "Research", icon: Search },
  { id: "chat", label: "AI Chatbot", short: "Chat", icon: Bot },
];

const emailVersions: Record<Tone, string[]> = {
  Formal: [
    "Subject: Q4 Planning Session — Proposed Agenda and Next Steps\n\nHi Priya,\n\nI’m writing to align on our upcoming Q4 planning session. To make the discussion focused and productive, I propose that we review current performance, confirm the three highest-priority initiatives, and assign owners with clear delivery milestones.\n\nPlease share any additional agenda items by Thursday afternoon. I’ll circulate the final agenda and pre-read on Friday so everyone has sufficient time to prepare.\n\nBest regards,\nAlex",
    "Subject: Preparation for Our Q4 Planning Session\n\nDear Priya,\n\nAhead of our Q4 planning session, I would like to confirm the proposed focus areas: reviewing current performance, agreeing on three priority initiatives, and establishing accountable owners and milestones.\n\nIf there are further topics you would like included, please send them by Thursday afternoon. The final agenda and supporting materials will follow on Friday.\n\nKind regards,\nAlex",
  ],
  Friendly: [
    "Subject: Let’s make our Q4 planning session count\n\nHi Priya,\n\nI’m looking forward to our Q4 planning session. I’d love for us to use the time to look at what’s working, agree on our top three priorities, and leave with clear owners and milestones.\n\nCould you send over any extra agenda items by Thursday afternoon? I’ll pull everything into a short pre-read and share it on Friday.\n\nThanks,\nAlex",
    "Subject: Quick prep for Q4 planning\n\nHi Priya,\n\nA quick note before our Q4 planning session: I’m planning to cover performance so far, our three biggest priorities, and who will own each next step. That should help us finish with a practical plan rather than a long wish list.\n\nSend me anything else you’d like covered by Thursday, and I’ll share the final pre-read Friday.\n\nThanks,\nAlex",
  ],
  Persuasive: [
    "Subject: A focused plan to accelerate Q4 results\n\nHi Priya,\n\nOur Q4 planning session is an opportunity to turn the strongest ideas into measurable progress. I recommend we focus the meeting on three decisions: which initiatives will create the most impact, who will own each outcome, and what milestones will keep delivery on track.\n\nPlease share any essential agenda additions by Thursday afternoon. I’ll circulate a concise pre-read on Friday so we can use the session for decisions—not status updates.\n\nBest,\nAlex",
    "Subject: Turning Q4 priorities into accountable action\n\nHi Priya,\n\nTo give Q4 the strongest possible start, I propose we use our planning session to select three high-impact priorities and translate each into a named owner, measurable outcome, and delivery milestone. This structure will help us move quickly and protect the team from competing demands.\n\nPlease send critical additions by Thursday. I’ll share the final decision-focused agenda on Friday.\n\nBest,\nAlex",
  ],
};

const researchVersions = [
  {
    summary: "Hybrid teams perform best when flexibility is paired with explicit coordination. The strongest evidence favors role-based office rhythms, protected focus time, and shared documentation over blanket attendance mandates.",
    insights: [
      "Teams with agreed collaboration windows report fewer scheduling delays than teams with fully ad hoc attendance.",
      "Written decision records reduce repeated discussions and help remote colleagues contribute asynchronously.",
      "Managers—not policy alone—have the largest influence on whether hybrid employees feel included and informed.",
    ],
    recommendations: [
      "Set two team anchor windows each week for work that benefits from live collaboration.",
      "Publish decisions, owners, and deadlines in one shared workspace within 24 hours.",
      "Review meeting load and employee sentiment after six weeks, then adjust by team needs.",
    ],
  },
  {
    summary: "Effective hybrid work is less about location and more about operating clarity. Teams see better outcomes when they define which activities require synchronous collaboration and design the rest for asynchronous progress.",
    insights: [
      "Unclear availability norms create more friction than physical distance.",
      "Smaller, decision-led meetings outperform broad recurring status calls.",
      "Consistent access to context is a leading predictor of perceived fairness across locations.",
    ],
    recommendations: [
      "Create a simple team charter covering response times, focus hours, and decision paths.",
      "Replace one weekly status meeting with an asynchronous written update.",
      "Track delivery speed and inclusion indicators instead of office attendance alone.",
    ],
  },
];

const suggestedPrompts = [
  "Help me prioritize a busy week",
  "Draft an agenda for a difficult meeting",
  "How can I give clearer feedback?",
];

function answerFor(prompt: string) {
  const lower = prompt.toLowerCase();
  if (lower.includes("priorit")) return "Here’s a practical way to reset the week:\n\n1. **Choose three outcomes** that would make Friday feel successful.\n2. **Separate urgent from important**—move low-impact requests to a later list.\n3. **Protect two 60-minute focus blocks** for your highest-value task.\n4. **Send one expectation-setting note** to anyone affected by a changed deadline.\n\nStart with the outcome that removes the biggest blocker for other people.";
  if (lower.includes("agenda") || lower.includes("meeting")) return "Use a decision-led agenda:\n\n- **5 min:** State the decision required and the shared goal\n- **10 min:** Confirm facts and constraints—no debate yet\n- **20 min:** Compare 2–3 viable options\n- **10 min:** Decide, assign an owner, and set a date\n- **5 min:** Capture risks and communication steps\n\nSend the decision question in advance so participants arrive prepared rather than discovering the issue in the room.";
  if (lower.includes("feedback")) return "Try a clear, low-defensiveness structure: **observation → impact → request**.\n\n> “In the last two project updates, the risk section arrived after the review. That left the team little time to respond. For the next update, could you flag risks by Tuesday noon—even if the details are still developing?”\n\nKeep it specific, discuss the work rather than the person, and invite their perspective before agreeing on the next step.";
  return `A useful way to approach **${prompt}** is to define the outcome first, identify the smallest next decision, and make ownership explicit.\n\nI’d suggest:\n1. Write the desired result in one sentence.\n2. List the two constraints that matter most.\n3. Choose one action you can complete today.\n4. Tell affected colleagues what will happen next and when.\n\nThis keeps the work actionable without over-planning.`;
}

function copyText(text: string, setCopied: (value: boolean) => void) {
  navigator.clipboard?.writeText(text);
  setCopied(true);
  window.setTimeout(() => setCopied(false), 1600);
}

function WorkplaceApp() {
  const [view, setView] = useState<View>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const selectView = (next: View) => {
    setView(next);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-40 hidden border-r border-sidebar-border bg-sidebar transition-[width] duration-300 lg:flex lg:flex-col ${collapsed ? "w-20" : "w-72"}`}>
        <Brand compact={collapsed} />
        <Navigation view={view} collapsed={collapsed} onSelect={selectView} />
        <div className="mt-auto border-t border-sidebar-border p-4">
          {!collapsed && <p className="mb-3 text-xs leading-relaxed text-muted-foreground">Everything in this demo stays in your browser session.</p>}
          <Button variant="ghost" size={collapsed ? "icon" : "sm"} className="w-full justify-center text-muted-foreground" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <ChevronRight /> : <><ChevronLeft /><span>Collapse sidebar</span></>}
          </Button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between"><Brand /><Button variant="ghost" size="icon" className="mr-3" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X /></Button></div>
        <Navigation view={view} onSelect={selectView} />
      </aside>

      <div className={`min-h-screen transition-[padding] duration-300 ${collapsed ? "lg:pl-20" : "lg:pl-72"}`}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu /></Button>
            <div>
              <p className="text-sm font-semibold capitalize">{view === "email" ? "Smart Email Generator" : view === "research" ? "AI Research Assistant" : view === "chat" ? "AI Chatbot" : "Dashboard"}</p>
              <p className="hidden text-xs text-muted-foreground sm:block">Your focused workspace for better work</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 rounded-full bg-primary" /> Local demo</div>
        </header>

        <main className="mx-auto max-w-[1440px] p-4 pb-24 sm:p-7 lg:p-9">
          {view === "dashboard" && <Dashboard onSelect={selectView} />}
          {view === "email" && <EmailGenerator />}
          {view === "research" && <ResearchAssistant />}
          {view === "chat" && <Chatbot />}
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-xl border border-border bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl lg:hidden">
        {navItems.map((item) => <Button key={item.id} variant={view === item.id ? "secondary" : "ghost"} className="h-12 flex-col gap-1 px-1 text-[10px]" onClick={() => selectView(item.id)}><item.icon className="size-4" /><span>{item.short}</span></Button>)}
      </nav>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`flex h-24 items-center gap-3 border-b border-sidebar-border ${compact ? "justify-center px-3" : "px-5"}`}>
    <img src={brandMark} alt="AI Workplace mark" width={48} height={48} className="size-11 shrink-0 rounded-lg object-cover" />
    {!compact && <div className="min-w-0"><p className="text-sm font-extrabold leading-tight">AI Workplace</p><p className="text-xs text-muted-foreground">Productivity Assistant</p></div>}
  </div>;
}

function Navigation({ view, collapsed = false, onSelect }: { view: View; collapsed?: boolean; onSelect: (view: View) => void }) {
  return <nav className="space-y-1 p-3" aria-label="Workspace navigation">
    {!collapsed && <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>}
    {navItems.map((item) => <Button key={item.id} variant={view === item.id ? "secondary" : "ghost"} className={`h-11 w-full ${collapsed ? "justify-center px-0" : "justify-start"}`} onClick={() => onSelect(item.id)} title={item.label}>
      <item.icon />{!collapsed && <span>{item.label}</span>}
    </Button>)}
  </nav>;
}

function PageIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-7 max-w-3xl"><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p><h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p></div>;
}

function Dashboard({ onSelect }: { onSelect: (view: View) => void }) {
  const actions = [
    { id: "email" as const, icon: Mail, title: "Write an email", text: "Turn key points into a polished message.", meta: "~ 30 sec" },
    { id: "research" as const, icon: Search, title: "Analyze research", text: "Extract decisions from dense information.", meta: "3 insight types" },
    { id: "chat" as const, icon: Bot, title: "Ask the assistant", text: "Work through a challenge or next step.", meta: "Always ready" },
  ];
  return <div>
    <section className="relative mb-8 overflow-hidden rounded-xl border border-border bg-card px-6 py-8 panel-shadow sm:px-9 sm:py-10">
      <div className="absolute inset-y-0 right-0 hidden w-2/5 border-l border-border bg-secondary/40 md:block" />
      <div className="relative max-w-2xl"><p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-primary">Thursday · Focus overview</p><h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">Good evening, Alex.</h1><p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">Turn the day’s loose ends into clear communication, useful research, and confident next steps.</p><Button className="mt-6" onClick={() => onSelect("email")}>Create something <ArrowRight /></Button></div>
    </section>
    <div className="mb-4 flex items-end justify-between"><div><h2 className="text-lg font-bold">Quick actions</h2><p className="text-sm text-muted-foreground">Choose a starting point</p></div></div>
    <section className="grid gap-4 md:grid-cols-3">
      {actions.map((action) => <article key={action.id} className="group rounded-lg border border-border bg-card p-5 transition duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl"><div className="mb-8 flex items-start justify-between"><div className="rounded-md bg-secondary p-2.5 text-primary"><action.icon className="size-5" /></div><span className="text-xs text-muted-foreground">{action.meta}</span></div><h3 className="font-bold">{action.title}</h3><p className="mt-2 min-h-10 text-sm leading-5 text-muted-foreground">{action.text}</p><Button variant="ghost" className="mt-4 -ml-3" onClick={() => onSelect(action.id)}>Open tool <ArrowRight /></Button></article>)}
    </section>
    <section className="mt-8 grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
      <div><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">Recent activity</h2><span className="text-xs text-muted-foreground">Today</span></div><div className="overflow-hidden rounded-lg border border-border bg-card">
        <Activity icon={Mail} title="Q4 planning session" type="Formal email" time="8 min ago" onClick={() => onSelect("email")} />
        <Activity icon={Search} title="Hybrid work effectiveness" type="Research summary" time="42 min ago" onClick={() => onSelect("research")} />
        <Activity icon={Bot} title="Prioritizing a busy week" type="Workplace chat" time="1 hr ago" onClick={() => onSelect("chat")} last />
      </div></div>
      <aside className="rounded-lg border border-border bg-secondary/50 p-5"><div className="mb-4 flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><Target className="size-4" /></div><h2 className="font-bold">A calmer way to work</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Give the assistant a clear outcome, audience, and constraint. Better context produces more useful first drafts.</p></aside>
    </section>
    <Disclaimer />
  </div>;
}

function Activity({ icon: Icon, title, type, time, onClick, last = false }: { icon: ComponentType<{ className?: string }>; title: string; type: string; time: string; onClick: () => void; last?: boolean }) {
  return <div className={`flex items-center gap-4 p-4 ${last ? "" : "border-b border-border"}`}><div className="rounded-md bg-secondary p-2 text-primary"><Icon className="size-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{title}</p><p className="text-xs text-muted-foreground">{type}</p></div><span className="hidden text-xs text-muted-foreground sm:block">{time}</span><Button variant="ghost" size="icon" onClick={onClick} aria-label={`Open ${title}`}><ChevronRight /></Button></div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) { return <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{children}</label>; }
const fieldClass = "w-full rounded-md border border-input bg-background px-3.5 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/20";

function EmailGenerator() {
  const [recipient, setRecipient] = useState("Priya, Head of Operations");
  const [purpose, setPurpose] = useState("Prepare for our Q4 planning session");
  const [points, setPoints] = useState("Review current performance\nAgree on our top three priorities\nAssign owners and delivery milestones\nRequest agenda additions by Thursday");
  const [tone, setTone] = useState<Tone>("Formal");
  const [output, setOutput] = useState(emailVersions.Formal[0] ?? "");
  const [version, setVersion] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const generate = (regenerate = false) => { setGenerating(true); window.setTimeout(() => { const next = regenerate ? (version + 1) % 2 : version; setVersion(next); setOutput(emailVersions[tone][next] ?? emailVersions[tone][0] ?? ""); setGenerating(false); }, 650); };
  return <div><PageIntro eyebrow="Communication" title="Write emails people act on." description="Provide the situation and the assistant will shape it into a clear, professional message you can edit." />
    <div className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
      <section className="rounded-lg border border-border bg-card p-5 panel-shadow sm:p-6"><div className="mb-6 flex items-center gap-3"><div className="rounded-md bg-secondary p-2 text-primary"><Mail /></div><div><h2 className="font-bold">Email brief</h2><p className="text-xs text-muted-foreground">Add the details that matter</p></div></div>
        <div className="space-y-5"><div><FieldLabel>Recipient</FieldLabel><input className={fieldClass} value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Name and role" /></div><div><FieldLabel>Purpose</FieldLabel><input className={fieldClass} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="What should this email achieve?" /></div><div><FieldLabel>Key points</FieldLabel><textarea className={`${fieldClass} min-h-36 resize-y`} value={points} onChange={(e) => setPoints(e.target.value)} placeholder="One point per line" /></div><div><FieldLabel>Tone</FieldLabel><div className="grid grid-cols-3 gap-2">{(["Formal", "Friendly", "Persuasive"] as Tone[]).map((item) => <Button key={item} variant={tone === item ? "default" : "outline"} className="px-2" onClick={() => setTone(item)}>{item}</Button>)}</div></div><Button className="w-full" disabled={!recipient || !purpose || generating} onClick={() => generate()}>{generating ? <><RefreshCw className="animate-spin" /> Drafting email…</> : <><Send /> Generate email</>}</Button></div>
      </section>
      <section className="flex min-h-[600px] flex-col rounded-lg border border-border bg-card panel-shadow"><div className="flex items-center justify-between border-b border-border p-5"><div><p className="text-sm font-bold">Generated email</p><p className="text-xs text-muted-foreground">Editable draft · {tone} tone</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => copyText(output, setCopied)}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy"}</Button><Button variant="outline" size="sm" onClick={() => generate(true)} disabled={generating}><RefreshCw /> Regenerate</Button></div></div><textarea aria-label="Generated email" className="min-h-[510px] flex-1 resize-none bg-transparent p-6 text-sm leading-7 text-foreground outline-none sm:p-8" value={output} onChange={(e) => setOutput(e.target.value)} /></section>
    </div><Disclaimer /></div>;
}

function ResearchAssistant() {
  const [sourceType, setSourceType] = useState("Topic");
  const [input, setInput] = useState("How hybrid work policies affect team productivity and employee engagement");
  const [result, setResult] = useState<ResearchResult>(researchVersions[0] ?? { summary: "", insights: [], recommendations: [] });
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const generate = (regen = false) => { setLoading(true); window.setTimeout(() => { const next = regen ? (version + 1) % researchVersions.length : version; const nextResult = researchVersions[next]; if (nextResult) setResult(nextResult); setVersion(next); setLoading(false); }, 750); };
  const allText = `${result.summary}\n\nKey insights\n${result.insights.join("\n")}\n\nRecommendations\n${result.recommendations.join("\n")}`;
  return <div><PageIntro eyebrow="Analysis" title="Turn information into direction." description="Explore a topic, article, or website and get the practical takeaways—not another wall of text." />
    <section className="rounded-lg border border-border bg-card p-5 panel-shadow sm:p-6"><div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-end"><div><FieldLabel>Source type</FieldLabel><div className="flex rounded-md bg-secondary p-1">{["Topic", "Article", "Website URL"].map((item) => <Button key={item} size="sm" variant={sourceType === item ? "default" : "ghost"} onClick={() => setSourceType(item)}>{item}</Button>)}</div></div><div><FieldLabel>{sourceType}</FieldLabel><input className={fieldClass} value={input} onChange={(e) => setInput(e.target.value)} placeholder={sourceType === "Website URL" ? "https://example.com/article" : "Paste or describe what you want to analyze"} /></div><Button className="h-11" disabled={!input || loading} onClick={() => generate()}>{loading ? <><RefreshCw className="animate-spin" /> Analyzing…</> : <><Search /> Analyze</>}</Button></div></section>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Research brief</h2><p className="text-xs text-muted-foreground">Synthesized for workplace decision-making</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => copyText(allText, setCopied)}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy all"}</Button><Button variant="outline" size="sm" onClick={() => generate(true)} disabled={loading}><RefreshCw /> Regenerate</Button></div></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2"><EditableResearchCard icon={FileText} title="Executive summary" value={result.summary} onChange={(value) => setResult({ ...result, summary: value })} wide /><ListResearchCard icon={Lightbulb} title="Key insights" items={result.insights} onChange={(insights) => setResult({ ...result, insights })} /><ListResearchCard icon={Target} title="Practical recommendations" items={result.recommendations} onChange={(recommendations) => setResult({ ...result, recommendations })} /></div><Disclaimer /></div>;
}

function EditableResearchCard({ icon: Icon, title, value, onChange, wide = false }: { icon: ComponentType<{ className?: string }>; title: string; value: string; onChange: (v: string) => void; wide?: boolean }) { return <article className={`rounded-lg border border-border bg-card p-5 ${wide ? "lg:col-span-2" : ""}`}><div className="mb-4 flex items-center gap-3"><div className="rounded-md bg-secondary p-2 text-primary"><Icon className="size-4" /></div><h3 className="font-bold">{title}</h3></div><textarea className="min-h-24 w-full resize-y bg-transparent text-sm leading-6 text-muted-foreground outline-none" value={value} onChange={(e) => onChange(e.target.value)} /></article>; }
function ListResearchCard({ icon: Icon, title, items, onChange }: { icon: ComponentType<{ className?: string }>; title: string; items: string[]; onChange: (items: string[]) => void }) { return <article className="rounded-lg border border-border bg-card p-5"><div className="mb-4 flex items-center gap-3"><div className="rounded-md bg-secondary p-2 text-primary"><Icon className="size-4" /></div><h3 className="font-bold">{title}</h3></div><div className="space-y-3">{items.map((item, index) => <div key={index} className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" /><textarea aria-label={`${title} ${index + 1}`} className="min-h-16 w-full resize-none bg-transparent text-sm leading-6 text-muted-foreground outline-none" value={item} onChange={(e) => onChange(items.map((old, i) => i === index ? e.target.value : old))} /></div>)}</div></article>; }

function Chatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 1, role: "assistant", text: "Good evening, Alex. I’m here to help you work through priorities, communication, meetings, and everyday workplace decisions. What’s on your mind?" }]);
  const [status, setStatus] = useState<"ready" | "submitted">("ready");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, [status]);
  const submit = (text: string) => { const clean = text.trim(); if (!clean || status === "submitted") return; const user: ChatMessage = { id: Date.now(), role: "user", text: clean }; setMessages((old) => [...old, user]); setStatus("submitted"); window.setTimeout(() => { setMessages((old) => [...old, { id: Date.now() + 1, role: "assistant", text: answerFor(clean) }]); setStatus("ready"); }, 850); };
  return <div><PageIntro eyebrow="Workplace copilot" title="Think through work, out loud." description="Ask a question, untangle a challenge, or turn an unclear situation into a practical next step." />
    <div className="grid h-[690px] overflow-hidden rounded-lg border border-border bg-card panel-shadow xl:grid-cols-[280px_1fr]">
      <aside className="hidden border-r border-border bg-secondary/30 p-5 xl:block"><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Suggested prompts</p><div className="mt-4 space-y-2">{suggestedPrompts.map((prompt) => <Button key={prompt} variant="ghost" className="h-auto w-full justify-start whitespace-normal py-3 text-left leading-5" onClick={() => submit(prompt)}><span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />{prompt}</Button>)}</div><div className="mt-8 border-t border-border pt-5"><p className="flex items-center gap-2 text-xs font-semibold"><Clock3 className="size-3.5 text-primary" /> Session only</p><p className="mt-2 text-xs leading-5 text-muted-foreground">This conversation clears when you close or refresh the page.</p></div></aside>
      <div className="flex min-h-0 flex-col"><div className="flex items-center gap-3 border-b border-border p-4"><img src={brandMark} alt="AI Workplace assistant" width={36} height={36} className="size-9 rounded-md object-cover" /><div><p className="text-sm font-bold">Workplace Assistant</p><p className="text-xs text-muted-foreground"><span className="mr-1.5 inline-block size-1.5 rounded-full bg-primary" />Ready to help</p></div></div>
        <Conversation className="min-h-0"><ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6 sm:px-8">{messages.map((message) => <Message key={message.id} from={message.role} className={message.role === "assistant" ? "max-w-[90%]" : "max-w-[82%]"}><MessageContent className={message.role === "user" ? "bg-primary text-primary-foreground" : ""}><MessageResponse>{message.text}</MessageResponse></MessageContent>{message.role === "assistant" && <MessageActions><MessageAction tooltip="Copy response" onClick={() => { navigator.clipboard?.writeText(message.text); setCopiedId(message.id); window.setTimeout(() => setCopiedId(null), 1400); }}>{copiedId === message.id ? <Check /> : <Clipboard />}</MessageAction></MessageActions>}</Message>)}{status === "submitted" && <Message from="assistant"><MessageContent><Shimmer>Thinking through your question…</Shimmer></MessageContent></Message>}</ConversationContent><ConversationScrollButton /></Conversation>
        <div className="border-t border-border bg-card p-3 sm:p-5"><div className="mb-3 flex gap-2 overflow-x-auto xl:hidden">{suggestedPrompts.slice(0, 2).map((prompt) => <Button key={prompt} variant="outline" size="sm" className="shrink-0" onClick={() => submit(prompt)}>{prompt}</Button>)}</div><PromptInput className="mx-auto max-w-3xl bg-background" onSubmit={(message) => submit(message.text ?? "")}><PromptInputTextarea ref={inputRef} placeholder="Ask about priorities, communication, meetings…" disabled={status === "submitted"} className="min-h-20" /><PromptInputFooter className="justify-between"><span className="text-xs text-muted-foreground">Enter to send · Shift + Enter for a new line</span><PromptInputSubmit status={status} disabled={status === "submitted"} /></PromptInputFooter></PromptInput></div>
      </div>
    </div><Disclaimer /></div>;
}

function Disclaimer() { return <p className="mt-6 text-center text-[11px] leading-5 text-muted-foreground">AI responses may contain errors. Verify important information before use.</p>; }

export { WorkplaceApp };
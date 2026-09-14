import { Link } from "react-router-dom";
import { Sparkles, ShieldCheck, Workflow, Radio, ArrowRight } from "lucide-react";

import { AGENTS } from "../../lib/agents";

/* ==========================================================
   AuthShell — shared split-screen frame for login/register.
   Left: dark violet brand hero. Right: a light card.
========================================================== */

const PILLARS = [
    {
        icon: Workflow,
        title: "Six specialised agents",
        body: "CEO plans, then research, marketing, finance, coding and file generation execute in sequence.",
    },
    {
        icon: Radio,
        title: "Live, not simulated",
        body: "Every step streams back over server-sent events so you watch the company being built.",
    },
    {
        icon: ShieldCheck,
        title: "Private by default",
        body: "Projects, reports and generated files are scoped to your authenticated account.",
    },
];

const MINI_NAV = ["IDEAS", "COMPANIES", "A BRIGHTER TOMORROW"];

const TRUSTED = ["Northwind", "Vertex Labs", "Kestrel", "Orbital", "Helio Group"];

function AuthShell({ eyebrow, title, subtitle, children, footer }) {
    return (
        <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
            {/* ---------- Brand panel ---------- */}
            <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/5 bg-[var(--color-canvas)] p-12 lg:flex">
                <div
                    className="pointer-events-none absolute inset-0 opacity-70"
                    style={{
                        background:
                            "radial-gradient(40rem 30rem at 20% 15%, rgba(124,58,237,0.32), transparent 60%), radial-gradient(34rem 26rem at 80% 85%, rgba(37,99,235,0.24), transparent 60%)",
                    }}
                />

                {/* logo + mini nav + eyebrow pill */}
                <div className="relative">
                    <div className="flex flex-wrap items-center gap-5">
                        <Link to="/" className="flex items-center gap-3">
                            <span className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl shadow-lg shadow-violet-900/40">
                                <Sparkles size={19} className="text-white" />
                            </span>

                            <span className="text-lg font-bold tracking-tight text-slate-100">
                                AI Company OS
                            </span>
                        </Link>

                        <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {MINI_NAV.map((item, index) => (
                                <span key={item} className="flex items-center gap-2">
                                    {index > 0 && (
                                        <ArrowRight size={11} className="text-slate-700" />
                                    )}

                                    <span
                                        className={
                                            index === MINI_NAV.length - 1
                                                ? "text-violet-300"
                                                : undefined
                                        }
                                    >
                                        {item}
                                    </span>
                                </span>
                            ))}
                        </span>
                    </div>

                    <span className="mt-10 inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.18em] text-violet-200">
                        The future builds itself
                    </span>
                </div>

                {/* pitch */}
                <div className="relative max-w-lg">
                    <h2 className="text-4xl font-bold leading-[1.15] tracking-tight text-white">
                        Describe a startup.
                        <br />
                        <span className="gradient-text">
                            Watch an AI company build it.
                        </span>
                    </h2>

                    <p className="mt-5 text-[15px] leading-relaxed text-slate-400">
                        An autonomous graph turns one paragraph into market research, a
                        go-to-market plan, a financial model, a technical blueprint and real
                        project files.
                    </p>

                    <div className="mt-10 space-y-5">
                        {PILLARS.map((pillar) => {
                            const Icon = pillar.icon;

                            return (
                                <div key={pillar.title} className="flex items-start gap-4">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-inset ring-violet-400/25">
                                        <Icon size={17} className="text-violet-300" />
                                    </span>

                                    <div>
                                        <p className="text-sm font-semibold text-slate-200">
                                            {pillar.title}
                                        </p>

                                        <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                            {pillar.body}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>


                {/* trusted by */}
                <div className="relative">
                    <div className="mb-5 flex flex-wrap items-center gap-2">
                        {AGENTS.map((agent) => {
                            const Icon = agent.icon;

                            return (
                                <span
                                    key={agent.id}
                                    title={agent.name}
                                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-inset ring-slate-400/10"
                                >
                                    <Icon size={15} className="text-slate-400" />
                                </span>
                            );
                        })}

                        <span className="ml-2 text-xs text-slate-600">
                            autonomous company graph
                        </span>
                    </div>

                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                        Trusted by forward-thinking companies
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                        {TRUSTED.map((company) => (
                            <span
                                key={company}
                                className="text-sm font-semibold tracking-tight text-slate-600"
                            >
                                {company}
                            </span>
                        ))}
                    </div>
                </div>

            </div>

            {/* ---------- Form panel: light card ---------- */}
            <div className="flex items-center justify-center bg-[#f7f7fb] p-6 sm:p-8">
                <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl sm:p-10">
                    <Link to="/" className="mb-8 flex items-center justify-center gap-3 lg:hidden">
                        <span className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl">
                            <Sparkles size={17} className="text-white" />
                        </span>

                        <span className="font-bold text-slate-900">AI Company OS</span>
                    </Link>

                    <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-600">
                        {eyebrow}
                    </p>

                    <h1 className="mt-3 text-center text-3xl font-bold tracking-tight text-slate-900">
                        {title}
                    </h1>

                    <p className="mt-2 text-center text-sm text-slate-500">{subtitle}</p>

                    <div className="mt-8">{children}</div>

                    {footer && (
                        <div className="mt-8 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
                            {footer}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}

export default AuthShell;

import { Activity, Building2, Store } from "lucide-react";

/* ==========================================================
   Curated starter briefs. Each entry carries the full
   composer payload so "Use template" fills every field.
   Kept out of the component file so Fast Refresh works.
========================================================== */

export const TEMPLATES = [
    {
        id: "ai-health-coach",
        title: "AI Health Coach",
        icon: Activity,
        accent: "#34d399",
        blurb:
            "Adaptive training and nutrition plans built from a two-minute check-in, refreshed every week.",
        tags: ["Healthcare", "B2C"],
        idea: "An AI health coach that builds adaptive weekly training and meal plans from a two-minute user check-in.",
        industry: "Healthcare",
        projectType: "Mobile Application",
        requirements: "Apple Health sync, habit streaks, subscription paywall, coach chat.",
    },
    {
        id: "propertyscout",
        title: "PropertyScout AI",
        icon: Building2,
        accent: "#38bdf8",
        blurb:
            "Ranks rental listings against your commute, budget and lifestyle before the open house.",
        tags: ["PropTech", "Marketplace"],
        idea: "A property scouting marketplace that scores rental listings against commute, budget and lifestyle signals.",
        industry: "SaaS",
        projectType: "Web Application",
        requirements: "Map search, listing import API, saved alerts, agent inbox.",
    },
    {
        id: "localcommerce",
        title: "LocalCommerce",
        icon: Store,
        accent: "#fbbf24",
        blurb:
            "Turns a neighbourhood shop's Instagram into a checkout-ready storefront in an afternoon.",
        tags: ["E-Commerce", "SMB"],
        idea: "A tool that converts a local shop's social catalogue into a checkout-ready online storefront.",
        industry: "E-Commerce",
        projectType: "Web Application",
        requirements: "Stripe checkout, inventory CSV import, local pickup scheduling.",
    },
];

export default TEMPLATES;

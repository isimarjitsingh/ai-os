import { cn } from "../../lib/cn";

/* ==========================================================
   Ring — dependency-free progress ring / donut.

   The % label is HTML overlaid on the SVG rather than an
   SVG <text> node: rotating <text> back to upright needs
   `transform-box: fill-box` and renders inconsistently in
   Safari/Firefox. This way the label is always crisp and
   selectable.
========================================================== */

function Ring({
    value = 0,
    size = 56,
    stroke = 5,
    color = "#8b5cf6",
    track = "rgba(148, 163, 184, 0.15)",
    label,
    className,
}) {
    const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;

    return (
        <div
            className={cn(
                "relative inline-flex shrink-0 items-center justify-center",
                className
            )}
            style={{ width: size, height: size }}
            role="img"
            aria-label={`${pct} percent`}
        >
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="-rotate-90"
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={stroke}
                    fill="none"
                    stroke={track}
                />

                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={stroke}
                    fill="none"
                    stroke={color}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 0.7s ease" }}
                />
            </svg>

            <span
                className="absolute inset-0 flex items-center justify-center font-bold tabular-nums text-white"
                style={{ fontSize: Math.max(10, Math.round(size * 0.2)) }}
            >
                {label ?? `${pct}%`}
            </span>
        </div>
    );
}

export default Ring;

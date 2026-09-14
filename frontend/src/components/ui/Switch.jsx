import { cn } from "../../lib/cn";

/* ==========================================================
   Switch — the pill toggle shared by Generate "Advanced
   Options" and Settings preference rows.
========================================================== */

function Switch({ checked = false, onChange, label, id, className }) {
    return (
        <button
            type="button"
            role="switch"
            id={id}
            aria-checked={checked}
            aria-label={label}
            data-on={checked ? "true" : "false"}
            onClick={() => onChange?.(!checked)}
            className={cn("switch", className)}
        >
            <span />
        </button>
    );
}

export default Switch;

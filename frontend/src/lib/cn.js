/* Tiny className joiner — avoids adding a dependency. */
export function cn(...parts) {
    return parts
        .flat()
        .filter((part) => part !== null && part !== undefined && part !== false && part !== "")
        .join(" ")
        .trim();
}

export default cn;

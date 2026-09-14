import { useCallback, useEffect, useState } from "react";
import { getProjects } from "../services/api";

/* ==========================================================
   useProjects — shared loader for Dashboard + Projects.

   Returns the raw array straight from GET /projects plus
   loading / error / reload, so both pages stay honest about
   real data instead of hardcoded numbers.
========================================================== */

export function useProjects(options = {}) {
    const { enabled = true } = options;

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState(null);
    const [nonce, setNonce] = useState(0);

    /*
     * State updates happen inside the promise callbacks rather than
     * synchronously in the effect body — this is the subscription
     * shape React recommends and avoids a cascading render.
     */
    useEffect(() => {
        if (!enabled) return undefined;

        let alive = true;

        getProjects()
            .then((data) => {
                if (!alive) return;

                setProjects(Array.isArray(data) ? data : []);
                setError(null);
            })
            .catch((err) => {
                if (!alive) return;

                setError(err.message || "Unable to load projects");
            })
            .finally(() => {
                if (alive) setLoading(false);
            });

        return () => {
            alive = false;
        };
    }, [enabled, nonce]);

    const reload = useCallback(() => {
        setLoading(true);
        setNonce((value) => value + 1);
    }, []);

    return { projects, loading, error, reload };
}

export default useProjects;

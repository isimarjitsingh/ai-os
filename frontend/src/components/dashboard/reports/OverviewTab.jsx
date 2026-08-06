export default function OverviewTab({
    project,
    ceo,
    finance,
    coding,
}) {
    return (
        <div>

            <h2>{project.project_name}</h2>

            <p>{project.startup_idea}</p>

            <p>Status: {project.status}</p>

            <hr />

            <h3>Executive Summary</h3>

            <p>{ceo?.executive_summary}</p>

            <h3>Business Viability</h3>

            <p>{ceo?.business_viability}</p>

            <h3>Target Market</h3>

            <p>{ceo?.target_market}</p>

            <h3>Estimated Budget</h3>

            <p>{ceo?.estimated_budget}</p>

            <h3>Break Even</h3>

            <p>{finance?.break_even_estimate}</p>

            <h3>Tech Stack</h3>

            <pre>{coding?.tech_stack}</pre>

        </div>
    );
}
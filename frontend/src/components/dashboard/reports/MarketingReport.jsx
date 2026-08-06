function MarketingReport({ report }) {

    if (!report) {
        return <div>No Marketing Report Available</div>;
    }

    return (

        <div className="space-y-6">

            <div>
                <h2 className="font-bold text-xl">
                    Marketing Summary
                </h2>

                <p>{report.marketing_summary}</p>
            </div>

            <div>
                <h2 className="font-bold text-xl">
                    Positioning
                </h2>

                <p>{report.positioning}</p>
            </div>

            <div>
                <h2 className="font-bold text-xl">
                    Launch Strategy
                </h2>

                <pre>{report.launch_strategy}</pre>
            </div>

            <div>
                <h2 className="font-bold text-xl">
                    KPIs
                </h2>

                <pre>{report.kpis}</pre>
            </div>

        </div>

    );

}

export default MarketingReport;
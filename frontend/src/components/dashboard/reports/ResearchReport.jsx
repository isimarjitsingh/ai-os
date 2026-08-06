function ResearchReport({ report }) {

    if (!report) {
        return (
            <div className="p-6">
                No Research Report Available
            </div>
        );
    }

    return (

        <div className="space-y-6">

            <div>
                <h2 className="font-bold text-xl">
                    Market Overview
                </h2>

                <p className="mt-2 text-gray-700">
                    {report.market_overview}
                </p>
            </div>

            <div>
                <h2 className="font-bold text-xl">
                    Target Audience
                </h2>

                <pre className="whitespace-pre-wrap">
                    {report.target_audience}
                </pre>
            </div>

            <div>
                <h2 className="font-bold text-xl">
                    Competitors
                </h2>

                <pre className="whitespace-pre-wrap">
                    {report.competitors}
                </pre>
            </div>

            <div>
                <h2 className="font-bold text-xl">
                    Opportunities
                </h2>

                <pre className="whitespace-pre-wrap">
                    {report.opportunities}
                </pre>
            </div>

            <div>
                <h2 className="font-bold text-xl">
                    Risks
                </h2>

                <pre className="whitespace-pre-wrap">
                    {report.risks}
                </pre>
            </div>

        </div>

    );

}

export default ResearchReport;
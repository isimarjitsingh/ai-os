function CEOReport({ report }) {

    if (!report) {
        return <div>No CEO Report Available</div>;
    }

    return (

        <div className="space-y-6">

            <div>
                <h2 className="font-bold text-xl">
                    Executive Summary
                </h2>

                <p>{report.executive_summary}</p>
            </div>

            <div>
                <h2 className="font-bold text-xl">
                    Business Viability
                </h2>

                <p>{report.business_viability}</p>
            </div>

            <div>
                <h2 className="font-bold text-xl">
                    Target Market
                </h2>

                <p>{report.target_market}</p>
            </div>

        </div>

    );

}

export default CEOReport;
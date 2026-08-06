function FinanceReport({ report }) {

    if (!report) {
        return <div>No Finance Report Available</div>;
    }

    return (

        <div className="space-y-4">

            <div>
                <strong>Startup Cost:</strong>
                <p>${report.startup_cost}</p>
            </div>

            <div>
                <strong>Monthly Cost:</strong>
                <p>${report.monthly_cost}</p>
            </div>

            <div>
                <strong>Pricing Strategy:</strong>
                <p>{report.pricing_strategy}</p>
            </div>

            <div>
                <strong>Break Even:</strong>
                <p>{report.break_even_estimate}</p>
            </div>

        </div>

    );

}

export default FinanceReport;
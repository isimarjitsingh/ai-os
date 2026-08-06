function CodingReport({ report }) {

    if (!report) {
        return <div>No Coding Report Available</div>;
    }

    return (

        <div className="space-y-6">

            <div>
                <strong>Project Name:</strong>
                <p>{report.project_name}</p>
            </div>

            <div>
                <strong>Tech Stack:</strong>
                <pre>{report.tech_stack}</pre>
            </div>

            <div>
                <strong>Architecture:</strong>
                <pre>{report.architecture}</pre>
            </div>

            <div>
                <strong>Core Features:</strong>
                <pre>{report.core_features}</pre>
            </div>

        </div>

    );

}

export default CodingReport;
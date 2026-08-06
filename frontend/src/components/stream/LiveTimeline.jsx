function LiveTimeline({

    events = []

}) {

    return (

        <div className="space-y-6">

            <ActivityFeed

                events={events}

            />

        </div>

    );

}

export default LiveTimeline;
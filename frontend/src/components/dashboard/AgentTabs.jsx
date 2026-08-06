function AgentTabs({ activeTab, setActiveTab }) {
    const tabs = [
        "overview",
        "research",
        "marketing",
        "finance",
        "ceo",
        "coding",
        "files",
    ];

    return (
        <div className="flex gap-2 border-b pb-3">
            {tabs.map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-xl px-5 py-2 font-medium transition
                        ${
                            activeTab === tab
                                ? "bg-violet-600 text-white"
                                : "bg-slate-100 hover:bg-slate-200"
                        }`}
                >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
            ))}
        </div>
    );
}

export default AgentTabs;
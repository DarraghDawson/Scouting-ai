import React, { useState } from "react";

export default function PlayerReport() {
  const [playerName, setPlayerName] = useState("");
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setReport("");
    const res = await fetch("/api/generateReport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName }),
    });
    const data = await res.json();
    if (data.report) setReport(data.report);
    else setReport("Failed to get report.");
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">AI Player Scouting Report</h1>
      <input
        type="text"
        placeholder="Enter player name"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        className="w-full p-2 border rounded mb-4"
      />
      <button
        onClick={handleGenerate}
        disabled={loading || !playerName.trim()}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Generating..." : "Generate Report"}
      </button>
      {report && (
        <pre className="mt-6 p-4 bg-gray-100 whitespace-pre-wrap rounded">{report}</pre>
      )}
    </div>
  );
}

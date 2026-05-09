import React from "react";

export default function RealEstateDealScorer() {
  const [url, setUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [result, setResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const analyzeDeal = async () => {
    setLoading(true);
    setResult(null);

    let text = description;

    // STEP 1: Try to fetch content from URL (instant parsing)
    if (url) {
      try {
        const response = await fetch(
          "https://r.jina.ai/http://" + url.replace(/^https?:\/\//, "")
        );

        text = await response.text();
      } catch (err) {
        text = description; // fallback if fetch fails
      }
    }

    text = text.toLowerCase();

    let pricing = 10;
    let valueAdd = 5;
    let vacancy = 0;
    let distress = 0;
    let location = 5;
    let risk = 0;

    // Vacancy / upside detection
    if (
      text.includes("vacant") ||
      text.includes("occupancy available") ||
      text.includes("double occupancy") ||
      text.includes("triple occupancy")
    ) {
      vacancy += 10;
      valueAdd += 5;
    }

    // Distress keywords
    const distressKeywords = [
      "estate sale",
      "succession",
      "needs tlc",
      "handyman",
      "motivated seller",
      "reduced price",
      "original condition",
      "needs updating",
      "sold as-is"
    ];

    distressKeywords.forEach((word) => {
      if (text.includes(word)) distress += 3;
    });

    // Value-add keywords
    const valueKeywords = [
      "under market rent",
      "renovation",
      "updating",
      "cosmetic",
      "value-add",
      "potential",
      "investor"
    ];

    valueKeywords.forEach((word) => {
      if (text.includes(word)) valueAdd += 2;
    });

    // Risk keywords
    const riskKeywords = [
      "foundation",
      "structural",
      "contamination",
      "mold",
      "water damage",
      "legal issue",
      "pyrite"
    ];

    riskKeywords.forEach((word) => {
      if (text.includes(word)) risk -= 4;
    });

    // Strong Montreal areas
    const strongAreas = [
      "verdun",
      "plateau",
      "rosemont",
      "hochelaga",
      "ndg",
      "ahuntsic",
      "villeray",
      "lachine"
    ];

    strongAreas.forEach((area) => {
      if (text.includes(area)) location = 10;
    });

    // Fully rented penalty
    if (text.includes("fully rented") || text.includes("entièrement loué")) {
      vacancy = 0;
      valueAdd -= 2;
    }

    const total = pricing + valueAdd + vacancy + distress + location + risk;

    let recommendation = "PASS";
    let recommendationColor = "text-red-600";

    if (total >= 80) {
      recommendation = "HIGH PRIORITY";
      recommendationColor = "text-green-600";
    } else if (total >= 65) {
      recommendation = "WORTH DEEP ANALYSIS";
      recommendationColor = "text-yellow-600";
    } else if (total >= 50) {
      recommendation = "POSSIBLE BUT THIN";
      recommendationColor = "text-orange-600";
    }

    setResult({
      total,
      recommendation,
      pricing,
      valueAdd,
      vacancy,
      distress,
      location,
      risk
    });

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-8 space-y-6">
        <h1 className="text-4xl font-bold">
          Real Estate Deal Scorer
        </h1>

        <input
          className="w-full border p-4 rounded-2xl"
          placeholder="Paste listing URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <textarea
          className="w-full border p-4 rounded-2xl"
          rows={8}
          placeholder="OR paste description here"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button
          onClick={analyzeDeal}
          className="bg-black text-white px-6 py-3 rounded-2xl"
        >
          {loading ? "Analyzing..." : "Analyze Deal"}
        </button>

        {result && (
          <div className="mt-6 space-y-4">
            <h2 className="text-3xl font-bold">
              Score: {result.total}
            </h2>

            <h3 className={result.recommendationColor + " text-xl font-semibold"}>
              {result.recommendation}
            </h3>

            <div className="text-sm text-gray-600 space-y-1">
              <p>Value-add: {result.valueAdd}</p>
              <p>Distress: {result.distress}</p>
              <p>Location: {result.location}</p>
              <p>Risk: {result.risk}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

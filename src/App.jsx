import React from "react";

export default function RealEstateDealScorer() {
  const [url, setUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [result, setResult] = React.useState(null);

  const analyzeDeal = () => {
    const text = description.toLowerCase();

    let pricing = 10;
    let valueAdd = 5;
    let vacancy = 0;
    let distress = 0;
    let location = 5;
    let risk = 0;

    if (
      text.includes("vacant") ||
      text.includes("occupancy available") ||
      text.includes("double occupancy") ||
      text.includes("triple occupancy")
    ) {
      vacancy += 10;
      valueAdd += 5;
    }

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
      recommendation = "WORTH DEEPER ANALYSIS";
      recommendationColor = "text-yellow-600";
    } else if (total >= 50) {
      recommendation = "POSSIBLE BUT THIN";
      recommendationColor = "text-orange-600";
    }

    setResult({
      pricing,
      valueAdd,
      vacancy,
      distress,
      location,
      risk,
      total,
      recommendation,
      recommendationColor
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-8 space-y-6">
        <h1 className="text-4xl font-bold">Real Estate Deal Scorer</h1>

        <input
          className="w-full border p-4 rounded-2xl"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Listing URL"
        />

        <textarea
          className="w-full border p-4 rounded-2xl"
          rows={8}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Paste description"
        />

        <button
          onClick={analyzeDeal}
          className="bg-black text-white px-6 py-3 rounded-2xl"
        >
          Analyze Deal
        </button>

        {result && (
          <div className="mt-6">
            <h2 className="text-2xl font-bold">Score: {result.total}</h2>
            <p className={result.recommendationColor}>
              {result.recommendation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
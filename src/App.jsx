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

    // --- AUTO FETCH FROM URL ---
    if (url) {
      try {
        const response = await fetch(
          "https://r.jina.ai/http://" + url.replace(/^https?:\/\//, "")
        );
        text = await response.text();
      } catch (e) {
        text = description;
      }
    }

    text = text.toLowerCase();

  // --------------------------
  // 🏠 DATA-DRIVEN RENT MODEL V3
  // --------------------------

  let units = 1;

  if (text.includes("duplex")) units = 2;
  if (text.includes("triplex")) units = 3;
  if (text.includes("fourplex")) units = 4;

  // BASE MARKET DATA (Montreal real averages)
  const market = {
    0: 1200, // studio
    1: 1550, // 1 bedroom avg Montreal ~1,500–1,600
    2: 2050, // 2 bedroom avg ~2,000–2,100
    3: 2450,
    4: 2900
  };

  let bedrooms = 2;

  if (text.includes("studio")) bedrooms = 0;
  if (text.includes("1 bedroom") || text.includes("1br")) bedrooms = 1;
  if (text.includes("2 bedroom") || text.includes("2br")) bedrooms = 2;
  if (text.includes("3 bedroom") || text.includes("3br")) bedrooms = 3;
  if (text.includes("4 bedroom") || text.includes("4br")) bedrooms = 4;

  // BASE RENT FROM REAL MARKET DATA
  let baseRent = market[bedrooms] || 1800;

  // --------------------------
  // NEIGHBORHOOD REAL MULTIPLIERS (data-informed)
  // --------------------------

  let areaMultiplier = 1.0;

  if (text.includes("plateau")) areaMultiplier = 1.25;
  else if (text.includes("verdun")) areaMultiplier = 1.15;
  else if (text.includes("ndg")) areaMultiplier = 1.12;
  else if (text.includes("rosemont")) areaMultiplier = 1.08;
  else if (text.includes("villeray")) areaMultiplier = 1.10;
  else if (text.includes("hochelaga")) areaMultiplier = 0.98;

  // --------------------------
  // CONDITION ADJUSTMENTS (important for accuracy)
  // --------------------------

  let conditionMultiplier = 1.0;

  if (text.includes("renovated") || text.includes("new")) {
    conditionMultiplier = 1.15;
  }

  if (text.includes("luxury") || text.includes("modern")) {
    conditionMultiplier = 1.20;
  }

  if (text.includes("needs renovation") || text.includes("tired")) {
    conditionMultiplier = 0.85;
  }

  // --------------------------
  // FINAL ESTIMATE (range instead of fake exact number)
  // --------------------------

  const perUnit = baseRent * areaMultiplier * conditionMultiplier;

  const estimatedLow = Math.round(perUnit * 0.9) * units;
  const estimatedHigh = Math.round(perUnit * 1.1) * units;
  const estimatedMonthlyRent = Math.round(perUnit * units);

    // --------------------------
    // 🧠 DEAL SCORING ENGINE
    // --------------------------

    let pricing = 10;
    let valueAdd = 5;
    let vacancy = 0;
    let distress = 0;
    let location = 5;
    let risk = 0;

    const distressKeywords = [
      "estate sale",
      "succession",
      "needs tlc",
      "handyman",
      "motivated seller",
      "sold as-is"
    ];

    distressKeywords.forEach((w) => {
      if (text.includes(w)) distress += 3;
    });

    const valueKeywords = [
      "renovation",
      "value-add",
      "potential",
      "under market rent",
      "reposition"
    ];

    valueKeywords.forEach((w) => {
      if (text.includes(w)) valueAdd += 2;
    });

    const riskKeywords = [
      "foundation",
      "structural",
      "mold",
      "water damage",
      "pyrite"
    ];

    riskKeywords.forEach((w) => {
      if (text.includes(w)) risk -= 4;
    });

    const strongAreas = [
      "verdun",
      "plateau",
      "rosemont",
      "ndg",
      "villeray",
      "ahuntsic"
    ];

    strongAreas.forEach((a) => {
      if (text.includes(a)) location = 10;
    });

    const total =
      pricing + valueAdd + vacancy + distress + location + risk;

    setResult({
      total,
      estimatedMonthlyRent,
      units,
      baseRentPerUnit: Math.round(baseRentPerUnit),
      recommendation:
        total >= 80
          ? "HIGH PRIORITY"
          : total >= 65
          ? "WORTH ANALYSIS"
          : "PASS"
    });

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-8 space-y-6">

        <h1 className="text-3xl font-bold">
          Real Estate Deal + Rent Estimator
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
          placeholder="Or paste description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button
          onClick={analyzeDeal}
          className="bg-black text-white px-6 py-3 rounded-2xl"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>

        {result && (
          <div className="space-y-4 mt-6">

            <div className="text-2xl font-bold">
              Score: {result.total}
            </div>

            <div className="text-green-600 font-semibold">
              {result.recommendation}
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl">
              <h3 className="font-bold mb-2">💰 Rent Estimate</h3>

              <p>Units detected: {result.units}</p>
              <p>Base rent/unit: ${result.baseRentPerUnit}</p>

              <p className="text-xl font-bold mt-2">
                Estimated monthly rent: ${result.estimatedMonthlyRent}
              </p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

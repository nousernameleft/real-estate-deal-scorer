import React from "react";

export default function RealEstateDealScorer() {
  const [url, setUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [result, setResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const analyzeDeal = async () => {
    try {
      setLoading(true);
      setResult(null);

      let text = description || "";

      // -----------------------------
      // 🌐 SAFE URL PARSING (optional)
      // -----------------------------
      if (url) {
        try {
          const response = await fetch(
            "https://r.jina.ai/http://" + url.replace(/^https?:\/\//, "")
          );

          if (response.ok) {
            text = await response.text();
          }
        } catch (err) {
          console.log("URL fetch failed, using manual text instead.");
        }
      }

      text = text.toLowerCase();

      // -----------------------------
      // 🧠 DEAL SCORING ENGINE
      // -----------------------------
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
        "sold as-is",
        "motivated seller",
        "reduced price"
      ];

      distressKeywords.forEach((w) => {
        if (text.includes(w)) distress += 3;
      });

      const valueKeywords = [
        "renovation",
        "value-add",
        "potential",
        "investor",
        "under market rent"
      ];

      valueKeywords.forEach((w) => {
        if (text.includes(w)) valueAdd += 2;
      });

      const riskKeywords = [
        "foundation",
        "structural",
        "mold",
        "water damage",
        "pyrite",
        "legal issue"
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

      if (text.includes("fully rented") || text.includes("entièrement loué")) {
        vacancy = 0;
        valueAdd -= 2;
      }

      const total =
        pricing + valueAdd + vacancy + distress + location + risk;

      // -----------------------------
      // 🏠 RENT ESTIMATION ENGINE
      // -----------------------------
      let units = text.includes("triplex")
        ? 3
        : text.includes("duplex")
        ? 2
        : 1;

      let baseRent = 1500;

      if (text.includes("studio")) baseRent = 1200;
      if (text.includes("1 bedroom")) baseRent = 1400;
      if (text.includes("2 bedroom")) baseRent = 1800;
      if (text.includes("3 bedroom")) baseRent = 2200;

      let areaMultiplier = 1.0;

      if (text.includes("plateau")) areaMultiplier = 1.3;
      else if (text.includes("verdun")) areaMultiplier = 1.2;
      else if (text.includes("ndg")) areaMultiplier = 1.15;
      else if (text.includes("rosemont")) areaMultiplier = 1.1;
      else if (text.includes("villeray")) areaMultiplier = 1.12;
      else if (text.includes("hochelaga")) areaMultiplier = 0.98;

      const perUnit = baseRent * areaMultiplier;

      const estimatedLow = Math.round(perUnit * 0.9) * units;
      const estimatedHigh = Math.round(perUnit * 1.1) * units;

      // -----------------------------
      // 📊 FINAL OUTPUT
      // -----------------------------
      setResult({
        total,
        estimatedLow,
        estimatedHigh,
        units,
        recommendation:
          total >= 80
            ? "HIGH PRIORITY"
            : total >= 65
            ? "WORTH ANALYSIS"
            : "PASS"
      });

    } catch (err) {
      console.error(err);

      setResult({
        total: 0,
        estimatedLow: 0,
        estimatedHigh: 0,
        units: 0,
        recommendation: "ERROR - CHECK CONSOLE"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-8 space-y-6">

        <h1 className="text-3xl font-bold">
          Real Estate Deal Scorer + Rent Estimator
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
          <div className="mt-6 space-y-4">

            <div className="text-2xl font-bold">
              Score: {result.total}
            </div>

            <div className="text-green-600 font-semibold">
              {result.recommendation}
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl">
              <h3 className="font-bold mb-2">💰 Rent Estimate</h3>

              <p>Units detected: {result.units}</p>

              <p className="text-lg font-semibold mt-2">
                ${result.estimatedLow} – ${result.estimatedHigh} / month
              </p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

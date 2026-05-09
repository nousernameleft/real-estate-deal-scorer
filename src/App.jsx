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
      // 🌐 SAFE URL SCRAPER
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
          console.log("URL fetch failed → fallback to manual input");
        }
      }

      const originalText = text; // for debugging
      text = text.toLowerCase();

      // -----------------------------
      // 💵 ASKING PRICE (ROBUST + FRENCH FORMAT SUPPORT)
      // -----------------------------

      let askingPrice = 0;
      let taxesNote = "";

      // detect tax note
      if (text.includes("tps/tvq") || text.includes("+ taxes") || text.includes("+taxes")) {
        taxesNote = "⚠️ Taxes (TPS/TVQ) may apply";
      }

      // remove spaces from numbers like "1 229 000"
      const normalizedText = text.replace(/\s/g, "");

      // match formats like 1229000$ or 1,229,000$ or 1.229.000$
      let match =
        normalizedText.match(/([0-9]{1,3}(?:[.,]?[0-9]{3})+)\$/) ||
        normalizedText.match(/([0-9]{6,9})\$/);

      if (!match) {
        match = text.match(/(?:price|asking)[^\d]{0,10}([0-9\s,\.]{6,12})/i);
      }

      if (!match) {
        match = text.match(/([0-9]{6,9})/);
      }

      if (match) {
        askingPrice = parseInt(
          match[1].replace(/[^\d]/g, "")
        );
      }

      // -----------------------------
      // 🏠 ARV (After Repair Value)
      // -----------------------------
      let baseValue = 300000;
      let baseValueUsed = baseValue;

      if (text.includes("duplex")) baseValue = 550000;
      if (text.includes("triplex")) baseValue = 750000;
      if (text.includes("fourplex")) baseValue = 900000;

      let propertyTypeNote = "single-family baseline";

      if (text.includes("duplex")) propertyTypeNote = "duplex baseline";
      if (text.includes("triplex")) propertyTypeNote = "triplex baseline";
      if (text.includes("fourplex")) propertyTypeNote = "fourplex baseline";

      // neighborhood multiplier
      let locationMultiplier = 1.0;
      let locationNote = "neutral area";

      if (text.includes("plateau")) {
        locationMultiplier = 1.4;
        locationNote = "Plateau premium area";
      } else if (text.includes("verdun")) {
        locationMultiplier = 1.25;
        locationNote = "Verdun strong demand area";
      } else if (text.includes("ndg")) {
        locationMultiplier = 1.2;
        locationNote = "NDG stable area";
      } else if (text.includes("rosemont")) {
        locationMultiplier = 1.15;
        locationNote = "Rosemont growing area";
      } else if (text.includes("hochelaga")) {
        locationMultiplier = 0.95;
        locationNote = "lower baseline area";
      }

      // condition multiplier
      let conditionMultiplier = 1.0;
      let conditionNote = "standard condition";

      if (text.includes("renovated") || text.includes("fully renovated")) {
        conditionMultiplier = 1.1;
        conditionNote = "renovated premium";
      }

      if (text.includes("needs renovation") || text.includes("as-is")) {
        conditionMultiplier = 0.85;
        conditionNote = "renovation required discount";
      }

      const ARV = Math.round(
        baseValue * locationMultiplier * conditionMultiplier
      );

      // -----------------------------
      // 💰 MAO (Maximum Allowable Offer)
      // -----------------------------
      const rehabEstimate = 50000;
      const MAO = Math.round(ARV * 0.7 - rehabEstimate);

      // -----------------------------
      // 📊 SPREAD
      // -----------------------------
      const spread = ARV - askingPrice;
      const spreadPercent = askingPrice
        ? Math.round((spread / ARV) * 100)
        : 0;

      // -----------------------------
      // ⚠️ RISK FLAGS
      // -----------------------------
      let riskFlags = [];

      if (text.includes("structural")) riskFlags.push("Structural issue");
      if (text.includes("foundation")) riskFlags.push("Foundation risk");
      if (text.includes("mold")) riskFlags.push("Mold risk");
      if (text.includes("water damage")) riskFlags.push("Water damage");
      if (text.includes("tenanted")) riskFlags.push("Tenant complexity");

      // -----------------------------
      // 🧠 SCORE (0–100)
      // -----------------------------
      let score = 50;

      if (spreadPercent >= 25) score += 30;
      else if (spreadPercent >= 15) score += 20;
      else if (spreadPercent >= 5) score += 10;
      else score -= 15;

      score -= riskFlags.length * 5;

      if (askingPrice > ARV) score -= 20;

      score = Math.max(0, Math.min(100, score));

      // -----------------------------
      // 🟢 DEAL TYPE
      // -----------------------------
      let dealType = "NO DEAL 🔴";

      if (spreadPercent >= 25) dealType = "STRONG ASSIGNMENT DEAL 🟢";
      else if (spreadPercent >= 15) dealType = "POSSIBLE ASSIGNMENT 🟡";
      else if (spreadPercent >= 5) dealType = "TIGHT DEAL 🟠";

      // -----------------------------
      // 📦 OUTPUT
      // -----------------------------
      setResult({
        ARV,
        MAO,
        askingPrice,
        taxesNote,
        spread: Math.round(spread),
        spreadPercent,
        dealType,
        riskFlags,
        score: Math.round(score),

        breakdown: {
          baseValueUsed,
          propertyTypeNote,
          locationNote,
          locationMultiplier,
          conditionNote,
          conditionMultiplier,
          rehabEstimate,
          ARV_final: ARV,
          MAO_formula: "ARV × 70% − rehab ($50,000)",
          spread_formula: "ARV − Asking Price",
          score_inputs: {
            spreadPercent,
            riskCount: riskFlags.length,
            ARV_vs_price: askingPrice > ARV ? "overpriced" : "ok"
          }
        }
      });

    } catch (err) {
      console.error(err);

      setResult({
        ARV: 0,
        MAO: 0,
        askingPrice: 0,
        taxesNote: "",
        spread: 0,
        spreadPercent: 0,
        dealType: "ERROR",
        riskFlags: ["System error"],
        score: 0,
        breakdown: {}
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-8 space-y-6">

        <h1 className="text-3xl font-bold">
          🏠 Wholesale Deal Analyzer
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
          placeholder="Paste listing description"
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

            <div className="text-2xl font-bold">
              {result.dealType}
            </div>

            <div className="text-xl font-semibold">
              Score: {result.score}/100
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl space-y-1">

              <p><b>ARV (After Repair Value):</b> ${result.ARV}</p>
              <p><b>MAO (Maximum Allowable Offer):</b> ${result.MAO}</p>
              <p><b>Asking Price:</b> ${result.askingPrice}</p>

              {result.taxesNote && (
                <p className="text-orange-600">{result.taxesNote}</p>
              )}

              <p className="text-lg font-semibold mt-2">
                Spread: ${result.spread} ({result.spreadPercent}%)
              </p>

            </div>

            {result.riskFlags.length > 0 && (
              <div className="text-red-600">
                ⚠️ Risks: {result.riskFlags.join(", ")}
              </div>
            )}

            {/* 🧠 FULL BREAKDOWN */}
            <div className="bg-blue-50 p-4 rounded-2xl text-sm space-y-1">
              <h3 className="font-bold mb-2">🧠 Calculation Breakdown</h3>

              <p><b>Base Value:</b> ${result.breakdown.baseValueUsed}</p>
              <p><b>Property Type:</b> {result.breakdown.propertyTypeNote}</p>
              <p><b>Location Adjustment:</b> {result.breakdown.locationNote} (x{result.breakdown.locationMultiplier})</p>
              <p><b>Condition:</b> {result.breakdown.conditionNote}</p>
              <p><b>Rehab Estimate:</b> ${result.breakdown.rehabEstimate}</p>

              <p className="mt-2"><b>MAO Formula:</b> {result.breakdown.MAO_formula}</p>
              <p><b>Spread Formula:</b> {result.breakdown.spread_formula}</p>

              <p className="mt-2">
                <b>Score Inputs:</b> Spread {result.breakdown.score_inputs?.spreadPercent}%, Risk {result.breakdown.score_inputs?.riskCount}, ARV check {result.breakdown.score_inputs?.ARV_vs_price}
              </p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

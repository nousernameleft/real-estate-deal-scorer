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
      // 🌐 SAFE URL SCRAPER (no freeze risk)
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
          console.log("URL fetch failed → using manual input");
        }
      }

      text = text.toLowerCase();

      // -----------------------------
      // 🏠 ARV (After Repair Value)
      // -----------------------------
      let baseValue = 300000;

      if (text.includes("duplex")) baseValue = 550000;
      if (text.includes("triplex")) baseValue = 750000;
      if (text.includes("fourplex")) baseValue = 900000;

      // neighborhood adjustments
      if (text.includes("plateau")) baseValue *= 1.4;
      else if (text.includes("verdun")) baseValue *= 1.25;
      else if (text.includes("ndg")) baseValue *= 1.2;
      else if (text.includes("rosemont")) baseValue *= 1.15;
      else if (text.includes("hochelaga")) baseValue *= 0.95;

      // condition adjustments
      if (text.includes("renovated") || text.includes("fully renovated")) {
        baseValue *= 1.1;
      }

      if (text.includes("needs renovation") || text.includes("as-is")) {
        baseValue *= 0.85;
      }

      const ARV = Math.round(baseValue);

      // -----------------------------
      // 💰 MAO (Maximum Allowable Offer)
      // -----------------------------
      const rehabEstimate = 50000;
      const MAO = Math.round(ARV * 0.7 - rehabEstimate);

      // -----------------------------
      // 💵 ASKING PRICE (FIXED - robust parsing)
      // -----------------------------
      let askingPrice = 0;

      let match = text.match(/\$[\s]*([0-9][0-9,\.]+)/);

      if (!match) {
        match = text.match(/(?:price|asking)[^\d]{0,10}([0-9]{5,7})/);
      }

      if (!match) {
        match = text.match(/([0-9]{5,7})/);
      }

      if (match) {
        askingPrice = parseInt(match[1].replace(/,/g, ""));
      }

      // -----------------------------
      // 📊 SPREAD CALCULATION
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
      // 🧠 DEAL SCORE (0–100)
      // -----------------------------
      let score = 50;

      if (spreadPercent >= 25) score += 30;
      else if (spreadPercent >= 15) score += 20;
      else if (spreadPercent >= 5) score += 10;
      else score -= 15;

      score -= (riskFlags.length || 0) * 5;

      if (askingPrice > ARV) score -= 20;

      score = Math.max(0, Math.min(100, score));

      // -----------------------------
      // 🟢 DEAL TYPE CLASSIFICATION
      // -----------------------------
      let dealType = "NO DEAL 🔴";

      if (spreadPercent >= 25) dealType = "STRONG ASSIGNMENT DEAL 🟢";
      else if (spreadPercent >= 15) dealType = "POSSIBLE ASSIGNMENT 🟡";
      else if (spreadPercent >= 5) dealType = "TIGHT DEAL 🟠";

      // -----------------------------
      // 📦 FINAL OUTPUT
      // -----------------------------
      setResult({
        ARV: Math.round(ARV),
        MAO,
        askingPrice,
        spread: Math.round(spread),
        spreadPercent,
        dealType,
        riskFlags,
        score: Math.round(score),

        reasoning: {
          arvLogic: "Based on property type + neighborhood + condition adjustments",
          maoLogic: "70% of ARV minus fixed rehab estimate",
          spreadLogic: "ARV minus asking price = assignment potential",
          scoreLogic: "Weighted spread strength minus risk penalties"
        }
      });

    } catch (err) {
      console.error(err);

      setResult({
        ARV: 0,
        MAO: 0,
        askingPrice: 0,
        spread: 0,
        spreadPercent: 0,
        dealType: "ERROR",
        riskFlags: ["System error"],
        score: 0,
        reasoning: {
          arvLogic: "Error",
          maoLogic: "Error",
          spreadLogic: "Error",
          scoreLogic: "Error"
        }
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

        <p className="text-gray-600">
          ARV • MAO • Spread • Score • Assignment Detection
        </p>

        <input
          className="w-full border p-4 rounded-2xl"
          placeholder="Paste listing URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <textarea
          className="w-full border p-4 rounded-2xl"
          rows={8}
          placeholder="Or paste listing description"
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

              <p><b>ARV:</b> ${result.ARV}</p>
              <p><b>Asking Price:</b> ${result.askingPrice}</p>
              <p><b>MAO:</b> ${result.MAO}</p>

              <p className="text-lg font-semibold mt-2">
                Spread: ${result.spread} ({result.spreadPercent}%)
              </p>

            </div>

            {result.riskFlags.length > 0 && (
              <div className="text-red-600">
                ⚠️ Risks: {result.riskFlags.join(", ")}
              </div>
            )}

            {/* 🧠 REASONING SECTION */}
            <div className="bg-blue-50 p-4 rounded-2xl mt-4">
              <h3 className="font-bold mb-2">🧠 How this was calculated</h3>

              <p><b>ARV:</b> {result.reasoning.arvLogic}</p>
              <p><b>MAO:</b> {result.reasoning.maoLogic}</p>
              <p><b>Spread:</b> {result.reasoning.spreadLogic}</p>
              <p><b>Score:</b> {result.reasoning.scoreLogic}</p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

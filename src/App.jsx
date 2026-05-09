import React from "react";

export default function RealEstateDealScorer() {
  const [url, setUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [result, setResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const formatMoney = (num) => {
    if (!num && num !== 0) return "$0";
    return "$" + num.toLocaleString("en-US");
  };

  const extractUnits = (text) => {
    let units = 0;

    const patterns = [
      /([0-9]+)\s*unit[s]?/g,
      /([0-9]+)\s*unités/g,
      /([0-9]+)\s*logements/g,
      /([0-9]+)\s*apartments?/g
    ];

    patterns.forEach((regex) => {
      const match = text.match(regex);
      if (match) {
        const num = parseInt(match[1]);
        if (num > units) units = num;
      }
    });

    let res = 0;
    let com = 0;

    const resMatch = text.match(/([0-9]+)\s*(unités résidentielles|résidentiel|residential)/);
    const comMatch = text.match(/([0-9]+)\s*(unités commerciales|commercial|commerce)/);

    if (resMatch) res = parseInt(resMatch[1]);
    if (comMatch) com = parseInt(comMatch[1]);

    if (res + com > units) units = res + com;

    return units || 1;
  };

  const analyzeDeal = async () => {
    try {
      setLoading(true);
      setResult(null);

      let text = description || "";

      if (url) {
        try {
          const response = await fetch(
            "https://r.jina.ai/http://" + url.replace(/^https?:\/\//, "")
          );
          if (response.ok) text = await response.text();
        } catch {}
      }

      text = text.toLowerCase();

      // -----------------------------
      // 🏠 UNITS
      // -----------------------------
      const units = extractUnits(text);

      const basePerUnit = {
        1: 320000,
        2: 260000,
        3: 240000,
        4: 220000,
        5: 210000,
        6: 200000,
        7: 195000,
        8: 190000
      };

      const perUnit = basePerUnit[Math.min(units, 8)] || 180000;

      const baseValue = units * perUnit;

      // -----------------------------
      // 📍 LOCATION
      // -----------------------------
      let locationMultiplier = 1.0;
      let locationNote = "neutral";

      if (text.includes("plateau")) {
        locationMultiplier = 1.4;
        locationNote = "Plateau premium";
      } else if (text.includes("verdun")) {
        locationMultiplier = 1.25;
        locationNote = "Verdun strong demand";
      } else if (text.includes("ndg")) {
        locationMultiplier = 1.2;
        locationNote = "NDG stable";
      }

      // -----------------------------
      // 🏚 CONDITION
      // -----------------------------
      let conditionMultiplier = 1.0;
      let conditionNote = "standard";

      if (text.includes("renovated")) {
        conditionMultiplier = 1.1;
        conditionNote = "renovated premium";
      }

      if (text.includes("as-is") || text.includes("needs renovation")) {
        conditionMultiplier = 0.85;
        conditionNote = "needs work discount";
      }

      // -----------------------------
      // 🧠 ARV
      // -----------------------------
      const ARV = Math.round(
        baseValue * locationMultiplier * conditionMultiplier
      );

      // -----------------------------
      // 💰 MAO (70% RULE)
      // -----------------------------
      const rehab = 50000;
      const MAO = Math.round(ARV * 0.7 - rehab);

      // -----------------------------
      // 💵 ASKING PRICE
      // -----------------------------
      let askingPrice = 0;
      let taxesNote = "";

      if (text.includes("tps/tvq") || text.includes("+ taxes")) {
        taxesNote = "⚠️ Taxes (TPS/TVQ) may apply";
      }

      const normalized = text.replace(/\s/g, "");

      let match =
        normalized.match(/([0-9]{1,3}(?:[.,]?[0-9]{3})+)\$/) ||
        normalized.match(/([0-9]{6,9})\$/) ||
        text.match(/([0-9]{6,9})/);

      if (match) {
        askingPrice = parseInt(match[1].replace(/[^\d]/g, ""));
      }

      // -----------------------------
      // 📊 SCORE COMPONENTS (EXPLICIT)
      // -----------------------------
      const spread = ARV - askingPrice;
      const spreadPercent = askingPrice ? (spread / ARV) * 100 : 0;

      let spreadScore = 0;
      if (spreadPercent >= 25) spreadScore = 30;
      else if (spreadPercent >= 15) spreadScore = 20;
      else if (spreadPercent >= 5) spreadScore = 10;
      else spreadScore = -15;

      let riskFlags = [];

      if (text.includes("structural")) riskFlags.push("Structural");
      if (text.includes("foundation")) riskFlags.push("Foundation");
      if (text.includes("mold")) riskFlags.push("Mold");
      if (text.includes("water damage")) riskFlags.push("Water damage");

      const riskScore = -riskFlags.length * 5;

      const overpayScore = askingPrice > ARV ? -20 : 0;

      const baseScore = 50;

      const finalScoreRaw =
        baseScore + spreadScore + riskScore + overpayScore;

      const score = Math.max(0, Math.min(100, Math.round(finalScoreRaw)));

      // -----------------------------
      // 🟢 DEAL TYPE
      // -----------------------------
      let dealType = "NO DEAL 🔴";

      if (spreadPercent >= 25) dealType = "STRONG ASSIGNMENT 🟢";
      else if (spreadPercent >= 15) dealType = "POSSIBLE ASSIGNMENT 🟡";
      else if (spreadPercent >= 5) dealType = "TIGHT DEAL 🟠";

      // -----------------------------
      // OUTPUT
      // -----------------------------
      setResult({
        units,
        ARV,
        MAO,
        askingPrice,
        taxesNote,
        spread,
        spreadPercent,
        dealType,
        riskFlags,
        score,

        breakdown: {
          perUnit,
          baseValue,
          locationMultiplier,
          locationNote,
          conditionMultiplier,
          conditionNote,
          spreadScore,
          riskScore,
          overpayScore,
          baseScore,
          finalScoreRaw
        }
      });

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-3xl space-y-6">

        <h1 className="text-3xl font-bold">
          🏠 Wholesale Deal Analyzer
        </h1>

        <input
          className="w-full border p-4 rounded-2xl"
          placeholder="Paste URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <textarea
          className="w-full border p-4 rounded-2xl"
          rows={8}
          placeholder="Paste description"
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

              <p><b>ARV (After Repair Value):</b> {formatMoney(result.ARV)}</p>
              <p><b>MAO (Maximum Allowable Offer):</b> {formatMoney(result.MAO)}</p>
              <p><b>Asking Price:</b> {formatMoney(result.askingPrice)}</p>

              {result.taxesNote && (
                <p className="text-orange-600">{result.taxesNote}</p>
              )}

              <p>
                Spread: {formatMoney(result.spread)} ({result.spreadPercent.toFixed(1)}%)
              </p>

            </div>

            {/* 🧠 FULL SCORE BREAKDOWN */}
            <div className="bg-blue-50 p-4 rounded-2xl text-sm space-y-1">
              <h3 className="font-bold">🧠 Score Breakdown</h3>

              <p>Base Score: {result.breakdown.baseScore}</p>
              <p>Spread Score: {result.breakdown.spreadScore}</p>
              <p>Risk Penalty: {result.breakdown.riskScore}</p>
              <p>Overpay Penalty: {result.breakdown.overpayScore}</p>

              <hr />

              <p><b>Final Calculation:</b></p>
              <p>
                {result.breakdown.baseScore} +
                {result.breakdown.spreadScore} +
                {result.breakdown.riskScore} +
                {result.breakdown.overpayScore}
                = {result.breakdown.finalScoreRaw}
              </p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

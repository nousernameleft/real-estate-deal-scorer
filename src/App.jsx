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

    // -----------------------------
    // 🇫🇷 / EN MULTI-LANGUAGE UNIT DETECTION
    // -----------------------------

    const patterns = [
      /([0-9]+)\s*unit[s]?/g,
      /([0-9]+)\s*unités/g,
      /([0-9]+)\s*logements/g,
      /([0-9]+)\s*apartments?/g
    ];

    patterns.forEach((regex) => {
      const match = text.match(regex);
      if (match) {
        const num = parseInt(match[0]);
        if (num > units) units = num;
      }
    });

    // -----------------------------
    // 🔢 FALLBACK: explicit residential + commercial
    // -----------------------------

    let res = 0;
    let com = 0;

    const resMatch = text.match(/([0-9]+)\s*(unités résidentielles|résidentiel|residential)/);
    const comMatch = text.match(/([0-9]+)\s*(unités commerciales|commercial|commerce)/);

    if (resMatch) res = parseInt(resMatch[1]);
    if (comMatch) com = parseInt(comMatch[1]);

    if (res + com > units) {
      units = res + com;
    }

    // -----------------------------
    // 🧠 FINAL SAFETY DEFAULT
    // -----------------------------
    if (!units || units < 1) units = 1;

    return units;
  };

  const analyzeDeal = async () => {
    try {
      setLoading(true);
      setResult(null);

      let text = description || "";

      // -----------------------------
      // 🌐 URL SCRAPER
      // -----------------------------
      if (url) {
        try {
          const response = await fetch(
            "https://r.jina.ai/http://" + url.replace(/^https?:\/\//, "")
          );
          if (response.ok) text = await response.text();
        } catch (e) {}
      }

      const originalText = text;
      text = text.toLowerCase();

      // -----------------------------
      // 🏠 UNIT DETECTION (FIXED)
      // -----------------------------
      const units = extractUnits(text);

      let typeLabel = `${units}-unit property`;

      // -----------------------------
      // 💰 PER UNIT BASE MODEL
      // -----------------------------
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

      let baseValue = units * perUnit;

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
      } else if (text.includes("rosemont")) {
        locationMultiplier = 1.15;
        locationNote = "Rosemont growing";
      } else if (text.includes("hochelaga")) {
        locationMultiplier = 0.95;
        locationNote = "lower baseline";
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

      if (text.includes("needs renovation") || text.includes("as-is")) {
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
      // 💰 MAO
      // -----------------------------
      const rehab = 50000;
      const MAO = Math.round(ARV * 0.7 - rehab);

      // -----------------------------
      // 💵 ASKING PRICE (FIXED)
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
      // 📊 SPREAD
      // -----------------------------
      const spread = ARV - askingPrice;
      const spreadPercent = askingPrice
        ? Math.round((spread / ARV) * 100)
        : 0;

      // -----------------------------
      // ⚠️ RISKS
      // -----------------------------
      let riskFlags = [];

      if (text.includes("structural")) riskFlags.push("Structural");
      if (text.includes("foundation")) riskFlags.push("Foundation");
      if (text.includes("mold")) riskFlags.push("Mold");
      if (text.includes("water damage")) riskFlags.push("Water damage");
      if (text.includes("tenanted")) riskFlags.push("Tenant issues");

      // -----------------------------
      // 🧠 SCORE
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

      if (spreadPercent >= 25) dealType = "STRONG ASSIGNMENT 🟢";
      else if (spreadPercent >= 15) dealType = "POSSIBLE ASSIGNMENT 🟡";
      else if (spreadPercent >= 5) dealType = "TIGHT DEAL 🟠";

      // -----------------------------
      // 📦 OUTPUT
      // -----------------------------
      setResult({
        units,
        typeLabel,
        ARV,
        MAO,
        askingPrice,
        taxesNote,
        spread,
        spreadPercent,
        dealType,
        riskFlags,
        score: Math.round(score),

        breakdown: {
          perUnit,
          baseValue,
          locationMultiplier,
          locationNote,
          conditionMultiplier,
          conditionNote,
          ARV_formula: `${units} units × ${perUnit} × location × condition`,
          MAO_formula: `ARV × 70% − ${rehab}`,
          spread_formula: `ARV − Asking Price`
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
          placeholder="Paste description (French supported)"
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

            <div className="text-xl">
              {result.units} units detected ({result.typeLabel})
            </div>

            <div className="text-xl font-semibold">
              Score: {result.score}/100
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl space-y-1">

              <p><b>ARV:</b> {formatMoney(result.ARV)}</p>
              <p><b>MAO:</b> {formatMoney(result.MAO)}</p>
              <p><b>Asking Price:</b> {formatMoney(result.askingPrice)}</p>

              {result.taxesNote && (
                <p className="text-orange-600">{result.taxesNote}</p>
              )}

              <p className="font-semibold">
                Spread: {formatMoney(result.spread)} ({result.spreadPercent}%)
              </p>

            </div>

            {result.riskFlags.length > 0 && (
              <div className="text-red-600">
                ⚠️ {result.riskFlags.join(", ")}
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-2xl text-sm space-y-1">
              <h3 className="font-bold">🧠 Breakdown</h3>

              <p>Per-unit value: {formatMoney(result.breakdown.perUnit)}</p>
              <p>Formula: {result.breakdown.ARV_formula}</p>
              <p>MAO: {result.breakdown.MAO_formula}</p>
              <p>Spread: {result.breakdown.spread_formula}</p>
              <p>Location: {result.breakdown.locationNote}</p>
              <p>Condition: {result.breakdown.conditionNote}</p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

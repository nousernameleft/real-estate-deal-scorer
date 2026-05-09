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

  // -----------------------------
  // 🏠 UNIT DETECTION (FRENCH + ENGLISH FIXED)
  // -----------------------------
  const extractUnits = (text) => {
    let units = 0;
    const t = text.toLowerCase();

    const patterns = [
      /([0-9]+)\s*unit[s]?/g,
      /([0-9]+)\s*unités/g,
      /([0-9]+)\s*logements/g,
      /immeuble\s*de\s*([0-9]+)\s*logements/g,
      /immeuble\s*([0-9]+)\s*logements/g,
      /building\s*of\s*([0-9]+)\s*units?/g
    ];

    patterns.forEach((regex) => {
      const match = t.match(regex);
      if (match) {
        const num = parseInt(match[1]);
        if (!isNaN(num) && num > units) units = num;
      }
    });

    const fallback = t.match(/([0-9]+)\s*logements?/);
    if (fallback) {
      const num = parseInt(fallback[1]);
      if (num > units) units = num;
    }

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
      // 📍 LOCATION MULTIPLIER
      // -----------------------------
      let locationMultiplier = 1.0;
      let locationNote = "neutral market";

      if (text.includes("plateau")) {
        locationMultiplier = 1.4;
        locationNote = "premium demand area (Plateau)";
      } else if (text.includes("verdun")) {
        locationMultiplier = 1.25;
        locationNote = "strong demand (Verdun)";
      } else if (text.includes("ndg")) {
        locationMultiplier = 1.2;
        locationNote = "stable area (NDG)";
      }

      // -----------------------------
      // 🏚 CONDITION MULTIPLIER
      // -----------------------------
      let conditionMultiplier = 1.0;
      let conditionNote = "standard condition";

      if (text.includes("renovated")) {
        conditionMultiplier = 1.1;
        conditionNote = "renovated premium";
      }

      if (text.includes("as-is") || text.includes("needs renovation")) {
        conditionMultiplier = 0.85;
        conditionNote = "value-add / renovation needed";
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
      // 💵 ASKING PRICE
      // -----------------------------
      let askingPrice = 0;
      let taxesNote = "";

      if (text.includes("tps/tvq") || text.includes("+ taxes")) {
        taxesNote = "Taxes (TPS/TVQ) may apply";
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
      // 📊 SCORE LOGIC
      // -----------------------------
      const spread = ARV - askingPrice;
      const spreadPercent = askingPrice ? (spread / ARV) * 100 : 0;

      let spreadScore = 0;
      let spreadExplanation = "";

      if (spreadPercent >= 25) {
        spreadScore = 30;
        spreadExplanation = "Excellent spread (>=25%)";
      } else if (spreadPercent >= 15) {
        spreadScore = 20;
        spreadExplanation = "Good spread (15–25%)";
      } else if (spreadPercent >= 5) {
        spreadScore = 10;
        spreadExplanation = "Low spread (5–15%)";
      } else {
        spreadScore = -15;
        spreadExplanation = "Weak or negative spread";
      }

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
      // 🧭 DECISION (CLEAR, NON-AMBIGUOUS)
      // -----------------------------
      let decision = "";
      let decisionColor = "";

      if (score >= 80) {
        decision = "ACQUIRE — Strong deal, proceed / assign immediately";
        decisionColor = "text-green-600";
      } else if (score >= 65) {
        decision = "REVIEW — Good deal, needs deeper underwriting";
        decisionColor = "text-yellow-600";
      } else if (score >= 50) {
        decision = "MARGIN RISK — Proceed only if strong upside exists";
        decisionColor = "text-orange-600";
      } else {
        decision = "REJECT — Do not pursue";
        decisionColor = "text-red-600";
      }

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
        score,
        decision,
        decisionColor,
        riskFlags,

        breakdown: {
          // ARV
          perUnit,
          baseValue,
          locationMultiplier,
          locationNote,
          conditionMultiplier,
          conditionNote,

          ARV_formula:
            `${units} units × ${perUnit} × ${locationMultiplier} × ${conditionMultiplier}`,

          // MAO
          rehab,
          MAO_formula:
            "ARV (After Repair Value) × 70% − rehab",
          MAO_full_calc:
            `(${ARV} × 0.70) − ${rehab}`,

          // SCORE
          baseScore,
          spreadScore,
          spreadExplanation,
          riskScore,
          overpayScore,
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
          Wholesale Deal Analyzer
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

            <div className={`text-2xl font-bold ${result.decisionColor}`}>
              {result.decision}
            </div>

            <div className="text-xl font-semibold">
              Score: {result.score}/100
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl space-y-1">
              <p><b>ARV (After Repair Value):</b> {formatMoney(result.ARV)}</p>
              <p><b>MAO (Maximum Allowable Offer):</b> {formatMoney(result.MAO)}</p>
              <p><b>Asking Price:</b> {formatMoney(result.askingPrice)}</p>

              {result.taxesNote && (
                <p>{result.taxesNote}</p>
              )}

              <p>
                Spread: {formatMoney(result.spread)} ({result.spreadPercent.toFixed(1)}%)
              </p>
            </div>

            {/* ARV */}
            <div className="bg-blue-50 p-4 rounded-2xl text-sm space-y-1">
              <h3 className="font-bold">ARV Breakdown</h3>
              <p>Base value: {formatMoney(result.breakdown.baseValue)}</p>
              <p>Formula: {result.breakdown.ARV_formula}</p>
              <p>Market: {result.breakdown.locationNote}</p>
              <p>Condition: {result.breakdown.conditionNote}</p>
            </div>

            {/* MAO */}
            <div className="bg-purple-50 p-4 rounded-2xl text-sm space-y-1">
              <h3 className="font-bold">MAO Breakdown</h3>
              <p>Formula: {result.breakdown.MAO_formula}</p>
              <p>Full calc: {result.breakdown.MAO_full_calc}</p>
              <p>Rehab estimate: {formatMoney(result.breakdown.rehab)}</p>
            </div>

            {/* SCORE */}
            <div className="bg-green-50 p-4 rounded-2xl text-sm space-y-1">
              <h3 className="font-bold">Score Breakdown</h3>
              <p>Base score: {result.breakdown.baseScore}</p>
              <p>Spread score: {result.breakdown.spreadScore}</p>
              <p>→ {result.breakdown.spreadExplanation}</p>
              <p>Risk penalty: {result.breakdown.riskScore}</p>
              <p>Overpay penalty: {result.breakdown.overpayScore}</p>
              <p><b>Total:</b> {result.breakdown.finalScoreRaw}</p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

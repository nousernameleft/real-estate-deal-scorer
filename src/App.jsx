import React from "react";

export default function RealEstateDealScorer() {
  const [url, setUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [result, setResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const formatMoney = (num) =>
    "$" + (num || 0).toLocaleString("en-US");

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

    patterns.forEach((r) => {
      const m = t.match(r);
      if (m) {
        const n = parseInt(m[1]);
        if (!isNaN(n) && n > units) units = n;
      }
    });

    const fallback = t.match(/([0-9]+)\s*logements?/);
    if (fallback) units = Math.max(units, parseInt(fallback[1]));

    return units || 1;
  };

  const analyzeDeal = async () => {
    try {
      setLoading(true);
      setResult(null);

      let text = description || "";

      if (url) {
        try {
          const res = await fetch(
            "https://r.jina.ai/http://" + url.replace(/^https?:\/\//, "")
          );
          if (res.ok) text = await res.text();
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
      let locationMultiplier = 1;
      let locationNote = "Neutral market (baseline pricing)";

      if (text.includes("plateau")) {
        locationMultiplier = 1.4;
        locationNote = "Premium demand area (Plateau)";
      } else if (text.includes("verdun")) {
        locationMultiplier = 1.25;
        locationNote = "Strong rental demand (Verdun)";
      } else if (text.includes("ndg")) {
        locationMultiplier = 1.2;
        locationNote = "Stable investor demand (NDG)";
      }

      // -----------------------------
      // 🏚 CONDITION
      // -----------------------------
      let conditionMultiplier = 1;
      let conditionNote = "Standard condition (no adjustment)";

      if (text.includes("renovated")) {
        conditionMultiplier = 1.1;
        conditionNote = "Renovated premium applied";
      }

      if (text.includes("as-is") || text.includes("needs renovation")) {
        conditionMultiplier = 0.85;
        conditionNote = "Value-add / renovation required";
      }

      // -----------------------------
      // 🧠 ARV (After Repair Value)
      // -----------------------------
      const ARV = Math.round(
        baseValue * locationMultiplier * conditionMultiplier
      );

      // -----------------------------
      // 💰 MAO (Maximum Allowable Offer)
      // -----------------------------
      const rehab = 50000;
      const MAO = Math.round(ARV * 0.7 - rehab);

      // -----------------------------
      // 💵 ASKING PRICE
      // -----------------------------
      let askingPrice = 0;

      const normalized = text.replace(/\s/g, "");
      let match =
        normalized.match(/([0-9]{1,3}(?:[.,]?[0-9]{3})+)\$/) ||
        normalized.match(/([0-9]{6,9})\$/) ||
        text.match(/([0-9]{6,9})/);

      if (match) {
        askingPrice = parseInt(match[1].replace(/[^\d]/g, ""));
      }

      // -----------------------------
      // 📊 PROFITABILITY (SPREAD)
      // -----------------------------
      const spread = ARV - askingPrice;
      const spreadPercent = askingPrice ? (spread / ARV) * 100 : 0;

      let spreadScore = 0;
      let spreadExplanation = "";

      if (spreadPercent >= 25) {
        spreadScore = 30;
        spreadExplanation =
          "Excellent margin (≥25%) → strong assignment potential";
      } else if (spreadPercent >= 15) {
        spreadScore = 20;
        spreadExplanation =
          "Good margin (15–25%) → viable wholesale deal";
      } else if (spreadPercent >= 5) {
        spreadScore = 10;
        spreadExplanation =
          "Low margin (5–15%) → limited upside";
      } else {
        spreadScore = -15;
        spreadExplanation =
          "Weak or negative spread → unattractive deal";
      }

      // -----------------------------
      // ⚠️ RISK
      // -----------------------------
      let riskFlags = [];

      if (text.includes("structural")) riskFlags.push("Structural issue");
      if (text.includes("foundation")) riskFlags.push("Foundation risk");
      if (text.includes("mold")) riskFlags.push("Mold risk");
      if (text.includes("water damage")) riskFlags.push("Water damage");

      const riskScore = -riskFlags.length * 5;

      const overpayScore = askingPrice > ARV ? -20 : 0;

      // -----------------------------
      // 📊 FINAL SCORE
      // -----------------------------
      const baseScore = 50;

      const finalScore =
        baseScore + spreadScore + riskScore + overpayScore;

      const score = Math.max(0, Math.min(100, Math.round(finalScore)));

      // -----------------------------
      // 🧭 DEAL DECISION
      // -----------------------------
      let decision = "";
      let color = "";

      if (score >= 80) {
        decision = "ACQUIRE — Strong deal (assign immediately)";
        color = "text-green-600";
      } else if (score >= 65) {
        decision = "REVIEW — Good deal, needs underwriting";
        color = "text-yellow-600";
      } else if (score >= 50) {
        decision = "MARGIN RISK — Proceed only with strong upside";
        color = "text-orange-600";
      } else {
        decision = "REJECT — Do not pursue";
        color = "text-red-600";
      }

      // -----------------------------
      // 💰 INVESTOR STRATEGY (EXPANDED)
      // -----------------------------
      const assignmentFee = Math.max(10000, Math.round(spread * 0.15));

      const exitLow = askingPrice + assignmentFee;
      const exitHigh = askingPrice + assignmentFee * 2;

      let buyerType = "General investor";

      if (units <= 4) buyerType = "Small multifamily / BRRRR investor";
      else if (units <= 8) buyerType = "Cash-flow multifamily investor";
      else buyerType = "Commercial / portfolio investor";

      const investorLogic =
        "Assignment fee is estimated at ~15% of spread to reflect typical wholesale compensation. Exit range reflects conservative and aggressive resale pricing to investors after assignment.";

      // -----------------------------
      // 🧾 OUTPUT
      // -----------------------------
      setResult({
        units,
        ARV,
        MAO,
        askingPrice,
        spread,
        spreadPercent,
        score,
        decision,
        color,
        riskFlags,

        investor: {
          assignmentFee,
          exitLow,
          exitHigh,
          buyerType,
          investorLogic
        },

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

          ARV_explanation:
            "ARV (After Repair Value) is calculated using estimated per-unit value multiplied by location and condition adjustments.",

          // MAO
          rehab,
          MAO_formula:
            "MAO (Maximum Allowable Offer) = ARV × 70% − rehab costs",

          MAO_explanation:
            "MAO (Maximum Allowable Offer) is the maximum price an investor should pay while maintaining profit margin after renovation costs.",

          MAO_full:
            `(${ARV} × 0.70) − ${rehab}`,

          // SCORE
          baseScore,
          spreadScore,
          spreadExplanation,
          riskScore,
          overpayScore,
          finalScore,

          score_explanation:
            "Score combines profitability (spread), risk factors, and overpay penalties into a 0–100 investment attractiveness metric."
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
          🏠 Wholesale Deal Intelligence Engine
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
          placeholder="Paste listing description (French supported)"
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
          <div className="mt-6 space-y-6">

            <div className={`text-2xl font-bold ${result.color}`}>
              {result.decision}
            </div>

            <div className="text-xl font-semibold">
              Score: {result.score}/100
            </div>

            {/* CORE */}
            <div className="bg-gray-50 p-4 rounded-2xl space-y-1">
              <p><b>ARV (After Repair Value):</b> {formatMoney(result.ARV)}</p>
              <p><b>MAO (Maximum Allowable Offer):</b> {formatMoney(result.MAO)}</p>
              <p><b>Asking Price:</b> {formatMoney(result.askingPrice)}</p>
              <p><b>Spread:</b> {formatMoney(result.spread)} ({result.spreadPercent.toFixed(1)}%)</p>
            </div>

            {/* ARV */}
            <div className="bg-blue-50 p-4 rounded-2xl text-sm">
              <h3 className="font-bold">🏠 ARV Breakdown</h3>
              <p>{result.breakdown.ARV_explanation}</p>
              <p>Formula: {result.breakdown.ARV_formula}</p>
              <p>Base value: {formatMoney(result.breakdown.baseValue)}</p>
              <p>Market: {result.breakdown.locationNote}</p>
              <p>Condition: {result.breakdown.conditionNote}</p>
            </div>

            {/* MAO */}
            <div className="bg-purple-50 p-4 rounded-2xl text-sm">
              <h3 className="font-bold">💰 MAO Breakdown</h3>
              <p>{result.breakdown.MAO_explanation}</p>
              <p>Formula: {result.breakdown.MAO_formula}</p>
              <p>Math: {result.breakdown.MAO_full}</p>
              <p>Rehab estimate: {formatMoney(result.breakdown.rehab)}</p>
            </div>

            {/* INVESTOR STRATEGY */}
            <div className="bg-yellow-50 p-4 rounded-2xl text-sm">
              <h3 className="font-bold">💼 Investor Strategy</h3>
              <p><b>Buyer Type:</b> {result.investor.buyerType}</p>
              <p><b>Assignment Fee:</b> {formatMoney(result.investor.assignmentFee)}</p>
              <p><b>Exit Range:</b> {formatMoney(result.investor.exitLow)} → {formatMoney(result.investor.exitHigh)}</p>
              <p>{result.investor.investorLogic}</p>
            </div>

            {/* SCORE */}
            <div className="bg-green-50 p-4 rounded-2xl text-sm">
              <h3 className="font-bold">📊 Score Breakdown</h3>
              <p>{result.breakdown.score_explanation}</p>
              <p>Base score: {result.breakdown.baseScore}</p>
              <p>Spread score: {result.breakdown.spreadScore}</p>
              <p>→ {result.breakdown.spreadExplanation}</p>
              <p>Risk penalty: {result.breakdown.riskScore}</p>
              <p>Overpay penalty: {result.breakdown.overpayScore}</p>
              <p><b>Total:</b> {result.breakdown.finalScore}</p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

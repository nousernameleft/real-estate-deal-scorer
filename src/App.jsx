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
        if (n > units) units = n;
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
      let locationNote = "neutral";

      if (text.includes("plateau")) {
        locationMultiplier = 1.4;
        locationNote = "premium (Plateau)";
      } else if (text.includes("verdun")) {
        locationMultiplier = 1.25;
        locationNote = "strong (Verdun)";
      } else if (text.includes("ndg")) {
        locationMultiplier = 1.2;
        locationNote = "stable (NDG)";
      }

      // -----------------------------
      // 🏚 CONDITION
      // -----------------------------
      let conditionMultiplier = 1;
      let conditionNote = "standard";

      if (text.includes("renovated")) {
        conditionMultiplier = 1.1;
        conditionNote = "renovated premium";
      }
      if (text.includes("as-is") || text.includes("needs renovation")) {
        conditionMultiplier = 0.85;
        conditionNote = "value-add / needs work";
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

      const normalized = text.replace(/\s/g, "");
      let match =
        normalized.match(/([0-9]{1,3}(?:[.,]?[0-9]{3})+)\$/) ||
        normalized.match(/([0-9]{6,9})\$/) ||
        text.match(/([0-9]{6,9})/);

      if (match) {
        askingPrice = parseInt(match[1].replace(/[^\d]/g, ""));
      }

      // -----------------------------
      // 📊 PROFITABILITY
      // -----------------------------
      const spread = ARV - askingPrice;
      const spreadPercent = askingPrice ? (spread / ARV) * 100 : 0;

      let spreadScore = 0;
      let spreadLabel = "";

      if (spreadPercent >= 25) {
        spreadScore = 30;
        spreadLabel = "Excellent spread";
      } else if (spreadPercent >= 15) {
        spreadScore = 20;
        spreadLabel = "Good spread";
      } else if (spreadPercent >= 5) {
        spreadScore = 10;
        spreadLabel = "Low spread";
      } else {
        spreadScore = -15;
        spreadLabel = "Weak deal";
      }

      // -----------------------------
      // ⚠️ RISK
      // -----------------------------
      let riskFlags = [];

      if (text.includes("structural")) riskFlags.push("Structural");
      if (text.includes("foundation")) riskFlags.push("Foundation");
      if (text.includes("mold")) riskFlags.push("Mold");
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
      // 🧭 DECISION
      // -----------------------------
      let decision = "";
      let color = "";

      if (score >= 80) {
        decision = "ACQUIRE — Strong wholesale deal";
        color = "text-green-600";
      } else if (score >= 65) {
        decision = "REVIEW — Good but needs underwriting";
        color = "text-yellow-600";
      } else if (score >= 50) {
        decision = "MARGIN RISK — Only proceed if upside exists";
        color = "text-orange-600";
      } else {
        decision = "REJECT — Do not pursue";
        color = "text-red-600";
      }

      // -----------------------------
      // 💰 INVESTOR EXIT STRATEGY
      // -----------------------------
      const assignmentFee = Math.max(10000, Math.round(spread * 0.15));
      const exitLow = askingPrice + assignmentFee;
      const exitHigh = askingPrice + assignmentFee * 2;

      let buyerType = "General investor";
      if (units <= 4) buyerType = "Small multifamily investor (BRRRR)";
      else if (units <= 8) buyerType = "Cash-flow multifamily buyer";
      else buyerType = "Commercial investor";

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
          buyerType
        },

        breakdown: {
          ARV_formula:
            `${units} × ${perUnit} × ${locationMultiplier} × ${conditionMultiplier}`,
          MAO_formula: "ARV × 70% − rehab",
          spreadLabel,
          riskScore,
          overpayScore,
          baseScore,
          finalScore
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
          🏠 Wholesale Deal Engine
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
          <div className="space-y-5 mt-6">

            <div className={`text-2xl font-bold ${result.color}`}>
              {result.decision}
            </div>

            <div className="text-xl font-semibold">
              Score: {result.score}/100
            </div>

            {/* CORE */}
            <div className="bg-gray-50 p-4 rounded-2xl">
              <p>ARV: {formatMoney(result.ARV)}</p>
              <p>MAO: {formatMoney(result.MAO)}</p>
              <p>Asking: {formatMoney(result.askingPrice)}</p>
              <p>Spread: {formatMoney(result.spread)} ({result.spreadPercent.toFixed(1)}%)</p>
            </div>

            {/* INVESTOR STRATEGY */}
            <div className="bg-blue-50 p-4 rounded-2xl">
              <h3 className="font-bold">Investor Exit Strategy 💰</h3>
              <p>Assignment Fee: {formatMoney(result.investor.assignmentFee)}</p>
              <p>Exit Range: {formatMoney(result.investor.exitLow)} → {formatMoney(result.investor.exitHigh)}</p>
              <p>Buyer Type: {result.investor.buyerType}</p>
            </div>

            {/* SCORE BREAKDOWN */}
            <div className="bg-green-50 p-4 rounded-2xl text-sm">
              <h3 className="font-bold">Score Breakdown 📊</h3>
              <p>Base: {result.breakdown.baseScore}</p>
              <p>Spread: {result.breakdown.spreadScore}</p>
              <p>Risk: {result.breakdown.riskScore}</p>
              <p>Overpay: {result.breakdown.overpayScore}</p>
              <p><b>Total:</b> {result.breakdown.finalScore}</p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

import React from "react";

export default function RealEstateDealScorer() {
  const [url, setUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [result, setResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const money = (n) =>
    "$" + (n || 0).toLocaleString("en-US");

  const normalize = (t) =>
    (t || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/\u00a0/g, " ");

  // -----------------------------
  // 💵 PRICE
  // -----------------------------
  const extractPrice = (text) => {
    const t = text;

    const matches = [];
    const regex = /([0-9]{1,3}(?:[ ,.]?[0-9]{3})+)/g;

    let m;
    while ((m = regex.exec(t)) !== null) {
      const val = parseInt(m[1].replace(/[^\d]/g, ""));
      if (val > 50000) matches.push(val);
    }

    return matches.length ? Math.max(...matches) : 0;
  };

  // -----------------------------
  // 🏠 UNITS
  // -----------------------------
  const extractUnits = (text) => {
    const t = normalize(text);

    const patterns = [
      /#\s*units\s*total\s*[:\-]?\s*(\d+)/,
      /units\s*total\s*[:\-]?\s*(\d+)/,
      /(\d+)\s*units/,
      /(\d+)\s*unités/,
      /(\d+)\s*logements/,
      /immeuble\s*de\s*(\d+)\s*logements/
    ];

    for (const r of patterns) {
      const m = t.match(r);
      if (m) return parseInt(m[1]);
    }

    return 1;
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

      const t = normalize(text);

      // -----------------------------
      // INPUTS
      // -----------------------------
      const askingPrice = extractPrice(text);
      const units = extractUnits(text);

      // -----------------------------
      // 🏠 ARV (After Repair Value)
      // -----------------------------
      const perUnitValue = 210000;
      const baseValue = units * perUnitValue;

      let locationMultiplier = 1;
      let locationReason = "Neutral market baseline";

      if (t.includes("plateau")) {
        locationMultiplier = 1.4;
        locationReason = "Premium demand area (Plateau)";
      } else if (t.includes("verdun")) {
        locationMultiplier = 1.25;
        locationReason = "Strong rental demand (Verdun)";
      } else if (t.includes("ville-émard")) {
        locationMultiplier = 1.2;
        locationReason = "Emerging investor area (Ville-Émard)";
      }

      const ARV = Math.round(
        baseValue * locationMultiplier
      );

      // ARV EXPLANATION (FULL TRACEABILITY)
      const ARV_explanation =
        `
ARV (After Repair Value) is the estimated resale value after improvements.

Step-by-step breakdown:
1. Unit count detected: ${units}
2. Base per-unit value: ${money(perUnitValue)}
3. Base value: ${units} × ${money(perUnitValue)} = ${money(baseValue)}
4. Location multiplier: × ${locationMultiplier}
   → ${locationReason}

FINAL ARV = ${money(baseValue)} × ${locationMultiplier} = ${money(ARV)}
        `.trim();

      // -----------------------------
      // 💰 MAO (Maximum Allowable Offer)
      // -----------------------------
      const rehab = 60000;
      const maoMultiplier = 0.70;

      const MAO = Math.round(ARV * maoMultiplier - rehab);

      const MAO_explanation =
        `
MAO (Maximum Allowable Offer) is the maximum price an investor should pay.

Formula used:
MAO = ARV (After Repair Value) × 70% − Rehab Costs

Why 70%?
→ Standard wholesale safety margin for profit + risk buffer

Step-by-step:
1. ARV: ${money(ARV)}
2. 70% of ARV: ${money(Math.round(ARV * 0.7))}
3. Rehab deduction: − ${money(rehab)}

FINAL MAO = ${money(MAO)}
        `.trim();

      // -----------------------------
      // 💵 SPREAD
      // -----------------------------
      const spread = ARV - askingPrice;
      const spreadPercent = ARV ? (spread / ARV) * 100 : 0;

      // -----------------------------
      // 📊 SCORE (FULL TRACEABILITY)
      // -----------------------------
      let spreadScore = 0;
      let spreadReason = "";

      if (spreadPercent >= 25) {
        spreadScore = 30;
        spreadReason = "Excellent margin (≥25%)";
      } else if (spreadPercent >= 15) {
        spreadScore = 20;
        spreadReason = "Good margin (15–25%)";
      } else if (spreadPercent >= 5) {
        spreadScore = 10;
        spreadReason = "Low margin (5–15%)";
      } else {
        spreadScore = -15;
        spreadReason = "Weak margin or overpay risk";
      }

      const baseScore = 50;
      const riskScore = 0;

      const finalScore =
        baseScore + spreadScore + riskScore;

      const score = Math.max(0, Math.min(100, Math.round(finalScore)));

      const score_explanation =
        `
SCORE (0–100) measures deal attractiveness.

Formula:
Base score + Spread score + Risk adjustments

Step-by-step:
1. Base score: ${baseScore}
2. Spread evaluation: ${spreadReason}
   → Score impact: ${spreadScore}
3. Risk score: ${riskScore}

FINAL SCORE = ${finalScore} → ${score}/100
        `.trim();

      // -----------------------------
      // 🚪 EXIT STRATEGY (DETAILED)
      // -----------------------------
      const assignmentFee = Math.max(10000, Math.round(spread * 0.15));

      const exitLow = askingPrice + assignmentFee;
      const exitHigh = askingPrice + assignmentFee * 2;

      const exit_explanation =
        `
EXIT STRATEGY (Investor resale plan):

1. Assignment fee logic:
   → ~15% of spread (wholesaling standard)

2. Spread = ARV − Asking Price
   = ${money(ARV)} − ${money(askingPrice)} = ${money(spread)}

3. Assignment fee:
   = 15% × spread = ${money(assignmentFee)}

4. Exit range:
   - Conservative: Asking + fee = ${money(exitLow)}
   - Aggressive: Asking + 2× fee = ${money(exitHigh)}

This is the estimated resale price range to end investors.
        `.trim();

      // -----------------------------
      // DECISION
      // -----------------------------
      let decision = "";

      if (score >= 80) decision = "ACQUIRE — Strong deal";
      else if (score >= 65) decision = "REVIEW — Analyze further";
      else if (score >= 50) decision = "MARGIN RISK";
      else decision = "REJECT";

      // -----------------------------
      // OUTPUT
      // -----------------------------
      setResult({
        units,
        askingPrice,
        ARV,
        MAO,
        spread,
        score,
        decision,

        explanations: {
          ARV_explanation,
          MAO_explanation,
          score_explanation,
          exit_explanation
        }
      });

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-3xl">

        <h1 className="text-3xl font-bold">
          🏠 Deal Underwriting Engine
        </h1>

        <input
          className="w-full border p-4 rounded-2xl mt-4"
          placeholder="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <textarea
          className="w-full border p-4 rounded-2xl mt-4"
          rows={8}
          placeholder="Paste listing description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <button
          onClick={analyzeDeal}
          className="bg-black text-white px-6 py-3 rounded-2xl mt-4"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>

        {result && (
          <div className="mt-6 space-y-6">

            <div className="text-xl font-bold">
              {result.decision} — {result.score}/100
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl">
              <p>ARV (After Repair Value): {money(result.ARV)}</p>
              <p>MAO (Maximum Allowable Offer): {money(result.MAO)}</p>
              <p>Asking Price: {money(result.askingPrice)}</p>
              <p>Spread: {money(result.spread)}</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl text-sm whitespace-pre-wrap">
              {result.explanations.ARV_explanation}
            </div>

            <div className="bg-purple-50 p-4 rounded-2xl text-sm whitespace-pre-wrap">
              {result.explanations.MAO_explanation}
            </div>

            <div className="bg-green-50 p-4 rounded-2xl text-sm whitespace-pre-wrap">
              {result.explanations.score_explanation}
            </div>

            <div className="bg-yellow-50 p-4 rounded-2xl text-sm whitespace-pre-wrap">
              {result.explanations.exit_explanation}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

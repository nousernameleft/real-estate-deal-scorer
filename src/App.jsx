import React from "react";

export default function RealEstateDealScorer() {
  const [url, setUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [result, setResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const formatMoney = (num) =>
    "$" + (num || 0).toLocaleString("en-US");

  // -----------------------------
  // 🧠 CLEAN TEXT NORMALIZER
  // -----------------------------
  const normalize = (text) =>
    (text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/\u00a0/g, " ");

  // -----------------------------
  // 💵 PRICE EXTRACTION (FIXED)
  // -----------------------------
  const extractPrice = (text) => {
    const t = text;

    const patterns = [
      /\$\s?([0-9]{1,3}(?:[ ,.]?[0-9]{3})+)/g,
      /([0-9]{3,3}(?:[ ,.]?[0-9]{3})+)\s*\$/g,
      /price[^0-9]*([0-9]{3,9})/i,
      /(\d{6,9})\$/g
    ];

    let prices = [];

    patterns.forEach((r) => {
      let m;
      while ((m = r.exec(t)) !== null) {
        let val = parseInt(m[1].replace(/[^\d]/g, ""));
        if (val > 50000) prices.push(val);
      }
    });

    if (prices.length === 0) return 0;

    // Heuristic: highest value is usually asking price
    return Math.max(...prices);
  };

  // -----------------------------
  // 🏠 UNIT EXTRACTION (IMPROVED)
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

    for (let r of patterns) {
      const m = t.match(r);
      if (m) return parseInt(m[1]);
    }

    return 1;
  };

  // -----------------------------
  // 💰 INCOME EXTRACTION (NEW)
  // -----------------------------
  const extractIncome = (text) => {
    const t = normalize(text);

    const match = t.match(
      /gross\s*potential\s*income[^0-9]*([0-9]{2,3}[ ,]?[0-9]{3})/
    );

    if (!match) return 0;

    return parseInt(match[1].replace(/[^\d]/g, ""));
  };

  // -----------------------------
  // 🧭 NEIGHBOURHOOD
  // -----------------------------
  const extractNeighbourhood = (text) => {
    const t = normalize(text);

    if (t.includes("ville-émard")) return "Ville-Émard";
    if (t.includes("verdun")) return "Verdun";
    if (t.includes("plateau")) return "Plateau";
    if (t.includes("ndg")) return "NDG";

    return "Unknown";
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
      // 🧾 CORE EXTRACTIONS
      // -----------------------------
      const askingPrice = extractPrice(text);
      const units = extractUnits(text);
      const income = extractIncome(text);
      const neighbourhood = extractNeighbourhood(text);

      // -----------------------------
      // 🏠 ARV MODEL (SIMPLE BUT CONSISTENT)
      // -----------------------------
      const basePerUnit = 210000;
      const baseValue = units * basePerUnit;

      let locationMultiplier = 1;

      if (t.includes("plateau")) locationMultiplier = 1.4;
      else if (t.includes("verdun")) locationMultiplier = 1.25;
      else if (t.includes("ville-émard")) locationMultiplier = 1.2;

      const ARV = Math.round(baseValue * locationMultiplier);

      // -----------------------------
      // 💰 MAO (MAX OFFER)
      // -----------------------------
      const rehab = 60000;
      const MAO = Math.round(ARV * 0.7 - rehab);

      // -----------------------------
      // 📊 INCOME YIELD CHECK (NEW INSIGHT)
      // -----------------------------
      let yieldNote = "No income data";

      if (income > 0) {
        const yieldPct = (income / askingPrice) * 100;

        if (yieldPct >= 6) yieldNote = "Strong cashflow (>6%)";
        else if (yieldPct >= 4) yieldNote = "Moderate cashflow";
        else yieldNote = "Weak cashflow (<4%)";
      }

      // -----------------------------
      // 📊 SCORE
      // -----------------------------
      const spread = ARV - askingPrice;
      const spreadPercent = askingPrice ? (spread / ARV) * 100 : 0;

      let spreadScore = 0;

      if (spreadPercent >= 25) spreadScore = 30;
      else if (spreadPercent >= 15) spreadScore = 20;
      else if (spreadPercent >= 5) spreadScore = 10;
      else spreadScore = -15;

      const riskScore = 0;

      const baseScore = 50;

      const score = Math.max(
        0,
        Math.min(100, Math.round(baseScore + spreadScore + riskScore))
      );

      // -----------------------------
      // 🧭 DECISION
      // -----------------------------
      let decision = "";

      if (score >= 80) decision = "ACQUIRE — Strong deal";
      else if (score >= 65) decision = "REVIEW — Needs analysis";
      else if (score >= 50) decision = "MARGIN RISK";
      else decision = "REJECT";

      // -----------------------------
      // 🧾 OUTPUT
      // -----------------------------
      setResult({
        askingPrice,
        units,
        income,
        neighbourhood,
        ARV,
        MAO,
        spread,
        score,
        decision,
        yieldNote,

        breakdown: {
          ARV_formula: `${units} × ${basePerUnit} × ${locationMultiplier}`,
          MAO_formula: "ARV × 70% − rehab",
          income,
          yieldNote
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
          🏠 Real Estate Deal Engine (Fixed Parsing)
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
          placeholder="Paste listing"
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
          <div className="mt-6 space-y-4">

            <div className="text-xl font-bold">
              {result.decision} — {result.score}/100
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl">
              <p>Price: {formatMoney(result.askingPrice)}</p>
              <p>Units: {result.units}</p>
              <p>Neighbourhood: {result.neighbourhood}</p>
              <p>Income: {formatMoney(result.income)}</p>
              <p>{result.yieldNote}</p>
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl text-sm">
              <p><b>ARV:</b> {formatMoney(result.ARV)}</p>
              <p><b>MAO:</b> {formatMoney(result.MAO)}</p>
              <p>ARV formula: {result.breakdown.ARV_formula}</p>
              <p>MAO formula: {result.breakdown.MAO_formula}</p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}

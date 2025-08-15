export const Canada = (() => {
  function monthlyRateFromCanadianNominal(aprNominalPct) {
    const i = Number(aprNominalPct) / 100;
    return Math.pow(1 + i / 2, 2 / 12) - 1;
  }

  function paymentMonthly(principal, aprNominalPct, amortYears) {
    const r = monthlyRateFromCanadianNominal(aprNominalPct);
    const n = Math.round(amortYears * 12);
    if (r <= 0) return principal / n;
    return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  function frequencyAmountFromMonthly(monthly, freq) {
    switch (freq) {
      case 'monthly': return monthly;
      case 'biweekly': return (monthly * 12) / 26;
      case 'weekly': return (monthly * 12) / 52;
      case 'acc_biweekly': return monthly / 2;
      case 'acc_weekly': return monthly / 4;
      default: return monthly;
    }
  }

  function qualifyingRate(contractAprPct, mqrPct = 5.25) {
    return Math.max(contractAprPct + 2, mqrPct);
  }

  function minDownPayment(price) {
    if (price >= 1000000) return price * 0.20;
    const first = Math.min(price, 500000) * 0.05;
    const remainder = Math.max(0, Math.min(price, 999999.99) - 500000) * 0.10;
    return first + remainder;
  }

  function cmhcPremiumRate(ltvPct, nonTraditionalDP = false) {
    if (ltvPct <= 80) return 0;
    if (ltvPct <= 85) return 2.80;
    if (ltvPct <= 90) return 3.10;
    if (ltvPct <= 95) return nonTraditionalDP ? 4.50 : 4.00;
    return 0;
  }

  function addCmhcIfRequired(price, downPayment, basePrincipal, nonTraditionalDP = false) {
    const ltv = (basePrincipal / price) * 100;
    const rate = cmhcPremiumRate(ltv, nonTraditionalDP);
    const premium = basePrincipal * (rate / 100);
    return { ltv, premiumRatePct: rate, premium, totalFinanced: basePrincipal + premium };
  }

  function computeGdsTds({ monthlyPI, monthlyPropertyTax, monthlyHeating, monthlyCondoFees, otherMonthlyDebt, grossAnnualIncome }) {
    const pith = monthlyPI + monthlyPropertyTax + monthlyHeating + (monthlyCondoFees * 0.5);
    const gds = (pith / (grossAnnualIncome / 12)) * 100;
    const tds = ((pith + otherMonthlyDebt) / (grossAnnualIncome / 12)) * 100;
    return { pith, gds, tds, gdsLimit: 39, tdsLimit: 44 };
  }

  function landTransferTax({ province, city, price }) {
    let tax = 0;
    const breakdown = [];
    const addTier = (amt, rate) => { const t = amt * rate; tax += t; breakdown.push({ amt, rate }); };
    switch ((province || '').toLowerCase()) {
      case 'alberta':
        return { tax: 0, breakdown: [], notes: 'No LTT in AB; separate Land Title & Mortgage Registration fees apply.' };
      case 'ontario': {
        const tiers = [
          { cap: 55000, rate: 0.005 },
          { cap: 250000, rate: 0.01 },
          { cap: 400000, rate: 0.015 },
          { cap: 2000000, rate: 0.02 },
          { cap: Infinity, rate: 0.025 },
        ];
        let remaining = price;
        let last = 0;
        for (const { cap, rate } of tiers) {
          const span = Math.min(remaining, cap - last);
          if (span > 0) addTier(span, rate);
          remaining -= span; last = cap;
          if (remaining <= 0) break;
        }
        if ((city || '').toLowerCase() === 'toronto') {
          tax *= 2;
        }
        return { tax, breakdown };
      }
      case 'british columbia': {
        const tiers = [
          { cap: 200000, rate: 0.01 },
          { cap: 2000000, rate: 0.02 },
          { cap: Infinity, rate: 0.03 },
        ];
        let remaining = price;
        let last = 0;
        for (const { cap, rate } of tiers) {
          const span = Math.min(remaining, cap - last);
          if (span > 0) addTier(span, rate);
          remaining -= span; last = cap;
          if (remaining <= 0) break;
        }
        return { tax, breakdown, notes: 'For residential value over $3M, add further 2% on the overage.' };
      }
      case 'manitoba': {
        const tiers = [
          { cap: 30000, rate: 0.0 },
          { cap: 90000, rate: 0.005 },
          { cap: 150000, rate: 0.01 },
          { cap: 200000, rate: 0.015 },
          { cap: Infinity, rate: 0.02 },
        ];
        let remaining = price;
        let last = 0;
        for (const { cap, rate } of tiers) {
          const span = Math.min(remaining, cap - last);
          if (span > 0) addTier(span, rate);
          remaining -= span; last = cap;
          if (remaining <= 0) break;
        }
        return { tax, breakdown };
      }
      default:
        return { tax: 0, breakdown: [], notes: 'Add your province in canada.js → landTransferTax.' };
    }
  }

  return {
    monthlyRateFromCanadianNominal,
    paymentMonthly,
    frequencyAmountFromMonthly,
    qualifyingRate,
    minDownPayment,
    cmhcPremiumRate,
    addCmhcIfRequired,
    computeGdsTds,
    landTransferTax,
  };
})();

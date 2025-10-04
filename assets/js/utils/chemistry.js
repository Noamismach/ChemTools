import { Fraction, gcdArray, lcmArray, nullspace } from "./math.js";

function parseFormula(formula, elementsMap) {
  if (!formula) throw new Error("נוסחה אינה יכולה להיות ריקה");
  const sanitized = formula.replace(/\s+/g, "");
  const parts = sanitized.split(/[·•\.]/);
  const total = new Map();

  parts.forEach((part) => {
    if (!part) return;
    const { multiplier, index } = readLeadingMultiplier(part);
    const segment = part.slice(index);
    const composition = parseSegment(segment, elementsMap);
    mergeComposition(total, composition, multiplier);
  });

  return mapToObject(total);
}

function parseSegment(segment, elementsMap) {
  if (!segment) throw new Error("נוסחה לא חוקית");

  const stack = [new Map()];
  let i = 0;

  while (i < segment.length) {
    const char = segment[i];

    if (/[({\[]/.test(char)) {
      stack.push(new Map());
      i += 1;
      continue;
    }

    if (/[)}\]]/.test(char)) {
      if (stack.length === 1) throw new Error("סוגריים לא מאוזנים");
      const inner = stack.pop();
      i += 1;
      const { value: count, newIndex } = readNumericValue(segment, i);
      i = newIndex;
      mergeComposition(stack[stack.length - 1], inner, count);
      continue;
    }

    if (/[A-Z]/.test(char)) {
      let symbol = char;
      i += 1;
      while (i < segment.length && /[a-z]/.test(segment[i])) {
        symbol += segment[i];
        i += 1;
      }

      if (!elementsMap.has(symbol)) {
        throw new Error(`היסוד ${symbol} לא נמצא בטבלה המחזורית`);
      }

      const { value: count, newIndex } = readNumericValue(segment, i);
      i = newIndex;
      addToComposition(stack[stack.length - 1], symbol, count);
      continue;
    }

    if (/[0-9]/.test(char)) {
      throw new Error("מקדם יכול להופיע רק בתחילת הנוסחה או אחרי סוגריים");
    }

    throw new Error(`תו לא מוכר בנוסחה: ${char}`);
  }

  if (stack.length !== 1) throw new Error("סוגריים לא מאוזנים");
  return stack[0];
}

function readLeadingMultiplier(part) {
  let index = 0;
  while (index < part.length && /[0-9]/.test(part[index])) {
    index += 1;
  }
  if (index === 0) {
    return { multiplier: 1, index: 0 };
  }
  return { multiplier: parseInt(part.slice(0, index), 10), index };
}

function readNumericValue(segment, index) {
  let i = index;
  while (i < segment.length && /[0-9]/.test(segment[i])) {
    i += 1;
  }
  if (i === index) {
    return { value: 1, newIndex: index };
  }
  return { value: parseInt(segment.slice(index, i), 10), newIndex: i };
}

function addToComposition(map, symbol, count) {
  const current = map.get(symbol) ?? 0;
  map.set(symbol, current + count);
}

function mergeComposition(targetMap, sourceMap, multiplier = 1) {
  sourceMap.forEach((value, key) => {
    const current = targetMap.get(key) ?? 0;
    targetMap.set(key, current + value * multiplier);
  });
}

function mapToObject(map) {
  const obj = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

function calculateMolarMass(composition, elementsMap) {
  return Object.entries(composition).reduce((total, [symbol, count]) => {
    const element = elementsMap.get(symbol);
    if (!element) throw new Error(`היסוד ${symbol} לא נמצא`);
    return total + element.atomicMass * count;
  }, 0);
}

function buildCompositionBreakdown(composition, elementsMap) {
  const molarMass = calculateMolarMass(composition, elementsMap);
  return Object.entries(composition).map(([symbol, count]) => {
    const element = elementsMap.get(symbol);
    const massContribution = element.atomicMass * count;
    return {
      symbol,
      name: element.name,
      count,
      massContribution,
      percent: (massContribution / molarMass) * 100
    };
  });
}

function parseEquation(equation, elementsMap) {
  const normalized = equation
    .replace(/⇌|↔|⇔|<=?>/g, "→")
    .replace(/→/g, "->")
    .replace(/=/g, "->")
    .trim();

  const [left, right] = normalized.split("->");
  if (!left || !right) throw new Error("משוואה חייבת להכיל חץ '->'");

  const reactants = parseEquationSide(left, elementsMap);
  const products = parseEquationSide(right, elementsMap);

  return { reactants, products };
}

function parseEquationSide(side, elementsMap) {
  return side
    .split("+")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((entry) => parseSpecies(entry, elementsMap));
}

function parseSpecies(entry, elementsMap) {
  const cleaned = entry.replace(/\s+/g, "");
  const stateRemoved = cleaned.replace(/\([aqslg]+\)$/i, "");
  const match = stateRemoved.match(/^([0-9]+)?(.+)$/);
  if (!match) throw new Error(`לא ניתן לנתח את המין הכימי: ${entry}`);
  const coefficient = match[1] ? parseInt(match[1], 10) : 1;
  const formula = match[2];
  const composition = parseFormula(formula, elementsMap);
  return { coefficient, formula, composition };
}

function buildStoichiometricMatrix({ reactants, products }) {
  const uniqueElements = new Set();
  const species = [...reactants.map((r) => ({ ...r, side: -1 })), ...products.map((p) => ({ ...p, side: 1 }))];

  species.forEach(({ composition }) => {
    Object.keys(composition).forEach((element) => uniqueElements.add(element));
  });

  const elementList = Array.from(uniqueElements.values());
  const matrix = elementList.map((element) =>
    species.map(({ composition, side }) => (composition[element] ?? 0) * side)
  );

  return { matrix, species, elementList };
}

function balanceEquation(equation, elementsMap) {
  const parsed = parseEquation(equation, elementsMap);
  const { matrix, species } = buildStoichiometricMatrix(parsed);
  const nullspaceBasis = nullspace(matrix);
  const basisVector = nullspaceBasis[0];

  const denominators = basisVector.map((fraction) => fraction.denominator);
  const lcm = lcmArray(denominators);
  const coefficients = basisVector.map((fraction) => (lcm / fraction.denominator) * fraction.numerator);

  const absolute = coefficients.map((value) => (value < 0n ? -value : value));
  const gcd = gcdArray(absolute);
    const scaled = coefficients.map((value) => Number(value / (gcd || 1n)));

    const positiveExists = scaled.some((value) => value > 0);
    const negativeExists = scaled.some((value) => value < 0);

    if (negativeExists && !positiveExists) {
      for (let i = 0; i < scaled.length; i += 1) {
        scaled[i] *= -1;
      }
    }

  const minPositive = scaled.reduce((min, value) => {
    if (value <= 0) return min;
    return Math.min(min, value);
  }, Number.POSITIVE_INFINITY);

    const normalizationFactor = minPositive === Number.POSITIVE_INFINITY ? 1 : minPositive;
  const normalized = scaled.map((value) => value / normalizationFactor);
  const rounded = normalized.map((value) => Math.round(value * 1000) / 1000);

  const asIntegers = normalizeToSmallIntegers(rounded);

  return species.map((speciesEntry, index) => ({
    ...speciesEntry,
    balancedCoefficient: asIntegers[index]
  }));
}

function normalizeToSmallIntegers(values) {
  const decimals = values.map((value) => {
    const str = value.toString();
    const decimalPart = str.split(".")[1];
    return decimalPart ? decimalPart.length : 0;
  });
  const multiplier = 10 ** Math.max(0, ...decimals);
  const scaled = values.map((value) => Math.round(value * multiplier));
  const divisor = Number(gcdArray(scaled.map((value) => BigInt(Math.abs(value)))));
  return scaled.map((value) => value / (divisor || 1));
}

function formatBalancedEquation(balancedSpecies) {
  const reactants = [];
  const products = [];

  balancedSpecies.forEach(({ balancedCoefficient, formula, side }) => {
    const term = balancedCoefficient === 1 ? formula : `${balancedCoefficient}${formula}`;
    if (side < 0) {
      reactants.push(term);
    } else {
      products.push(term);
    }
  });

  return `${reactants.join(" + ")} → ${products.join(" + ")}`;
}

function simplifyRatio(values) {
  const integers = values.map((value) => BigInt(Math.round(value)));
  const divisor = gcdArray(integers.map((num) => (num < 0n ? -num : num)));
  return integers.map((num) => Number(num / (divisor || 1n)));
}

function empiricalFromMasses(masses, elementsMap) {
  const moles = masses.map(({ symbol, mass }) => {
    const element = elementsMap.get(symbol);
    if (!element) throw new Error(`היסוד ${symbol} לא קיים`);
    return { symbol, moles: mass / element.atomicMass };
  });

  const smallest = Math.min(...moles.map((entry) => entry.moles));
  const ratios = moles.map((entry) => entry.moles / smallest);
  const normalized = normalizeToSmallIntegers(ratios);

  return moles.map((entry, index) => ({
    symbol: entry.symbol,
    count: normalized[index]
  }));
}

function molecularFromEmpirical(empiricalFormula, molarMass, elementsMap) {
  const empiricalComposition = empiricalFormula.reduce((acc, { symbol, count }) => {
    acc[symbol] = count;
    return acc;
  }, {});
  const empiricalMass = calculateMolarMass(empiricalComposition, elementsMap);
  const ratio = Math.round(molarMass / empiricalMass);
  return empiricalFormula.map(({ symbol, count }) => ({ symbol, count: count * ratio }));
}

export {
  parseFormula,
  calculateMolarMass,
  buildCompositionBreakdown,
  parseEquation,
  buildStoichiometricMatrix,
  balanceEquation,
  formatBalancedEquation,
  simplifyRatio,
  empiricalFromMasses,
  molecularFromEmpirical
};

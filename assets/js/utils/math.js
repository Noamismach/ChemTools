class Fraction {
  constructor(numerator, denominator = 1n) {
    if (denominator === 0n) {
      throw new Error("מכנה לא יכול להיות אפס");
    }

    let num = BigInt(numerator);
    let den = BigInt(denominator);

    if (den < 0n) {
      num = -num;
      den = -den;
    }

    if (num === 0n) {
      this.numerator = 0n;
      this.denominator = 1n;
      return;
    }

    const divisor = gcdBigInt(num, den);
    this.numerator = num / divisor;
    this.denominator = den / divisor;
  }

  static zero() {
    return new Fraction(0n, 1n);
  }

  static one() {
    return new Fraction(1n, 1n);
  }

  static fromNumber(value, precision = 1e-9) {
    if (Number.isInteger(value)) {
      return new Fraction(BigInt(value), 1n);
    }

    const sign = value < 0 ? -1 : 1;
    let absValue = Math.abs(value);
    let prevDen = 0;
    let den = 1;
    let prevNum = 1;
    let num = Math.floor(absValue);
    let fraction = absValue - num;

    while (Math.abs(num / den - absValue) > precision) {
      if (fraction === 0) break;
      fraction = 1 / fraction;
      const integral = Math.floor(fraction);
      const tmpDen = den;
      den = den * integral + prevDen;
      prevDen = tmpDen;
      const tmpNum = num;
      num = num * integral + prevNum;
      prevNum = tmpNum;
      fraction = fraction - integral;
    }

    return new Fraction(BigInt(sign * num), BigInt(den));
  }

  clone() {
    return new Fraction(this.numerator, this.denominator);
  }

  add(other) {
    const rhs = asFraction(other);
    return new Fraction(
      this.numerator * rhs.denominator + rhs.numerator * this.denominator,
      this.denominator * rhs.denominator
    );
  }

  sub(other) {
    const rhs = asFraction(other);
    return new Fraction(
      this.numerator * rhs.denominator - rhs.numerator * this.denominator,
      this.denominator * rhs.denominator
    );
  }

  mul(other) {
    const rhs = asFraction(other);
    return new Fraction(this.numerator * rhs.numerator, this.denominator * rhs.denominator);
  }

  div(other) {
    const rhs = asFraction(other);
    if (rhs.numerator === 0n) {
      throw new Error("חלוקה באפס");
    }
    return new Fraction(this.numerator * rhs.denominator, this.denominator * rhs.numerator);
  }

  neg() {
    return new Fraction(-this.numerator, this.denominator);
  }

  isZero() {
    return this.numerator === 0n;
  }

  equals(other) {
    const rhs = asFraction(other);
    return this.numerator === rhs.numerator && this.denominator === rhs.denominator;
  }

  toNumber() {
    return Number(this.numerator) / Number(this.denominator);
  }

  toString() {
    if (this.denominator === 1n) {
      return this.numerator.toString();
    }
    return `${this.numerator}/${this.denominator}`;
  }
}

function asFraction(value) {
  if (value instanceof Fraction) return value;
  if (typeof value === "number") return Fraction.fromNumber(value);
  if (typeof value === "bigint") return new Fraction(value, 1n);
  throw new Error("ערך לא ניתן להמרה לשבר");
}

function gcdBigInt(a, b) {
  let x = BigInt(a);
  let y = BigInt(b);
  while (y !== 0n) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x < 0n ? -x : x;
}

function lcmBigInt(a, b) {
  if (a === 0n || b === 0n) {
    return 0n;
  }
  return (BigInt(a) / gcdBigInt(a, b)) * BigInt(b);
}

function gcdArray(values) {
  return values.reduce((acc, value) => {
    if (acc === 0n) return value;
    return gcdBigInt(acc, value);
  }, 0n);
}

function lcmArray(values) {
  return values.reduce((acc, value) => {
    if (acc === 0n) return value;
    return lcmBigInt(acc, value);
  }, 1n);
}

function rref(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result = matrix.map((row) => row.map((value) => value.clone()));
  let lead = 0;

  for (let r = 0; r < rows; r += 1) {
    if (lead >= cols) return result;
    let i = r;

    while (result[i][lead].isZero()) {
      i += 1;
      if (i === rows) {
        i = r;
        lead += 1;
        if (lead === cols) return result;
      }
    }

    swapRows(result, i, r);

    const leadValue = result[r][lead];
    for (let j = 0; j < cols; j += 1) {
      result[r][j] = result[r][j].div(leadValue);
    }

    for (let row = 0; row < rows; row += 1) {
      if (row === r) continue;
      const factor = result[row][lead];
      if (factor.isZero()) continue;
      for (let col = 0; col < cols; col += 1) {
        result[row][col] = result[row][col].sub(factor.mul(result[r][col]));
      }
    }

    lead += 1;
  }

  return result;
}

function nullspace(matrix) {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const fractionMatrix = matrix.map((row) => row.map((value) => new Fraction(BigInt(value), 1n)));
  const reduced = rref(fractionMatrix);

  const pivotColumns = [];
  const isPivot = Array(cols).fill(false);
  let row = 0;

  for (let col = 0; col < cols; col += 1) {
    if (row < rows && !reduced[row][col].isZero()) {
      pivotColumns.push(col);
      isPivot[col] = true;
      row += 1;
    }
  }

  const freeColumns = [];
  for (let col = 0; col < cols; col += 1) {
    if (!isPivot[col]) freeColumns.push(col);
  }

  if (freeColumns.length === 0) {
    return [Array(cols).fill(Fraction.zero())];
  }

  const basis = [];
  freeColumns.forEach((freeCol) => {
    const vector = Array(cols)
      .fill(null)
      .map(() => Fraction.zero());
    vector[freeCol] = Fraction.one();

    pivotColumns.forEach((pivotCol, pivotRow) => {
      vector[pivotCol] = reduced[pivotRow][freeCol].neg();
    });

    basis.push(vector);
  });

  return basis;
}

function swapRows(matrix, i, j) {
  if (i === j) return;
  const temp = matrix[i];
  matrix[i] = matrix[j];
  matrix[j] = temp;
}

function roundTo(value, decimals = 6) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function newtonRaphson({
  fn,
  derivative,
  initialGuess,
  tolerance = 1e-7,
  maxIterations = 100,
  lowerBound = Number.NEGATIVE_INFINITY,
  upperBound = Number.POSITIVE_INFINITY
}) {
  let x = initialGuess;
  for (let i = 0; i < maxIterations; i += 1) {
    const y = fn(x);
    if (Math.abs(y) < tolerance) {
      return x;
    }
    const slope = derivative(x);
    if (Math.abs(slope) < tolerance) {
      break;
    }
    x = clamp(x - y / slope, lowerBound, upperBound);
  }
  throw new Error("השיטה אינה מתכנסת");
}

export {
  Fraction,
  gcdBigInt,
  lcmBigInt,
  gcdArray,
  lcmArray,
  rref,
  nullspace,
  roundTo,
  newtonRaphson,
  clamp
};

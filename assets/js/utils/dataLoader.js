const cache = new Map();

async function loadJson(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`נכשלה טעינת הקובץ: ${url}`);
  }

  const data = await response.json();
  cache.set(url, data);
  return data;
}

async function getElementsData() {
  return loadJson("assets/data/elements.json");
}

async function getEnthalpyData() {
  return loadJson("assets/data/enthalpy.json");
}

export { getElementsData, getEnthalpyData };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || "lotto_draws";
const LOTTO_MAX = 45;
const LOTTO_MAIN_COUNT = 6;

function json(res, statusCode, body) {
  res.status(statusCode).json(body);
}

function buildHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

function validateEnv() {
  const missing = [];
  if (!SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}

function sampleDraw() {
  const pool = Array.from({ length: LOTTO_MAX }, (_, index) => index + 1);

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const mainNumbers = pool.slice(0, LOTTO_MAIN_COUNT).sort((a, b) => a - b);
  const remaining = pool.slice(LOTTO_MAIN_COUNT);
  const bonusNumber = remaining[Math.floor(Math.random() * remaining.length)];

  return { mainNumbers, bonusNumber };
}

async function supabaseFetch(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      ...buildHeaders(),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error_description ||
      payload?.details ||
      `Supabase request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

async function getLatestRound() {
  const rows = await supabaseFetch(
    `/rest/v1/${SUPABASE_TABLE}?select=round_number&order=round_number.desc&limit=1`
  );
  return rows?.[0]?.round_number || 0;
}

async function listDraws(limit = 10) {
  return supabaseFetch(
    `/rest/v1/${SUPABASE_TABLE}?select=round_number,main_numbers,bonus_number,created_at&order=round_number.desc&limit=${limit}`
  );
}

async function insertDraw(draw) {
  const latestRound = await getLatestRound();
  const payload = {
    round_number: latestRound + 1,
    main_numbers: draw.mainNumbers,
    bonus_number: draw.bonusNumber,
  };

  const rows = await supabaseFetch(`/rest/v1/${SUPABASE_TABLE}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return rows?.[0] || null;
}

module.exports = async function handler(req, res) {
  const missingEnv = validateEnv();

  if (missingEnv.length) {
    return json(res, 500, {
      error: `Missing environment variables: ${missingEnv.join(", ")}`,
    });
  }

  try {
    if (req.method === "GET") {
      const draws = await listDraws();
      return json(res, 200, { draws: draws || [] });
    }

    if (req.method === "POST") {
      const sample = sampleDraw();
      const inserted = await insertDraw(sample);

      if (!inserted) {
        throw new Error("Failed to save the draw.");
      }

      return json(res, 200, {
        draw: inserted,
      });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return json(res, 500, {
      error: error.message || "Unknown server error",
    });
  }
};

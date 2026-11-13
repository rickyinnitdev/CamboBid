const maxTokens = 5;
const endpoint = "https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5";

export function parseBakongTokens(value: string) {
  return [
    ...new Set(
      value.split(/[,\r\n]+/).map((token) => token.trim()).filter(Boolean),
    ),
  ];
}

export function validBakongTokens(tokens: string[]) {
  return tokens.length <= maxTokens &&
    tokens.every((token) => /^[A-Za-z0-9._~+\/=-]{10,4096}$/.test(token));
}

export async function checkBakongTransaction(
  md5: string,
  tokens: string[],
  fetchImpl = fetch,
): Promise<Record<string, unknown> | null> {
  for (const token of tokens.slice(0, maxTokens)) {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      redirect: "error",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ md5 }),
      signal: AbortSignal.timeout(4000),
    });
    if ([401, 403, 429].includes(response.status)) {
      await response.body?.cancel();
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("Bakong verification unavailable");
    }
    const result = await response.json();
    if (result?.responseCode === 0) {
      if (!result.data || typeof result.data !== "object") {
        throw new Error("Invalid Bakong receipt");
      }
      return result.data;
    }
    if (
      /unauthori[sz]ed|token.*(expired|invalid)|invalid.*token|rate limit|too many requests|quota/i
        .test(
          String(result?.responseMessage ?? ""),
        )
    ) continue;
    if (result?.errorCode === 1) return null;
    throw new Error("Bakong did not confirm this transaction");
  }
  throw new Error("No Bakong API token could verify the checkout");
}

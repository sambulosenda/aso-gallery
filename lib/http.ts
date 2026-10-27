// fetch with retries for network errors, 429 and 5xx. Apple's endpoints
// occasionally drop connections from CI runners for a few seconds.
export async function fetchWithRetry(url: string, init?: RequestInit, tries = 4): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, init);
      if ((res.status === 429 || res.status >= 500) && attempt < tries) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      if (attempt >= tries) throw e;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
    }
  }
}

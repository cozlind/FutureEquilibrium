function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function retry429<T>(fn: () => Promise<T>, retries = 4) {
  let delay = 200;
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const status = e?.status ?? e?.response?.status;
      if (status !== 429 || i >= retries) throw e;
      await sleep(delay + Math.floor(Math.random() * 120));
      delay = Math.min(delay * 2, 2000);
    }
  }
}

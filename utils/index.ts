import fetch, { Response } from "node-fetch";

export async function fetchWithRetry(
  url: string,
  retries: number = 5,
  delay: number = 2000,
  exponentialBackoff: boolean = true
): Promise<Response> {
  let attempt = 0;

  while (attempt < retries) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();

        if (
          typeof data === "object" &&
          data &&
          (("latt" in data && "longt" in data) ||
            ("alt" in data &&
              typeof data.alt === "object" &&
              data.alt !== null &&
              "loc" in data.alt &&
              typeof data.alt.loc === "object" &&
              data.alt.loc !== null &&
              "latt" in data.alt.loc &&
              "longt" in data.alt.loc))
        ) {
          return new Response(JSON.stringify(data));
        }
      }

      const backoffDelay = exponentialBackoff
        ? Math.min(Math.pow(2, attempt) * delay, 10000)
        : delay;

      if (attempt > 1) {
        console.warn(
          `Attempt ${attempt + 1} failed. Retrying in ${
            backoffDelay / 1000
          } seconds...`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      attempt++;
    } catch (error) {
      if (attempt === retries - 1) {
        throw error;
      }

      const backoffDelay = exponentialBackoff
        ? Math.min(Math.pow(2, attempt) * delay, 10000)
        : delay;

      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      attempt++;
    }
  }

  throw new Error(`Failed to fetch after ${retries} retries`);
}

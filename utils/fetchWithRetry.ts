import fetch, { Response } from "node-fetch";

export async function fetchWithRetry(
  url: string,
  retries: number = 5,
  delay: number = 2000,
  exponentialBackoff: boolean = false
): Promise<Response> {
  let attempt = 0;

  while (attempt < retries) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return response;
      }

      console.warn(
        `Attempt ${attempt + 1} failed with status: ${response.status}`
      );
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed`);

      if (attempt === retries - 1) {
        throw error;
      }
    }

    // Increment the attempt counter
    attempt++;

    // Exponential backoff or fixed delay
    const backoffDelay = exponentialBackoff
      ? Math.pow(2, attempt) * delay
      : delay;

    console.log(`Retrying in ${backoffDelay / 1000} seconds...`);
    await new Promise((resolve) => setTimeout(resolve, backoffDelay));
  }

  throw new Error(`Failed to fetch after ${retries} retries`);
}

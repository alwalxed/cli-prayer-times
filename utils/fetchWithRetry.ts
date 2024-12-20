import fetch, { Response } from "node-fetch";

export async function fetchWithRetry(url: string): Promise<Response> {
  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch (error) {
      if (i === 3 - 1) throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(`Failed to fetch after ${3} retries`);
}

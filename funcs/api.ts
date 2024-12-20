import chalk from "chalk";
import inquirer from "inquirer";
import type { Location } from "../types";
import { fetchWithRetry } from "./fetch";

export const geocode = async (cityName: string): Promise<Location> => {
  let attempt = 0;
  let coordinates: [number, number] | null = null;

  while (attempt < 4 && !coordinates) {
    try {
      const response = await fetchWithRetry(
        `https://geocode.xyz/${encodeURIComponent(cityName)}?json=1`
      );

      const data = (await response.json()) as unknown;

      const getStringProperty = (
        obj: unknown,
        ...path: string[]
      ): string | undefined => {
        let current = obj;
        for (const key of path) {
          if (current && typeof current === "object" && key in current) {
            current = (current as Record<string, unknown>)[key];
          } else {
            return undefined;
          }
        }
        return typeof current === "string" ? current : undefined;
      };

      const parseCoordinates = (
        lat: string | undefined,
        long: string | undefined
      ): [number, number] | null => {
        if (!lat || !long) return null;

        const latitude = parseFloat(lat);
        const longitude = parseFloat(long);

        if (isNaN(latitude) || isNaN(longitude)) return null;
        if (latitude < -90 || latitude > 90) return null;
        if (longitude < -180 || longitude > 180) return null;

        return [latitude, longitude];
      };

      const errorDescription = getStringProperty(data, "error", "description");
      if (errorDescription) {
        throw new Error(errorDescription);
      }

      coordinates = parseCoordinates(
        getStringProperty(data, "latt"),
        getStringProperty(data, "longt")
      );

      if (!coordinates) {
        coordinates = parseCoordinates(
          getStringProperty(data, "alt", "loc", "latt"),
          getStringProperty(data, "alt", "loc", "longt")
        );
      }

      if (!coordinates) {
        throw new Error("Could not find valid coordinates in the response");
      }

      const cityNameFromResponse =
        getStringProperty(data, "standard", "city") ||
        getStringProperty(data, "alt", "loc", "city") ||
        cityName;

      return {
        latitude: coordinates[0],
        longitude: coordinates[1],
        name: cityNameFromResponse,
      };
    } catch (error) {
      if (attempt === 3) {
        console.error(
          chalk.red("Error: Could not find valid coordinates after 4 attempts.")
        );
        const { retry } = await inquirer.prompt<{ retry: boolean }>([
          {
            type: "confirm",
            name: "retry",
            message:
              "We were unable to fetch valid coordinates. Would you like to try again?",
            default: true,
          },
        ]);
        if (!retry) {
          process.exit(1);
        }
      }
    }
    attempt++;
  }
  throw new Error("Failed to retrieve coordinates after multiple attempts.");
};

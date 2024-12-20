#!/usr/bin/env node

import chalk from "chalk";
import Table from "cli-table3";
import { program } from "commander";
import fs from "fs";
import inquirer from "inquirer";
import os from "os";
import path from "path";
import { calculatePrayerTimes } from "zero-deps-prayer-times";
import type { ExtraInfo, PrayerTimes } from "zero-deps-prayer-times/types";
import { fetchWithRetry } from "./utils";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface Location extends Coordinates {
  name: string;
}

const CONFIG_PATH = path.join(
  os.homedir(),
  ".config",
  "prayers",
  "config.json"
);

const config = {
  read: (): Location | null => {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    } catch {
      return null;
    }
  },

  write: (data: Location): void => {
    const dir = path.dirname(CONFIG_PATH);
    !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data));
  },
};

const geocode = async (cityName: string): Promise<Location> => {
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
        // If the final attempt fails, ask the user to try again
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
          process.exit(1); // Exit if the user chooses not to retry
        }
      }
    }
    attempt++;
  }
  throw new Error("Failed to retrieve coordinates after multiple attempts.");
};

const getPrayerTimes = (date: Date, location: Location) => {
  const result = calculatePrayerTimes(date, location, {
    convention: "Umm al-Qura University, Makkah",
    hanafiAsr: false,
  });

  if (!result?.data) {
    throw new Error("Failed to calculate prayer times");
  }

  return result.data;
};

const formatTimeLeft = (seconds: number | null): string => {
  if (seconds === null) return "Next day's first prayer";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  hours > 0 && parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  minutes > 0 &&
    parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);

  return parts.join(" and ");
};

const displayPrayerTimes = (
  prayerData: {
    prayers: PrayerTimes;
    extras: ExtraInfo;
  },
  location: Location
): void => {
  const table = new Table({ colWidths: [10, 10, 10, 10, 10] });
  const { prayers, extras } = prayerData;

  table.push(
    Object.keys(prayers)
      .slice(0, 5)
      .map((name) => chalk.whiteBright(name.toUpperCase())),
    Object.values(prayers)
      .slice(0, 5)
      .map(({ formatted12H }) => formatted12H)
  );
  console.log(table.toString());

  const { nextPrayer } = extras;
  console.log(
    `${chalk.yellow(
      formatTimeLeft(nextPrayer.remainingSeconds).toUpperCase()
    )} ` +
      `until ${chalk.bold(nextPrayer.name.toUpperCase())} ` +
      `in ${location.name}`
  );
};

const setupCLI = async (): Promise<{ changeCity?: boolean }> => {
  program
    .version("1.0.0")
    .option("-c, --change-city", "Change the city")
    .parse(process.argv);

  return program.opts();
};

const main = async (): Promise<void> => {
  try {
    const options = await setupCLI();
    let location = config.read();

    if (!location || options.changeCity) {
      const { city: cityName } = await inquirer.prompt<{ city: string }>([
        {
          type: "input",
          name: "city",
          message: "Enter your city name:",
          validate: (input: string) =>
            input.trim().length > 0 || "City name cannot be empty",
        },
      ]);

      location = await geocode(cityName.trim());
      config.write(location);
    }

    const prayerData = getPrayerTimes(new Date(), location);
    displayPrayerTimes(prayerData, location);
  } catch (error) {
    console.error(
      chalk.red("Error:"),
      error instanceof Error ? error.message : "Unknown error"
    );
    console.log(chalk.yellow("Please try again or check your connection."));
    process.exit(1);
  }
};

main();

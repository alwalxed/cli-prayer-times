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
import { fetchWithRetry } from "./utils/fetchWithRetry";

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface Location extends Coordinates {
  name: string;
}

interface Prayer {
  name: string;
  formatted12H: string;
  remainingSeconds: number | null;
}

interface GeocodingResponse {
  latt: string;
  longt: string;
  error?: {
    description: string;
  };
  standard?: {
    city: string;
  };
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
  const response = await fetchWithRetry(
    `https://geocode.xyz/${encodeURIComponent(cityName)}?json=1`
  );

  const data = (await response.json()) as GeocodingResponse;

  if (data.error) {
    throw new Error(data.error.description || "City not found");
  }

  const latitude = parseFloat(data.latt);
  const longitude = parseFloat(data.longt);

  if (isNaN(latitude) || isNaN(longitude)) {
    throw new Error("Invalid coordinates received");
  }

  return {
    latitude,
    longitude,
    name: data?.standard?.city || cityName,
  };
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

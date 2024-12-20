#!/usr/bin/env node

import chalk from "chalk";
import fs from "fs";
import inquirer from "inquirer";
import os from "os";
import path from "path";
import { geocode } from "./funcs/api";
import { displayPrayerTimes } from "./funcs/display";
import { getPrayerTimes } from "./funcs/prayers";
import { setupCLI } from "./funcs/setup";
import type { Location } from "./types";

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

import chalk from "chalk";
import CliTable3 from "cli-table3";
import type { ExtraInfo, PrayerTimes } from "zero-deps-prayer-times/types";
import type { Location } from "../types";
import { formatTimeLeft } from "./format";

export const displayPrayerTimes = (
  prayerData: {
    prayers: PrayerTimes;
    extras: ExtraInfo;
  },
  location: Location
): void => {
  const table = new CliTable3({ colWidths: [10, 10, 10, 10, 10] });
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

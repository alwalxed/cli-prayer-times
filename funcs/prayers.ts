import { calculatePrayerTimes } from "zero-deps-prayer-times";
import type { Location } from "../types";

export const getPrayerTimes = (date: Date, location: Location) => {
  const result = calculatePrayerTimes(date, location, {
    convention: "Umm al-Qura University, Makkah",
    hanafiAsr: false,
  });

  if (!result?.data) {
    throw new Error("Failed to calculate prayer times");
  }

  return result.data;
};

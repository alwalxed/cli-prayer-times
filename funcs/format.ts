export const formatTimeLeft = (seconds: number | null): string => {
  if (seconds === null) return "Next day's first prayer";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  hours > 0 && parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  minutes > 0 &&
    parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);

  return parts.join(" and ");
};

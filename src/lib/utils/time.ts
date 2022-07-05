const ONE_SEC = 1;
const ONE_MIN = ONE_SEC * 60;
const ONE_HR = ONE_MIN * 60;
const ONE_DAY = ONE_HR * 24;

type TimeUnit = "sec" | "min" | "hr" | "day";

type TimeStringOptions = {
  separator?: string;
};

function timeToStr(
  amount: number,
  unit: TimeUnit,
  options: TimeStringOptions = {
    separator: "",
  }
) {
  const pluralizedUnit = amount === 1 ? unit : `${unit}s`;
  return `${amount}${options.separator}${pluralizedUnit}`;
}

function getTimeUnits(seconds: number) {
  const secondsPart = Math.ceil(seconds % ONE_MIN);
  const minutesPart = Math.floor((seconds / ONE_MIN) % ONE_MIN);
  const hoursPart = Math.floor((seconds / ONE_HR) % 24);
  const daysPart = Math.floor(seconds / ONE_DAY);

  return [
    daysPart && timeToStr(daysPart, "day"),
    hoursPart && timeToStr(hoursPart, "hr"),
    minutesPart && timeToStr(minutesPart, "min"),
    secondsPart && timeToStr(secondsPart, "sec"),
  ].filter(Boolean);
}

export function secondsToString(
  seconds: number,
  options: TimeStringOptions = { separator: "" }
) {
  const secondsCeil = Math.ceil(seconds);
  if (secondsCeil < ONE_MIN) {
    return timeToStr(secondsCeil, "sec", options);
  }

  if (seconds < ONE_HR) {
    const minutesCeil = Math.ceil(seconds / ONE_MIN);
    return timeToStr(minutesCeil, "min", options);
  }

  if (seconds < ONE_DAY) {
    const hoursCeil = Math.ceil(seconds / ONE_HR);
    return timeToStr(hoursCeil, "hr", options);
  }

  const daysCeil = Math.ceil(seconds / ONE_DAY);
  return timeToStr(daysCeil, "day", options);
}

// first 2 units
export function secondsToMidString(seconds: number) {
  return getTimeUnits(seconds).slice(0, 2).join(" ");
}

export function secondsToLongString(seconds: number) {
  return getTimeUnits(seconds).join(" ");
}

export function getTimeLeft(createdAt: number, totalTimeInSeconds: number) {
  const millisecondsElapsed = Date.now() - createdAt;

  if (millisecondsElapsed > totalTimeInSeconds * 1000) return 0;

  return totalTimeInSeconds - millisecondsElapsed / 1000;
}

/**
 * Returns localized `MM dd, hh:mm a` from ISO string
 */
export function formatDateTime(isoString: string) {
  const localDateTime = new Date(isoString);

  return localDateTime.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

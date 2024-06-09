// TODO does RRULE have a built-in mapping for this?
import { Frequency } from "rrule";
import { Weekday } from "./Repeat.types";

export const frequencyTextMapping = {
  [Frequency.YEARLY]: "Yearly",
  [Frequency.MONTHLY]: "Monthly",
  [Frequency.WEEKLY]: "Weekly",
  [Frequency.DAILY]: "Daily",
  [Frequency.HOURLY]: "Hourly",
  [Frequency.MINUTELY]: "Minutely",
  [Frequency.SECONDLY]: "Secondly",
};

export const weekdayFullTextMapping = {
  [Weekday.MO]: "Monday",
  [Weekday.TU]: "Tuesday",
  [Weekday.WE]: "Wednesday",
  [Weekday.TH]: "Thursday",
  [Weekday.FR]: "Friday",
  [Weekday.SA]: "Saturday",
  [Weekday.SU]: "Sunday",
};

export const weekdayShortTextMapping = {
  [Weekday.MO]: "Mon",
  [Weekday.TU]: "Tue",
  [Weekday.WE]: "Wed",
  [Weekday.TH]: "Thu",
  [Weekday.FR]: "Fri",
  [Weekday.SA]: "Sat",
  [Weekday.SU]: "Sun",
};
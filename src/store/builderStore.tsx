import { create } from "zustand";
import * as Yup from "yup";
import { Frequency, RRule } from "rrule";
import { DateTime } from "luxon";
import { WeekdayStr } from "rrule/dist/esm/weekday";
import isNil from "lodash/isNil";

import {
  AllRepeatDetails, MonthBy, Weekday, YearlyBy,
} from "../components/Repeat/Repeat.types";
import getValidationSchema from "../validation/validationSchema";
import { EndDetails, EndType } from "../components/End/End.types";
import { buildRRuleString } from "../utils/buildRRuleString";

interface BuilderState {
  repeatDetails: AllRepeatDetails;
  frequency: Frequency;
  startDate: DateTime | null;
  validationErrors: Record<string, string>;
  endDetails: EndDetails;
  RRuleString?: string;
  radioValue: MonthBy | YearlyBy | null,
}

interface BuilderActions {
  validationErrors: Record<string, string>;
  setFrequency: (frequency: Frequency) => void;
  setRepeatDetails: (details: AllRepeatDetails) => void;
  validateForm: () => Promise<boolean>;
  setEndDetails: (details: EndDetails) => void;
  setStartDate: (startDate: DateTime | null) => void;
  buildRRuleString: () => void;
  onChange?: (rruleString: string) => void;
  setOnChange: (onChange: (rruleString: string) => void) => void;
  setStoreFromRRuleString: (rruleString: string) => void;
  setRadioValue: (radioValue: MonthBy | YearlyBy | null) => void;
}

export const baseRepeatDetails: AllRepeatDetails = {
  interval: 1,
  bySetPos: [],
  byMonth: [],
  byMonthDay: [],
  byDay: [],
};

const initialState: BuilderState = {
  repeatDetails: baseRepeatDetails,
  frequency: Frequency.WEEKLY,
  startDate: null,
  validationErrors: {},
  endDetails: { endingType: EndType.NEVER, endDate: null, occurrences: null },
  radioValue: null,
};

const useBuilderStore = create<BuilderState & BuilderActions>((set, get) => ({
  ...initialState,
  validationErrors: {},
  setRadioValue: (radioValue) => set({ radioValue }),
  setFrequency: (frequency) => {
    set({ frequency });
    // clear repeat details when changing frequency
    set({ repeatDetails: initialState.repeatDetails });
    // clear validation errors
    set({ validationErrors: {} });
    // rebuild the rrule string
    get().buildRRuleString();
  },
  setStartDate: (startDate) => {
    const { endDate } = get().endDetails;
    // don't allow end date to be before start date, add one 1 day
    if (endDate && startDate && startDate > endDate) {
      set({ endDetails: { ...get().endDetails, endDate: startDate.plus({ days: 1 }) } });
    }

    // set the value
    set({ startDate });
    // clear validation errors
    set({ validationErrors: {} });
    // rebuild the rrule string
    get().buildRRuleString();
  },
  setEndDetails: (details) => {
    set({ endDetails: details });

    // rebuild the rrule string
    get().buildRRuleString();
  },
  setRepeatDetails: (details) => {
    set({ repeatDetails: details });
    // rebuild the rrule string
    get().buildRRuleString();
  },
  validateForm: async () => {
    const { repeatDetails, frequency } = get();
    if (!frequency) {
      set({ validationErrors: { frequency: "Frequency is required" } });
      return false;
    }
    const validationSchema = getValidationSchema(frequency);
    try {
      await validationSchema.validate({ ...repeatDetails, frequency }, { abortEarly: false });
      set({ validationErrors: {} });
      return true;
    } catch (error) {
      const errors = (error as Yup.ValidationError).inner.reduce(
        (acc: Record<string, string>, err) => ({
          ...acc,
          [err.path!]: err.message,
        }),
        {},
      );
      set({ validationErrors: errors });
      return false;
    }
  },
  buildRRuleString: () => {
    const {
      repeatDetails, frequency, startDate, endDetails,
    } = get();

    const output = buildRRuleString({
      frequency,
      startDate,
      repeatDetails,
      endDetails,
    });

    set({ RRuleString: output });

    // if there is an onChange function, call it with the output
    const { onChange } = get();
    if (onChange) onChange(output);
  },
  setOnChange: (onChange) => set({ onChange }),
  setStoreFromRRuleString: (rruleString) => {
    const parsedObj = RRule.parseString(rruleString);
    const {
      setFrequency, setStartDate, setEndDetails, setRepeatDetails,
    } = get();

    // set the frequency
    if (!isNil(parsedObj.freq)) {
      setFrequency(parsedObj.freq);
      if (parsedObj.freq === Frequency.YEARLY) {
        if (parsedObj.byweekday || parsedObj.bysetpos) {
          set({ radioValue: YearlyBy.BYSETPOS });
        } else if (parsedObj.bymonth || parsedObj.bymonthday) {
          set({ radioValue: YearlyBy.BYMONTH });
        }
      } else if (parsedObj.freq === Frequency.MONTHLY) {
        if (parsedObj.bymonthday) {
          set({ radioValue: MonthBy.BYMONTHDAY });
        } else if (parsedObj.bysetpos || parsedObj.byweekday) {
          set({ radioValue: MonthBy.BYSETPOS });
        }
      }
    }
    // set the start date
    if (parsedObj.dtstart) {
      setStartDate(DateTime.fromJSDate(parsedObj.dtstart));
    }

    // set the end date
    if (parsedObj.until) {
      setEndDetails({ endingType: EndType.ON, endDate: DateTime.fromJSDate(parsedObj.until), occurrences: null });
    } else if (parsedObj.count) {
      setEndDetails({ endingType: EndType.AFTER, occurrences: parsedObj.count, endDate: null });
    }

    // set the repeat details
    const repeatDetails: AllRepeatDetails = {
      interval: parsedObj.interval ?? null,
      byDay: [],
      byMonthDay: [],
      byMonth: [],
      bySetPos: [],
    };

    // set the byMonth
    if (parsedObj.bymonth) {
      if (!Array.isArray(parsedObj.bymonth)) {
        repeatDetails.byMonth = [parsedObj.bymonth];
      } else {
        repeatDetails.byMonth = parsedObj.bymonth;
      }
    }

    // set the byMonthDay
    if (parsedObj.bymonthday) {
      if (!Array.isArray(parsedObj.bymonthday)) {
        repeatDetails.byMonthDay = [parsedObj.bymonthday];
      } else {
        repeatDetails.byMonthDay = parsedObj.bymonthday;
      }
    }

    // set the byDay (by weekday)
    if (parsedObj.byweekday) {
      if (!Array.isArray(parsedObj.byweekday)) {
        repeatDetails.byDay = [parsedObj.byweekday as Weekday];
      } else {
        repeatDetails.byDay = parsedObj.byweekday.map((day) => {
          if (typeof day !== "number") {
            // @ts-ignore
            return Weekday[day];
          }
          // TODO what is the number parse to weekday?
          return day as unknown as WeekdayStr;
        });
      }
    }

    // set the bySetPos
    if (parsedObj.bysetpos) {
      if (!Array.isArray(parsedObj.bysetpos)) {
        repeatDetails.bySetPos = [parsedObj.bysetpos];
      } else {
        repeatDetails.bySetPos = parsedObj.bysetpos;
      }
    }

    setRepeatDetails(repeatDetails);
  },
}));

export default useBuilderStore;

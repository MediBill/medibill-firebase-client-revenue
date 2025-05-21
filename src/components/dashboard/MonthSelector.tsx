"use client";

import type { FC } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface MonthOption {
  value: string; // "YYYY-MM"
  label: string; // "Month YYYY"
}

interface MonthSelectorProps {
  selectedMonthYear: string;
  onMonthChange: (monthYear: string) => void;
  availableMonths: MonthOption[];
  disabled?: boolean;
}

export const MonthSelector: FC<MonthSelectorProps> = ({
  selectedMonthYear,
  onMonthChange,
  availableMonths,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 p-4 bg-card/50 rounded-lg shadow-sm">
      <Label htmlFor="month-select" className="text-base font-medium text-foreground whitespace-nowrap">
        Reporting Month:
      </Label>
      <Select value={selectedMonthYear} onValueChange={onMonthChange} disabled={disabled}>
        <SelectTrigger 
          id="month-select" 
          className="w-full sm:w-[260px] bg-background border-border focus:ring-primary text-base"
          aria-label="Select reporting month"
        >
          <SelectValue placeholder="Select a month" />
        </SelectTrigger>
        <SelectContent className="bg-popover text-popover-foreground">
          {availableMonths.map((month) => (
            <SelectItem 
              key={month.value} 
              value={month.value} 
              className="hover:bg-accent/80 focus:bg-accent/80 text-base"
            >
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

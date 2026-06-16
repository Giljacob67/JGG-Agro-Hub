import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  MapPin,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAllMatters } from "@/hooks/use-crm-queries";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDateStr(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

interface Hearing {
  matterId: string;
  matterTitle: string;
  clientName: string;
  date: string;
  type: string;
  status: string;
  court: string;
}

export default function CalendarPage() {
  usePageTitle("Calendário de Audiências");

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    formatDateStr(today)
  );

  const { data: matters } = useAllMatters();

  const hearings: Hearing[] = useMemo(() => {
    if (!matters) return [];
    const items = (matters as any).items || matters || [];
    return items
      .filter((m: any) => m.nextHearingDate)
      .map((m: any) => ({
        matterId: m.id,
        matterTitle: m.title || m.number || m.id,
        clientName: m.clientName || "",
        date: m.nextHearingDate as string,
        type: m.type || "",
        status: m.status || "",
        court: m.court || "",
      }));
  }, [matters]);

  const hearingsByDate = useMemo(() => {
    const map: Record<string, Hearing[]> = {};
    hearings.forEach((h: Hearing) => {
      if (!map[h.date]) map[h.date] = [];
      map[h.date].push(h);
    });
    return map;
  }, [hearings]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const selectedHearings = selectedDate ? hearingsByDate[selectedDate] || [] : [];

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <CalendarDays className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Calendário de Audiências</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={prevMonth}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-sm font-semibold capitalize">{monthName}</h2>
                <Button variant="ghost" size="sm" onClick={nextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-muted-foreground mb-2">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-px">
                {calendarDays.map((day, i) => {
                  if (day === null) return <div key={`empty-${i}`} />;

                  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isToday = dateStr === formatDateStr(today);
                  const isSelected = dateStr === selectedDate;
                  const hasHearing = !!hearingsByDate[dateStr];
                  const hearingCount = hearingsByDate[dateStr]?.length || 0;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`
                        relative h-14 sm:h-16 flex flex-col items-center justify-start pt-1 rounded text-sm transition
                        ${isSelected ? "bg-primary text-primary-foreground ring-2 ring-primary" : ""}
                        ${isToday && !isSelected ? "bg-accent font-bold" : ""}
                        ${hasHearing && !isSelected ? "bg-blue-50 dark:bg-blue-950/30" : ""}
                        hover:bg-accent
                      `}
                    >
                      <span>{day}</span>
                      {hearingCount > 0 && (
                        <span className="absolute bottom-1 flex gap-0.5">
                          {Array.from({ length: Math.min(hearingCount, 3) }).map((_, j) => (
                            <span
                              key={j}
                              className="w-1.5 h-1.5 rounded-full bg-blue-500"
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          <div>
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">
                {selectedDate
                  ? `Audiências — ${parseDateStr(selectedDate).toLocaleDateString("pt-BR")}`
                  : "Selecione um dia"}
              </h3>

              {selectedHearings.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {selectedDate ? "Nenhuma audiência para esta data" : ""}
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedHearings.map((h) => (
                    <div
                      key={h.matterId}
                      className="border border-border rounded-lg p-3 space-y-1"
                    >
                      <p className="text-sm font-medium">{h.matterTitle}</p>
                      {h.clientName && (
                        <p className="text-xs text-muted-foreground">{h.clientName}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {h.date}
                        </span>
                        {h.court && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {h.court}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 pt-1">
                        {h.type && <Badge variant="secondary" className="text-[10px]">{h.type}</Badge>}
                        <Badge variant="outline" className="text-[10px]">{h.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4 mt-4">
              <h3 className="text-sm font-semibold mb-2">Resumo do mês</h3>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Total de audiências</span>
                  <span className="font-semibold text-foreground">
                    {Object.values(hearingsByDate)
                      .flat()
                      .filter((h) => {
                        const d = parseDateStr(h.date);
                        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                      }).length}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

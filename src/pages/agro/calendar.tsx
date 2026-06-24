import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useMeetings,
  useCreateMeeting,
  useDeleteMeeting,
} from "@/hooks/use-crm-queries";
import type { Meeting } from "@shared/agro/types";

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

export default function CalendarPage() {
  usePageTitle("Calendário de Reuniões");

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    formatDateStr(today)
  );
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data: meetings } = useMeetings();
  const createMeeting = useCreateMeeting();
  const deleteMeeting = useDeleteMeeting();

  const meetingsByDate = useMemo(() => {
    const map: Record<string, Meeting[]> = {};
    (meetings ?? []).forEach((m) => {
      if (!map[m.date]) map[m.date] = [];
      map[m.date].push(m);
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""))
    );
    return map;
  }, [meetings]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const selectedMeetings = selectedDate ? meetingsByDate[selectedDate] || [] : [];

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

  const resetForm = () => {
    setFormTitle("");
    setFormTime("");
    setFormLocation("");
    setFormDescription("");
    setFormError(null);
    setShowForm(false);
  };

  const handleCreate = () => {
    setFormError(null);
    if (!formTitle.trim()) {
      setFormError("Informe um título");
      return;
    }
    if (!selectedDate) {
      setFormError("Selecione um dia no calendário");
      return;
    }
    createMeeting.mutate(
      {
        title: formTitle.trim(),
        date: selectedDate,
        time: formTime || null,
        location: formLocation.trim() || null,
        description: formDescription.trim() || null,
      },
      {
        onSuccess: () => resetForm(),
        onError: (err) =>
          setFormError(err instanceof Error ? err.message : "Erro ao criar reunião"),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteMeeting.mutate(id);
  };

  const monthCount = Object.values(meetingsByDate)
    .flat()
    .filter((m) => {
      const d = parseDateStr(m.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Calendário de Reuniões</h1>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setShowForm(true);
              setFormError(null);
            }}
            disabled={!selectedDate}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nova reunião
          </Button>
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
                  const hasMeeting = !!meetingsByDate[dateStr];
                  const meetingCount = meetingsByDate[dateStr]?.length || 0;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={`
                        relative h-14 sm:h-16 flex flex-col items-center justify-start pt-1 rounded text-sm transition
                        ${isSelected ? "bg-primary text-primary-foreground ring-2 ring-primary" : ""}
                        ${isToday && !isSelected ? "bg-accent font-bold" : ""}
                        ${hasMeeting && !isSelected ? "bg-blue-50 dark:bg-blue-950/30" : ""}
                        hover:bg-accent
                      `}
                    >
                      <span>{day}</span>
                      {meetingCount > 0 && (
                        <span className="absolute bottom-1 flex gap-0.5">
                          {Array.from({ length: Math.min(meetingCount, 3) }).map((_, j) => (
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
                  ? `Reuniões — ${parseDateStr(selectedDate).toLocaleDateString("pt-BR")}`
                  : "Selecione um dia"}
              </h3>

              {selectedMeetings.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {selectedDate ? "Nenhuma reunião para esta data" : ""}
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedMeetings.map((m) => (
                    <div
                      key={m.id}
                      className="border border-border rounded-lg p-3 space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{m.title}</p>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="text-muted-foreground hover:text-destructive transition shrink-0"
                          title="Excluir reunião"
                          disabled={deleteMeeting.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {m.description && (
                        <p className="text-xs text-muted-foreground">{m.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {m.time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {m.time}
                          </span>
                        )}
                        {m.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {m.location}
                          </span>
                        )}
                      </div>
                      {m.createdByName && (
                        <Badge variant="secondary" className="text-[10px]">
                          {m.createdByName}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4 mt-4">
              <h3 className="text-sm font-semibold mb-2">Resumo do mês</h3>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Total de reuniões</span>
                  <span className="font-semibold text-foreground">{monthCount}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nova reunião</h2>
              <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Data:{" "}
              <span className="font-medium text-foreground">
                {selectedDate ? parseDateStr(selectedDate).toLocaleDateString("pt-BR") : "—"}
              </span>
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">Título *</label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Reunião com cliente"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Horário</label>
                <input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Local</label>
                <input
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Escritório / Online"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Descrição</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Pauta da reunião"
                />
              </div>
            </div>

            {formError && <p className="text-xs text-destructive">{formError}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={resetForm}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={createMeeting.isPending}>
                {createMeeting.isPending ? "Salvando..." : "Criar"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface ExportClient {
  name: string;
  email: string | null;
  phone: string | null;
  level: string | null;
  goals: string | null;
  created_at: string;
  bookingsCount?: number;
  lastBooking?: string | null;
}

export interface ExportBooking {
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  session_date: string;
  session_type: string;
  status: string;
  goals: string | null;
  notes: string | null;
}

const escapeCSV = (value: string | null | undefined): string => {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

export const exportClientsToCSV = (clients: ExportClient[]): void => {
  const headers = [
    "Nom",
    "Email",
    "Téléphone",
    "Niveau",
    "Objectifs",
    "Date d'inscription",
    "Nombre de séances",
    "Dernière séance",
  ];

  const getLevelLabel = (level: string | null) => {
    switch (level) {
      case "beginner": return "Débutant";
      case "intermediate": return "Intermédiaire";
      case "advanced": return "Avancé";
      default: return "Non défini";
    }
  };

  const rows = clients.map((client) => [
    escapeCSV(client.name),
    escapeCSV(client.email),
    escapeCSV(client.phone),
    escapeCSV(getLevelLabel(client.level)),
    escapeCSV(client.goals),
    escapeCSV(format(new Date(client.created_at), "dd/MM/yyyy", { locale: fr })),
    String(client.bookingsCount || 0),
    client.lastBooking 
      ? escapeCSV(format(new Date(client.lastBooking), "dd/MM/yyyy", { locale: fr }))
      : "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  downloadCSV(csvContent, `clients-${format(new Date(), "yyyy-MM-dd")}.csv`);
};

export const exportBookingsToCSV = (bookings: ExportBooking[]): void => {
  const headers = [
    "Client",
    "Email",
    "Téléphone",
    "Date",
    "Heure",
    "Type de séance",
    "Statut",
    "Objectifs",
    "Notes",
  ];

  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case "individual": return "Individuelle";
      case "duo": return "Duo";
      case "group": return "Groupe";
      case "outdoor": return "Extérieur";
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed": return "Confirmé";
      case "pending": return "En attente";
      case "cancelled": return "Annulé";
      default: return status;
    }
  };

  const rows = bookings.map((booking) => [
    escapeCSV(booking.clientName),
    escapeCSV(booking.clientEmail),
    escapeCSV(booking.clientPhone),
    escapeCSV(format(new Date(booking.session_date), "dd/MM/yyyy", { locale: fr })),
    escapeCSV(format(new Date(booking.session_date), "HH:mm", { locale: fr })),
    escapeCSV(getSessionTypeLabel(booking.session_type)),
    escapeCSV(getStatusLabel(booking.status)),
    escapeCSV(booking.goals),
    escapeCSV(booking.notes),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  downloadCSV(csvContent, `reservations-${format(new Date(), "yyyy-MM-dd")}.csv`);
};

const downloadCSV = (content: string, filename: string): void => {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

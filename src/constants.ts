import { Type } from "@google/genai";

export interface Question {
  id: number;
  enunciado: string;
  respuesta: string;
  pasos: string;
  categoria: string;
  opciones?: string[];
}

export type Subject = 'matematiques' | 'llengua' | 'ciencies' | 'angles' | 'personalitzat';

export const SUBJECTS: { id: Subject, label: string, icon: string }[] = [
  { id: 'matematiques', label: 'Matemàtiques', icon: '🔢' },
  { id: 'llengua', label: 'Llengua Valenciana', icon: '✍️' },
  { id: 'ciencies', label: 'Ciències Naturals', icon: '🌿' },
  { id: 'angles', label: 'Anglés', icon: '🇬🇧' },
  { id: 'personalitzat', label: 'Tema lliure', icon: '✨' },
];

export const PREMIOS = [
  100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000
];

export const COLORS = [
  "bg-rose-400",
  "bg-sky-400",
  "bg-emerald-400",
  "bg-amber-400"
];

export const BORDER_COLORS = [
  "border-rose-500",
  "border-sky-500",
  "border-emerald-500",
  "border-amber-500"
];

export const TEXT_COLORS = [
  "text-rose-600",
  "text-sky-600",
  "text-emerald-600",
  "text-amber-600"
];

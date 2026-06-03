import type { PromptTemplate } from "./templates";

export type StoredTemplates = PromptTemplate[] | { templates: PromptTemplate[] };

export type VariableImage = {
  name: string;
  dataUrl: string;
};

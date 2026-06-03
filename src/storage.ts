export const keys = {
  templates: "chatgpt_image_prompt_templates_v1",
  selectedTemplateId: "prompt_generator_selected_template_id",
  variableValues: "prompt_generator_variable_values",
  variableImages: "prompt_generator_variable_images",
  variableOrder: "prompt_generator_variable_order",
  finalPrompt: "prompt_generator_final_prompt"
};

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

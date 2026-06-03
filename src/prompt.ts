export function extractVariables(templateText: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const pattern = /\{([^{}\n]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(templateText)) !== null) {
    const name = match[1].trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }

  return names;
}

export function buildPrompt(templateText: string, values: Record<string, string>): string {
  return templateText.replace(/\{([^{}]+)\}/g, (match, varName) => {
    const value = values[varName]?.trim();
    return value ? `{${value}}` : match;
  });
}

export function getVariableOrder(
  savedOrder: string[] | undefined,
  variables: string[]
): string[] {
  const currentSet = new Set(variables);
  const filtered = Array.isArray(savedOrder)
    ? savedOrder.filter((name) => currentSet.has(name))
    : [];

  return [...filtered, ...variables.filter((name) => !filtered.includes(name))];
}

export function moveVariable(
  order: string[],
  draggedName: string,
  targetName: string,
  position: "before" | "after"
): string[] {
  if (draggedName === targetName) return order;

  const next = order.filter((name) => name !== draggedName);
  const targetIndex = next.indexOf(targetName);
  if (targetIndex < 0) return order;

  next.splice(position === "after" ? targetIndex + 1 : targetIndex, 0, draggedName);
  return next;
}

export function stripExtension(filename: string): string {
  return filename.replace(/\.[^.]+$/, "");
}

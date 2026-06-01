export function parseJsonObject(rawText: string): unknown {
  const trimmed = stripCodeFence(rawText.trim());

  try {
    return JSON.parse(trimmed);
  } catch {
    const extracted = extractFirstJsonValue(trimmed);
    if (extracted === undefined) {
      throw new SyntaxError("No JSON value found in model response.");
    }

    return JSON.parse(extracted);
  }
}

function stripCodeFence(value: string): string {
  const match = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match?.[1]?.trim() ?? value;
}

function extractFirstJsonValue(value: string): string | undefined {
  const start = findFirstJsonStart(value);
  if (start === -1) {
    return undefined;
  }

  const opener = value[start];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = start; index < value.length; index += 1) {
    const char = value[index];

    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (char === "\\") {
        escaping = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
    } else if (char === opener) {
      depth += 1;
    } else if (char === closer) {
      depth -= 1;
      if (depth === 0) {
        return value.slice(start, index + 1);
      }
    }
  }

  return undefined;
}

function findFirstJsonStart(value: string): number {
  const objectStart = value.indexOf("{");
  const arrayStart = value.indexOf("[");

  if (objectStart === -1) {
    return arrayStart;
  }

  if (arrayStart === -1) {
    return objectStart;
  }

  return Math.min(objectStart, arrayStart);
}

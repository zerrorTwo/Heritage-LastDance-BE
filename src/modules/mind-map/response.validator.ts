import { Injectable } from '@nestjs/common';

type MindMapNode = {
  id: string;
  label: string;
  description?: string;
  children: MindMapNode[];
};

type MindMapResponse = {
  title: string;
  mindMap: MindMapNode;
};

type ValidationResult =
  | { valid: true; data: MindMapResponse }
  | { valid: false; errors: string[] };

@Injectable()
export class ResponseValidator {
  private readonly MAX_LABEL_LENGTH = 120;
  private readonly MAX_DESCRIPTION_LENGTH = 2000;
  private readonly MAX_DEPTH = 4;

  validate(rawText: string): ValidationResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return {
        valid: false,
        errors: ['Response is not valid JSON'],
      };
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        valid: false,
        errors: ['Response must be a JSON object'],
      };
    }

    const obj = parsed as Record<string, unknown>;
    const errors: string[] = [];

    if (typeof obj.title !== 'string' || !obj.title.trim()) {
      errors.push('Missing or invalid "title" field');
    }

    if (!obj.mindMap || typeof obj.mindMap !== 'object' || Array.isArray(obj.mindMap)) {
      errors.push('Missing or invalid "mindMap" field');
      return { valid: false, errors };
    }

    this.validateNode(obj.mindMap as MindMapNode, 1, new Set<string>(), errors);

    if (errors.length > 0) {
      return { valid: false, errors };
    }

    return {
      valid: true,
      data: {
        title: obj.title as string,
        mindMap: obj.mindMap as MindMapNode,
      },
    };
  }

  private validateNode(
    node: unknown,
    depth: number,
    ids: Set<string>,
    errors: string[],
  ): void {
    if (!node || typeof node !== 'object') {
      errors.push(`Invalid node at depth ${depth}`);
      return;
    }

    const n = node as Record<string, unknown>;

    if (typeof n.id !== 'string' || !n.id.trim()) {
      errors.push(`Node at depth ${depth} is missing a valid "id"`);
    } else if (ids.has(n.id as string)) {
      errors.push(`Duplicate node id "${n.id}"`);
    } else {
      ids.add(n.id as string);
    }

    if (typeof n.label !== 'string' || !n.label.trim()) {
      errors.push(`Node "${n.id || '?'}" is missing a valid "label"`);
    } else if ((n.label as string).length > this.MAX_LABEL_LENGTH) {
      errors.push(
        `Node "${n.id}" label is too long (${(n.label as string).length} chars, max ${this.MAX_LABEL_LENGTH})`,
      );
    }

    if (n.description !== undefined && typeof n.description !== 'string') {
      errors.push(`Node "${n.id}" description must be a string`);
    } else if (
      typeof n.description === 'string' &&
      n.description.length > this.MAX_DESCRIPTION_LENGTH
    ) {
      errors.push(
        `Node "${n.id}" description is too long (${n.description.length} chars, max ${this.MAX_DESCRIPTION_LENGTH})`,
      );
    }

    if (!Array.isArray(n.children)) {
      errors.push(`Node "${n.id}" children must be an array`);
      return;
    }

    if (depth > this.MAX_DEPTH) {
      errors.push(
        `Mind map exceeds maximum depth of ${this.MAX_DEPTH} (found depth ${depth})`,
      );
    }

    for (const child of n.children as unknown[]) {
      this.validateNode(child, depth + 1, ids, errors);
    }
  }
}

import { Injectable } from '@nestjs/common';
import { BattleQuizQuestion, BattleTimeline } from './types';

type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; errorType: string; errors: string[] };

const ALLOWED_OUTCOMES = new Set(['attacker_victory', 'defender_victory', 'stalemate']);
const ALLOWED_TERRAIN = new Set(['hill', 'river', 'forest', 'plain', 'fortification', 'town', 'coast']);
const ALLOWED_SIDES = new Set(['attacker', 'defender']);
const ALLOWED_ENTITIES = new Set(['infantry', 'cavalry', 'artillery', 'commander', 'base', 'tank', 'naval', 'air']);
const ALLOWED_STATUS = new Set(['idle', 'moving', 'attacking', 'defending', 'retreating', 'destroyed']);
const ALLOWED_ACTIONS = new Set(['move', 'attack', 'bombard', 'capture', 'retreat', 'surround', 'victory']);
const ALLOWED_EFFECTS = new Set(['explosion', 'smoke', 'flag_change', 'victory_burst']);

@Injectable()
export class BattleTimelineValidator {
  parseAndValidate(rawText: string): ValidationResult<BattleTimeline> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(this.stripCodeFence(rawText));
    } catch {
      return { valid: false, errorType: 'parse_failure', errors: ['Response is not valid JSON'] };
    }

    return this.validateTimeline(parsed);
  }

  validateTimeline(input: unknown): ValidationResult<BattleTimeline> {
    const errors: string[] = [];
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return { valid: false, errorType: 'schema_validation', errors: ['Timeline must be an object'] };
    }

    const timeline = input as BattleTimeline;
    const mapWidth = Number(timeline.map?.width ?? 900);
    const mapHeight = Number(timeline.map?.height ?? 600);

    if (!timeline.battle || typeof timeline.battle !== 'object') errors.push('Missing battle object');
    if (!timeline.map || typeof timeline.map !== 'object') errors.push('Missing map object');
    if (!Array.isArray(timeline.factions) || timeline.factions.length < 2) errors.push('At least 2 factions are required');
    if (!Array.isArray(timeline.entities) || timeline.entities.length === 0) errors.push('At least 1 entity is required');
    if (!Array.isArray(timeline.steps) || timeline.steps.length < 4) errors.push('At least 4 steps are required');
    if (timeline.steps?.length > 8) errors.push('No more than 8 steps are allowed');

    if (timeline.battle?.outcome && !ALLOWED_OUTCOMES.has(timeline.battle.outcome)) {
      errors.push(`Invalid battle.outcome "${timeline.battle.outcome}"`);
    }

    for (const terrain of timeline.map?.terrain ?? []) {
      if (!terrain.id) errors.push('Terrain item missing id');
      if (!ALLOWED_TERRAIN.has(terrain.type)) errors.push(`Invalid terrain type "${terrain.type}"`);
      this.validateCoordinate('terrain', terrain.x, terrain.y, mapWidth, mapHeight, errors);
    }

    const factionIds = new Set<string>();
    for (const faction of timeline.factions ?? []) {
      if (!faction.id) errors.push('Faction missing id');
      factionIds.add(faction.id);
      if (!ALLOWED_SIDES.has(faction.side)) errors.push(`Invalid faction side "${faction.side}"`);
      if (!/^#[0-9a-fA-F]{6}$/.test(faction.color ?? '')) errors.push(`Invalid faction color for "${faction.id}"`);
    }

    const entityIds = new Set<string>();
    for (const entity of timeline.entities ?? []) {
      if (!entity.id) errors.push('Entity missing id');
      entityIds.add(entity.id);
      if (!factionIds.has(entity.faction_id)) errors.push(`Entity "${entity.id}" references missing faction "${entity.faction_id}"`);
      if (!ALLOWED_ENTITIES.has(entity.type)) errors.push(`Invalid entity type "${entity.type}"`);
      this.validateCoordinate(`entity "${entity.id}" initial`, entity.initial_x, entity.initial_y, mapWidth, mapHeight, errors);
    }

    timeline.steps?.forEach((step, index) => {
      if (step.step !== index + 1) errors.push(`Step number ${step.step} should be ${index + 1}`);
      if (!Array.isArray(step.entity_states) || step.entity_states.length !== entityIds.size) {
        errors.push(`Step ${step.step} must contain entity_states for every entity`);
      }

      const stateIds = new Set<string>();
      for (const state of step.entity_states ?? []) {
        if (!entityIds.has(state.entity_id)) errors.push(`Step ${step.step} state references missing entity "${state.entity_id}"`);
        if (stateIds.has(state.entity_id)) errors.push(`Step ${step.step} has duplicate state for "${state.entity_id}"`);
        stateIds.add(state.entity_id);
        if (!ALLOWED_STATUS.has(state.status)) errors.push(`Invalid status "${state.status}" in step ${step.step}`);
        this.validateCoordinate(`step ${step.step} state "${state.entity_id}"`, state.x, state.y, mapWidth, mapHeight, errors);
      }

      for (const entityId of entityIds) {
        if (!stateIds.has(entityId)) errors.push(`Step ${step.step} is missing state for "${entityId}"`);
      }

      for (const action of step.actions ?? []) {
        if (!ALLOWED_ACTIONS.has(action.type)) errors.push(`Invalid action type "${action.type}" in step ${step.step}`);
        if (!entityIds.has(action.actor_id)) errors.push(`Action in step ${step.step} references missing actor "${action.actor_id}"`);
        if (action.target_id && action.target_id === action.actor_id) errors.push(`Action in step ${step.step} targets itself`);
        this.validateCoordinate(`step ${step.step} action.from`, action.from?.x, action.from?.y, mapWidth, mapHeight, errors);
        this.validateCoordinate(`step ${step.step} action.to`, action.to?.x, action.to?.y, mapWidth, mapHeight, errors);
      }

      const hasAttackOrBombard = (step.actions ?? []).some((a) => a.type === 'attack' || a.type === 'bombard');
      for (const effect of step.effects ?? []) {
        if (!ALLOWED_EFFECTS.has(effect.type)) errors.push(`Invalid effect type "${effect.type}" in step ${step.step}`);
        this.validateCoordinate(`step ${step.step} effect`, effect.x, effect.y, mapWidth, mapHeight, errors);
        if (effect.type === 'flag_change' && !hasAttackOrBombard) {
          errors.push(`Step ${step.step} has flag_change without attack/bombard action`);
        }
      }

      if (index > 0) {
        const previous = timeline.steps[index - 1];
        for (const state of step.entity_states ?? []) {
          const previousState = previous.entity_states?.find((s) => s.entity_id === state.entity_id);
          if (!previousState || !previousState.visible || !state.visible) continue;
          const delta = Math.hypot(state.x - previousState.x, state.y - previousState.y);
          if (delta > 200) errors.push(`Entity "${state.entity_id}" moves ${Math.round(delta)}px into step ${step.step}`);
        }
      }
    });

    const finalStep = timeline.steps?.[timeline.steps.length - 1];
    if (!finalStep?.actions?.some((action) => action.type === 'victory')) {
      errors.push('Final step must contain a victory action');
    }
    timeline.steps?.slice(0, -1).forEach((step) => {
      if (step.actions?.some((action) => action.type === 'victory')) {
        errors.push(`Victory action may only appear in final step, found in step ${step.step}`);
      }
    });

    if (errors.length > 0) {
      return { valid: false, errorType: 'schema_validation', errors };
    }

    return { valid: true, data: timeline };
  }

  parseAndValidateQuiz(rawText: string): ValidationResult<BattleQuizQuestion[]> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(this.stripCodeFence(rawText));
    } catch {
      return { valid: false, errorType: 'quiz_parse_failure', errors: ['Quiz response is not valid JSON'] };
    }

    if (!Array.isArray(parsed) || parsed.length !== 10) {
      return { valid: false, errorType: 'quiz_validation', errors: ['Quiz must be an array of exactly 10 questions'] };
    }

    const errors: string[] = [];
    parsed.forEach((item, index) => {
      const q = item as BattleQuizQuestion;
      if (!q.id) errors.push(`Question ${index + 1} missing id`);
      if (!q.question) errors.push(`Question ${index + 1} missing question`);
      if (!Array.isArray(q.options) || q.options.length !== 4) errors.push(`Question ${index + 1} must have 4 options`);
      if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) errors.push(`Question ${index + 1} has invalid correct index`);
      if (!q.explanation) errors.push(`Question ${index + 1} missing explanation`);
    });

    return errors.length
      ? { valid: false, errorType: 'quiz_validation', errors }
      : { valid: true, data: parsed as BattleQuizQuestion[] };
  }

  countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  private validateCoordinate(
    label: string,
    x: unknown,
    y: unknown,
    width: number,
    height: number,
    errors: string[],
  ) {
    if (typeof x !== 'number' || typeof y !== 'number') {
      errors.push(`${label} has invalid coordinates`);
      return;
    }
    if (x < 0 || x > width || y < 0 || y > height) {
      errors.push(`${label} coordinates out of bounds`);
    }
  }

  private stripCodeFence(rawText: string): string {
    return rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
}

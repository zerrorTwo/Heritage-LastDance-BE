export type BattleOutcome = 'attacker_victory' | 'defender_victory' | 'stalemate';
export type TerrainType = 'hill' | 'river' | 'forest' | 'plain' | 'fortification' | 'town' | 'coast';
export type FactionSide = 'attacker' | 'defender';
export type EntityType = 'infantry' | 'cavalry' | 'artillery' | 'commander' | 'base' | 'tank' | 'naval' | 'air';
export type EntityStatus = 'idle' | 'moving' | 'attacking' | 'defending' | 'retreating' | 'destroyed';
export type BattleActionType = 'move' | 'attack' | 'bombard' | 'capture' | 'retreat' | 'surround' | 'victory';
export type BattleEffectType = 'explosion' | 'smoke' | 'flag_change' | 'victory_burst';

export type Point = {
  x: number;
  y: number;
};

export type BattleTerrain = {
  id: string;
  type: TerrainType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type BattleFaction = {
  id: string;
  name: string;
  side: FactionSide;
  color: string;
};

export type BattleEntity = {
  id: string;
  faction_id: string;
  type: EntityType;
  label: string;
  initial_x: number;
  initial_y: number;
};

export type BattleEntityState = {
  entity_id: string;
  x: number;
  y: number;
  visible: boolean;
  status: EntityStatus;
};

export type BattleAction = {
  type: BattleActionType;
  actor_id: string;
  target_id?: string;
  from: Point;
  to: Point;
  label?: string;
};

export type BattleEffect = {
  type: BattleEffectType;
  x: number;
  y: number;
  target_id?: string;
};

export type BattleTimelineStep = {
  step: number;
  title: string;
  time_label: string;
  narration: string;
  entity_states: BattleEntityState[];
  actions: BattleAction[];
  effects: BattleEffect[];
};

export type BattleTimeline = {
  battle: {
    id: string;
    name: string;
    date: string;
    outcome: BattleOutcome;
    summary: string;
  };
  map: {
    width: number;
    height: number;
    terrain: BattleTerrain[];
  };
  factions: BattleFaction[];
  entities: BattleEntity[];
  steps: BattleTimelineStep[];
};

export type BattleQuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

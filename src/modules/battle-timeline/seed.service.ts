import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BattleTimelineVoiceStatus } from './model';
import { BattleTimelineBattleRepository } from './repository';
import { BattleTimeline } from './types';

const DIEN_BIEN_PHU_PHASE_1: BattleTimeline = {
  battle: {
    id: 'dien-bien-phu-phase-1',
    name: 'Dien Bien Phu - Phase 1',
    date: '13 March 1954',
    outcome: 'attacker_victory',
    summary:
      'A compact tactical opening phase of Dien Bien Phu, showing Viet Minh deployment, hidden artillery, and the first pressure on Strongpoint Beatrice.',
  },
  map: {
    width: 900,
    height: 600,
    terrain: [
      { id: 'western_hills', type: 'hill', label: 'Western Hills', x: 50, y: 80, width: 190, height: 160 },
      { id: 'valley_plain', type: 'plain', label: 'Dien Bien Valley', x: 260, y: 170, width: 320, height: 240 },
      { id: 'nam_yum', type: 'river', label: 'Nam Yum River', x: 360, y: 430, width: 250, height: 42 },
      { id: 'beatrice', type: 'fortification', label: 'Strongpoint Beatrice', x: 610, y: 220, width: 100, height: 82 },
      { id: 'central_hq', type: 'fortification', label: 'French HQ', x: 540, y: 350, width: 110, height: 86 },
    ],
  },
  factions: [
    { id: 'vpa', name: 'Viet Minh', side: 'attacker', color: '#C76A35' },
    { id: 'french', name: 'French Union Forces', side: 'defender', color: '#2B4FA8' },
  ],
  entities: [
    { id: 'vpa_312', faction_id: 'vpa', type: 'infantry', label: '312th Division', initial_x: 95, initial_y: 280 },
    { id: 'vpa_artillery', faction_id: 'vpa', type: 'artillery', label: 'Hidden Artillery', initial_x: 120, initial_y: 190 },
    { id: 'vpa_command', faction_id: 'vpa', type: 'commander', label: 'Giap Command', initial_x: 150, initial_y: 330 },
    { id: 'fr_beatrice', faction_id: 'french', type: 'base', label: 'Beatrice Garrison', initial_x: 640, initial_y: 250 },
    { id: 'fr_battery', faction_id: 'french', type: 'artillery', label: 'French Battery', initial_x: 560, initial_y: 390 },
    { id: 'fr_command', faction_id: 'french', type: 'commander', label: 'French HQ', initial_x: 560, initial_y: 350 },
  ],
  steps: [
    {
      step: 1,
      title: 'Hidden Deployment',
      time_label: 'Dawn, 13 March 1954',
      narration:
        'Viet Minh troops occupy the surrounding hills while French forces hold Beatrice and the central command area. The opening phase focuses on hidden artillery and pressure from the high ground.',
      entity_states: [
        { entity_id: 'vpa_312', x: 95, y: 280, visible: true, status: 'idle' },
        { entity_id: 'vpa_artillery', x: 120, y: 190, visible: true, status: 'idle' },
        { entity_id: 'vpa_command', x: 150, y: 330, visible: true, status: 'idle' },
        { entity_id: 'fr_beatrice', x: 640, y: 250, visible: true, status: 'defending' },
        { entity_id: 'fr_battery', x: 560, y: 390, visible: true, status: 'idle' },
        { entity_id: 'fr_command', x: 560, y: 350, visible: true, status: 'idle' },
      ],
      actions: [],
      effects: [],
    },
    {
      step: 2,
      title: 'Approach Trenches',
      time_label: 'Morning, 13 March 1954',
      narration:
        'The 312th Division advances from concealed positions toward the valley. French defenders remain fixed around Beatrice while artillery crews prepare for counterfire.',
      entity_states: [
        { entity_id: 'vpa_312', x: 210, y: 285, visible: true, status: 'moving' },
        { entity_id: 'vpa_artillery', x: 150, y: 205, visible: true, status: 'idle' },
        { entity_id: 'vpa_command', x: 180, y: 320, visible: true, status: 'idle' },
        { entity_id: 'fr_beatrice', x: 640, y: 250, visible: true, status: 'defending' },
        { entity_id: 'fr_battery', x: 560, y: 390, visible: true, status: 'idle' },
        { entity_id: 'fr_command', x: 560, y: 350, visible: true, status: 'idle' },
      ],
      actions: [
        {
          type: 'move',
          actor_id: 'vpa_312',
          from: { x: 95, y: 280 },
          to: { x: 210, y: 285 },
          label: '312th advances from hills',
        },
      ],
      effects: [{ type: 'smoke', x: 245, y: 285, target_id: 'valley_plain' }],
    },
    {
      step: 3,
      title: 'First Artillery Shock',
      time_label: 'Afternoon, 13 March 1954',
      narration:
        'Viet Minh artillery opens fire from the hills, striking Strongpoint Beatrice and revealing the threat the French command had underestimated.',
      entity_states: [
        { entity_id: 'vpa_312', x: 280, y: 280, visible: true, status: 'attacking' },
        { entity_id: 'vpa_artillery', x: 150, y: 205, visible: true, status: 'attacking' },
        { entity_id: 'vpa_command', x: 190, y: 320, visible: true, status: 'idle' },
        { entity_id: 'fr_beatrice', x: 640, y: 250, visible: true, status: 'defending' },
        { entity_id: 'fr_battery', x: 560, y: 390, visible: true, status: 'defending' },
        { entity_id: 'fr_command', x: 560, y: 350, visible: true, status: 'idle' },
      ],
      actions: [
        {
          type: 'bombard',
          actor_id: 'vpa_artillery',
          target_id: 'fr_beatrice',
          from: { x: 150, y: 205 },
          to: { x: 640, y: 250 },
          label: 'Artillery hits Beatrice',
        },
        {
          type: 'attack',
          actor_id: 'vpa_312',
          target_id: 'fr_beatrice',
          from: { x: 280, y: 280 },
          to: { x: 600, y: 255 },
          label: 'Infantry pressure begins',
        },
      ],
      effects: [
        { type: 'explosion', x: 630, y: 240, target_id: 'beatrice' },
        { type: 'smoke', x: 650, y: 265, target_id: 'beatrice' },
      ],
    },
  ],
};

@Injectable()
export class BattleTimelineSeedService implements OnModuleInit {
  private readonly logger = new Logger(BattleTimelineSeedService.name);

  constructor(private readonly battleRepo: BattleTimelineBattleRepository) {}

  async onModuleInit() {
    const existing = await this.battleRepo.findBySlug(DIEN_BIEN_PHU_PHASE_1.battle.id);
    if (existing) return;

    await this.battleRepo.create({
      slug: DIEN_BIEN_PHU_PHASE_1.battle.id,
      name: DIEN_BIEN_PHU_PHASE_1.battle.name,
      battleDate: DIEN_BIEN_PHU_PHASE_1.battle.date,
      outcome: DIEN_BIEN_PHU_PHASE_1.battle.outcome,
      summary: DIEN_BIEN_PHU_PHASE_1.battle.summary,
      timeline: DIEN_BIEN_PHU_PHASE_1,
      userId: null,
      pointsDeducted: 0,
      voiceStatus: BattleTimelineVoiceStatus.NONE,
    });

    this.logger.log(`Seeded ${DIEN_BIEN_PHU_PHASE_1.battle.name}`);
  }
}

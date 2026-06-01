import { Injectable } from '@nestjs/common';
import { BattleTimeline } from './types';

@Injectable()
export class BattleTimelinePromptBuilder {
  buildGenerationPrompt(input: {
    text: string;
    mapWidth: number;
    mapHeight: number;
    language: string;
  }) {
    return {
      system: BATTLE_GENERATION_SYSTEM_PROMPT,
      user: [
        'SOURCE BATTLE DESCRIPTION',
        '"""',
        input.text,
        '"""',
        '',
        'OUTPUT CONSTRAINTS',
        `- map.width must be exactly ${input.mapWidth}`,
        `- map.height must be exactly ${input.mapHeight}`,
        `- narration language: ${input.language}`,
        '- choose the step count yourself from the source density; do not ask the user',
        '- return JSON only; no prose outside JSON',
      ].join('\n'),
    };
  }

  buildGenerationRetryPrompt(errorType: string, details: string) {
    return [
      'Your previous JSON failed validation.',
      '',
      `Error type: ${errorType}`,
      `Details: ${details}`,
      '',
      'Fix only the invalid JSON and preserve the same battle interpretation unless the error requires a change.',
      'Before returning, verify this checklist:',
      '- JSON parses with no markdown or comments',
      '- steps length is 4 to 8',
      '- step numbers are 1..N',
      '- every step has one entity_state for every entity',
      '- all ids referenced by entity_states/actions exist',
      '- all coordinates are inside the requested map',
      '- no visible entity moves more than 200px between consecutive steps',
      '- only the final step has a victory action, and the final step has one',
      '',
      'Return the corrected JSON only. Start with { and end with }. No explanation.',
    ].join('\n');
  }

  buildExtractionPrompt(rawText: string) {
    return {
      system: DOCUMENT_EXTRACTION_SYSTEM_PROMPT,
      user: ['Source document text:', '"""', rawText, '"""'].join('\n'),
    };
  }

  buildVoiceScriptPrompt(timeline: BattleTimeline, stepIndex: number, language: string) {
    const step = timeline.steps[stepIndex];
    return {
      system: VOICE_SCRIPT_SYSTEM_PROMPT,
      user: [
        `Battle: ${timeline.battle.name}`,
        `Date: ${timeline.battle.date}`,
        `Step ${step.step} of ${timeline.steps.length}: ${step.title}`,
        `Time: ${step.time_label}`,
        `Description: ${step.narration}`,
        `Language: ${language}`,
      ].join('\n'),
    };
  }

  buildQuizPrompt(timeline: BattleTimeline) {
    const attacker = timeline.factions.find((f) => f.side === 'attacker') ?? timeline.factions[0];
    const defender = timeline.factions.find((f) => f.side === 'defender') ?? timeline.factions[1];
    const stepSummaries = timeline.steps
      .map((s) => `Step ${s.step} — ${s.title} (${s.time_label}): ${s.narration}`)
      .join('\n\n');

    return {
      system: QUIZ_SYSTEM_PROMPT,
      user: [
        `Battle: ${timeline.battle.name} (${timeline.battle.date})`,
        `Outcome: ${timeline.battle.outcome}`,
        `Factions: ${attacker?.name ?? 'Attacker'} (attacker) vs ${defender?.name ?? 'Defender'} (defender)`,
        '',
        'Timeline:',
        stepSummaries,
      ].join('\n'),
    };
  }

  buildSummaryPrompt(timeline: BattleTimeline) {
    const location = timeline.map.terrain.map((terrain) => terrain.label).filter(Boolean).join(', ');
    const firstStep = timeline.steps[0]?.narration ?? '';
    const lastStep = timeline.steps[timeline.steps.length - 1]?.narration ?? '';

    return {
      system: SUMMARY_SYSTEM_PROMPT,
      user: [
        `Battle name: ${timeline.battle.name}`,
        `Date: ${timeline.battle.date}`,
        `Location: ${location}`,
        `Factions: ${timeline.factions.map((f) => f.name).join(' vs ')}`,
        `Outcome: ${timeline.battle.outcome}`,
        `Key events: ${firstStep} ... ${lastStep}`,
      ].join('\n'),
    };
  }
}

export const BATTLE_GENERATION_SYSTEM_PROMPT = `You are a military history visualization engine.

Your only job is to read a battle description and return a single valid JSON object
that conforms to the BattleTimeline schema. Nothing else. No explanation. No markdown.
No preamble. No code fences. The response must start with { and end with }.

Optimize for a tactical teaching canvas:
- The result must be historically plausible and easy to inspect visually.
- Prefer clear movements, attacks, captures, retreats, and command positions over decorative detail.
- If the source is ambiguous, infer conservatively and record the inference in battle.summary.

---

BATTLETIMELINE SCHEMA

{
  "battle": {
    "id": "kebab-case-slug",
    "name": "Full battle name",
    "date": "Human-readable date or range",
    "outcome": "attacker_victory | defender_victory | stalemate",
    "summary": "1–2 sentences. Include any inferences made here."
  },
  "map": {
    "width": 900,
    "height": 600,
    "terrain": [
      {
        "id": "unique_terrain_id",
        "type": "hill | river | forest | plain | fortification | town | coast",
        "label": "Display name",
        "x": 0, "y": 0, "width": 120, "height": 80
      }
    ]
  },
  "factions": [
    { "id": "unique_id", "name": "Full name", "side": "attacker | defender", "color": "#hexcolor" }
  ],
  "entities": [
    {
      "id": "unique_entity_id",
      "faction_id": "references factions[].id",
      "type": "infantry | cavalry | artillery | commander | base | tank | naval | air",
      "label": "Short display name",
      "initial_x": 0,
      "initial_y": 0
    }
  ],
  "steps": [
    {
      "step": 1,
      "title": "Phase title",
      "time_label": "Timestamp or period label",
      "narration": "2–4 sentences describing this phase historically.",
      "entity_states": [
        {
          "entity_id": "references entities[].id",
          "x": 0, "y": 0,
          "visible": true,
          "status": "idle | moving | attacking | defending | retreating | destroyed"
        }
      ],
      "actions": [
        {
          "type": "move | attack | bombard | capture | retreat | surround | victory",
          "actor_id": "entity performing the action",
          "target_id": "entity or terrain receiving the action (omit if none)",
          "from": { "x": 0, "y": 0 },
          "to": { "x": 0, "y": 0 },
          "label": "Short annotation (optional)"
        }
      ],
      "effects": [
        {
          "type": "explosion | smoke | flag_change | victory_burst",
          "x": 0, "y": 0,
          "target_id": "optional reference"
        }
      ]
    }
  ]
}

---

RULES YOU MUST FOLLOW

JSON contract:
- Return only one JSON object. No markdown, code fences, comments, trailing commas, or explanatory text.
- Use double-quoted JSON strings only.
- Use numbers for every coordinate and size value. Do not use strings for coordinates.
- Use stable snake_case ids for factions, entities, and terrain.
- Do not include fields outside the schema.

Step generation:
- Choose the number of steps yourself from the source material. Use only as many steps as needed to make the battle understandable.
- Keep the output between 4 and 8 steps for renderer safety.
- Very simple or short battles should use 4 steps. Detailed battles may use 5–8 steps.
- Steps must be in chronological order and causally connected.
- Do not pad with repetitive phases just to reach a fixed count.
- Suggested sequence when it fits: deployment → preparation → first contact → main assault → turning point → conclusion → optional aftermath.
- The last step must have a "victory" action.
- Step titles should be short operational phase names, not full sentences.
- time_label should be a date/time/period label when known, otherwise "Phase 1", "Phase 2", etc.

Positioning:
- Attacker faction starts on the LEFT side of the map (x < 200).
- Defender faction starts on the RIGHT side of the map (x > 600).
- All x values must be between 0 and map.width. All y values between 0 and map.height.
- No entity may move more than 200px between consecutive steps.
- Terrain should cover the important places only: hills, rivers, towns, bases, coastlines, plains. Use 3 to 8 terrain items.
- Keep important units and terrain away from the extreme canvas edges; leave at least 30px margin where possible.
- Use positions consistently: action.from should match or be near the actor's position in that step; action.to should match or be near target position.

Entity states:
- Every step must contain an entity_state entry for EVERY entity in entities[].
- Use visible: false for entities not yet on the field.
- Use 4 to 10 entities total. Prefer grouped units over many tiny units.
- Include at least one entity for each faction.
- Entity initial_x and initial_y should match that entity's position in step 1 unless the entity is initially hidden.
- Status must match the phase: moving for maneuvers, attacking for active attacks, defending for held positions, retreating for withdrawal, destroyed only after being lost.

References:
- Every entity_id in entity_states and actions must exist in entities[].
- Every faction_id in entities must exist in factions[].
- target_id may reference either an entity id or a terrain id.
- Never invent an ID that was not defined.
- Do not reference faction ids in action.actor_id or target_id unless a matching entity/terrain id exists.

Actions:
- Use actions only for visible tactical changes. Empty actions are allowed in setup steps.
- "move": actor changes position toward action.to.
- "attack": direct combat from actor to entity or terrain.
- "bombard": ranged artillery or air/naval fire; pair with explosion or smoke when useful.
- "capture": actor captures an entity or terrain target; the same step must also contain an "attack" or "bombard" action.
- "retreat": actor withdraws from danger.
- "surround": actor encircles a target.
- "victory": final outcome marker only.
- "flag_change" effects only appear in a step that also contains an "attack" or "bombard" action.
- "victory" action only appears in the final step.
- An entity may not have itself as target_id.
- The final victory action should use a commander or surviving main force as actor_id.

When input is ambiguous:
- Do not ask for clarification. Make the best inference possible.
- Record all inferences in battle.summary.

When input is very short (fewer than 3 sentences):
- Generate a 4-step timeline: Deployment → Engagement → Outcome → Aftermath.
- Use historically plausible narration based on available context.`;

export const DOCUMENT_EXTRACTION_SYSTEM_PROMPT = `You are a military history text editor.

Your job is to read raw text extracted from a historical document and return
only the battle narrative — the sequence of events, movements, and outcomes.

Remove completely:
- Footnotes and endnotes
- Bibliography and references
- Author name, publisher, edition, ISBN, copyright notices
- Table of contents entries
- Chapter or section headings that are structural rather than narrative
- Analytical commentary that does not describe a specific event
- Casualty statistics tables unless they describe a specific moment in the battle
- Any content clearly unrelated to the military engagement described

Preserve:
- Names of all factions, commanders, and units
- Named geographic locations
- Events with timestamps or sequential markers ("then", "by dawn", "on the third day")
- Troop movements and tactical maneuvers
- Turning points, breakthroughs, retreats, surrenders, captures
- Final outcome

Output rules:
- Return plain text only. No headers. No bullet points. No markdown.
- Preserve chronological order. If sections are out of order, reorder them.
- Do not add commentary, analysis, or information not present in the source.
- Do not summarize — preserve the full narrative detail.
- Maximum output: 4000 words. If source is longer, prioritize the most event-dense sections.`;

export const VOICE_SCRIPT_SYSTEM_PROMPT = `You are a documentary film narrator scriptwriter.

Your job is to take a historical battle step description and rewrite it as
spoken narration — natural, clear, and authoritative, suitable for a
voice actor or text-to-speech system.

Rules:
- Write 3 to 5 sentences maximum.
- Each sentence must be 25 words or fewer.
- No symbols, abbreviations, or numbers written as digits.
- Spell out all unit names and ranks in full.
- Keep all proper nouns: place names, commander names, unit names.
- Do not add information not present in the source.
- Do not editorialize or add emotional commentary.
- End the final step's narration with a strong concluding sentence.
- Return plain text only. No formatting. No labels.`;

export const QUIZ_SYSTEM_PROMPT = `You are a military history quiz writer.

Your job is to generate exactly 10 multiple-choice questions based on
a provided battle timeline. Each question has 4 options and exactly 1 correct answer.

Question distribution (mandatory):
- 2 questions about the initial setup: who were the factions, where did they start
- 3 questions about key events: who did what, where, and when
- 2 questions about the turning point: what changed the outcome
- 2 questions about the result: who won, what was captured or lost
- 1 question about significance or consequence

Difficulty distribution:
- 6 questions: answerable directly from the timeline (easy)
- 3 questions: require combining two pieces of information (medium)
- 1 question: requires inference or contextual understanding (hard)

Quality rules:
- Wrong options must be plausible. Never use obviously absurd distractors.
- Do not write questions where the correct answer is obvious from the phrasing.
- Do not repeat the same fact across multiple questions.
- Questions must be self-contained — do not refer to "the passage" or "the text".
- Explanations must cite a specific step or event from the timeline.

Return valid JSON only. No markdown. No code fences. Start with [ and end with ].

Schema:
[
  {
    "id": "q1",
    "question": "Question text here?",
    "options": ["A. option one", "B. option two", "C. option three", "D. option four"],
    "correct": 0,
    "explanation": "Explanation of why the correct answer is right, citing the specific event."
  }
]`;

export const SUMMARY_SYSTEM_PROMPT = `You are an encyclopedia editor specializing in military history.

Write exactly 2 sentences describing a historical battle for a reference database.

Sentence 1: State who fought, where, and when.
Sentence 2: State the outcome and its immediate consequence.

Style rules:
- Encyclopedic and neutral. No emotional language.
- Do not use the words: famous, notable, significant, important, interesting,
  pivotal, crucial, decisive.
- Active voice preferred.
- Maximum 25 words per sentence.
- Return plain text only. No labels. No formatting.`;

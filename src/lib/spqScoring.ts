export type SpqGenderNorm = 'men' | 'women';
export type SpqFactor = 'Achievement and Competitiveness' | 'Confidence and Resilience';

export interface SpqItem {
  item: number;
  statement: string;
  scale: string;
  factor: SpqFactor;
  keying: 'p' | 'n';
}

export interface SpqScaleScore {
  scale: string;
  factor: SpqFactor;
  raw: number;
  answered: number;
  max: number;
  mean: number;
  sd: number;
  z: number;
  sten: number;
  stenRounded: number;
  confidenceLow: number;
  confidenceHigh: number;
}

export const SPQ_FACTORS: Record<SpqFactor, string[]> = {
  'Achievement and Competitiveness': ['Achievement', 'Adaptability', 'Competitiveness', 'Conscientiousness', 'Visualisation', 'Intuition', 'Goal Setting'],
  'Confidence and Resilience': ['Managing Pressure', 'Self-Efficacy', 'Fear of Failure', 'Flow', 'Stress Management', 'Emotions', 'Self-Talk', 'Self-Awareness'],
};

export const SPQ_ITEMS: SpqItem[] = [
  { item: 22, statement: 'I push myself to the limit', scale: 'Achievement', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 32, statement: 'I lack motivation', scale: 'Achievement', factor: 'Achievement and Competitiveness', keying: 'n' },
  { item: 41, statement: 'I want to be the best I can be', scale: 'Achievement', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 50, statement: 'I excel in my sport', scale: 'Achievement', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 86, statement: 'I make sacrifices to advance my career', scale: 'Achievement', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 106, statement: 'I show total commitment', scale: 'Achievement', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 130, statement: 'I give less than 100 percent', scale: 'Achievement', factor: 'Achievement and Competitiveness', keying: 'n' },
  { item: 151, statement: 'I sacrifice things to be the best', scale: 'Achievement', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 16, statement: 'I am open to ideas about how to improve', scale: 'Adaptability', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 36, statement: 'I adapt slowly to change', scale: 'Adaptability', factor: 'Achievement and Competitiveness', keying: 'n' },
  { item: 44, statement: 'I experiment with new techniques', scale: 'Adaptability', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 46, statement: 'I resist change in my sport', scale: 'Adaptability', factor: 'Achievement and Competitiveness', keying: 'n' },
  { item: 54, statement: 'My training would be much better if I had more resources', scale: 'Adaptability', factor: 'Achievement and Competitiveness', keying: 'n' },
  { item: 75, statement: 'I keep up with scientific developments', scale: 'Adaptability', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 110, statement: 'I try new ways of doing things', scale: 'Adaptability', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 123, statement: 'I take risks to succeed', scale: 'Adaptability', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 9, statement: 'I think about how to win', scale: 'Competitiveness', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 15, statement: 'I enjoy competing', scale: 'Competitiveness', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 34, statement: 'I desire to be the best', scale: 'Competitiveness', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 71, statement: 'I am bothered when I get beaten', scale: 'Competitiveness', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 83, statement: 'I am afraid of winning', scale: 'Competitiveness', factor: 'Achievement and Competitiveness', keying: 'n' },
  { item: 90, statement: 'I want to be a winner', scale: 'Competitiveness', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 98, statement: 'I let my opponents win', scale: 'Competitiveness', factor: 'Achievement and Competitiveness', keying: 'n' },
  { item: 101, statement: 'I mess up in competitions', scale: 'Competitiveness', factor: 'Achievement and Competitiveness', keying: 'n' },
  { item: 39, statement: 'I stick to the plan that I have set', scale: 'Conscientiousness', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 58, statement: 'I am organised', scale: 'Conscientiousness', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 92, statement: 'I am reliable', scale: 'Conscientiousness', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 131, statement: 'I keep promises', scale: 'Conscientiousness', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 139, statement: 'I let people down', scale: 'Conscientiousness', factor: 'Achievement and Competitiveness', keying: 'n' },
  { item: 154, statement: 'I feel unprepared before competing', scale: 'Conscientiousness', factor: 'Achievement and Competitiveness', keying: 'n' },
  { item: 160, statement: 'I train hard', scale: 'Conscientiousness', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 161, statement: 'I prepare thoroughly', scale: 'Conscientiousness', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 6, statement: 'I imagine how to handle different situations', scale: 'Visualisation', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 10, statement: 'I visualise myself winning', scale: 'Visualisation', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 30, statement: 'I visualise staying calm', scale: 'Visualisation', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 35, statement: 'I imagine playing well', scale: 'Visualisation', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 77, statement: 'I imagine the excitement of performing', scale: 'Visualisation', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 78, statement: 'I perform skills in my mind', scale: 'Visualisation', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 95, statement: 'I visualise competing confidently', scale: 'Visualisation', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 104, statement: 'I rehearse things in my head', scale: 'Visualisation', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 17, statement: 'I act on my instincts', scale: 'Intuition', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 53, statement: 'I see things before they happen', scale: 'Intuition', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 56, statement: 'I trust my head rather than my heart', scale: 'Intuition', factor: 'Achievement and Competitiveness', keying: 'n' },
  { item: 73, statement: 'I ignore my feelings', scale: 'Intuition', factor: 'Achievement and Competitiveness', keying: 'n' },
  { item: 107, statement: 'I rely on my intuition', scale: 'Intuition', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 126, statement: 'I let my feelings guide me', scale: 'Intuition', factor: 'Achievement and Competitiveness', keying: 'n' },
  { item: 129, statement: 'I listen to my feelings', scale: 'Intuition', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 155, statement: 'I ignore my gut instincts', scale: 'Intuition', factor: 'Achievement and Competitiveness', keying: 'n' },
  { item: 23, statement: 'I set objectives around the skills I need to master', scale: 'Goal Setting', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 74, statement: 'I set challenging objectives', scale: 'Goal Setting', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 97, statement: 'I measure progress against my objectives', scale: 'Goal Setting', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 100, statement: 'I have a list of goals to achieve', scale: 'Goal Setting', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 118, statement: 'I believe in setting goals', scale: 'Goal Setting', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 125, statement: 'I devote time to setting goals', scale: 'Goal Setting', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 137, statement: 'I know the level I want to reach', scale: 'Goal Setting', factor: 'Achievement and Competitiveness', keying: 'p' },
  { item: 163, statement: 'I am unsure of my objectives', scale: 'Goal Setting', factor: 'Achievement and Competitiveness', keying: 'n' },
  { item: 40, statement: 'I tighten up before competitions', scale: 'Managing Pressure', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 68, statement: 'I stay focused before competitions', scale: 'Managing Pressure', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 96, statement: 'I am confident before competitions', scale: 'Managing Pressure', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 103, statement: 'I choke under pressure', scale: 'Managing Pressure', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 142, statement: 'I feel anxious before important matches', scale: 'Managing Pressure', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 157, statement: 'I perform best under pressure', scale: 'Managing Pressure', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 159, statement: 'I feel my heart racing before competitions', scale: 'Managing Pressure', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 168, statement: 'I am mentally relaxed before competitions', scale: 'Managing Pressure', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 4, statement: 'I make good decisions in competitions', scale: 'Self-Efficacy', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 29, statement: 'I get down on myself too easily', scale: 'Self-Efficacy', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 60, statement: 'I believe in myself', scale: 'Self-Efficacy', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 61, statement: 'I suffer mental lapses', scale: 'Self-Efficacy', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 64, statement: 'I refuse to let what others say affect me', scale: 'Self-Efficacy', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 102, statement: 'I do better in practice than in competitions', scale: 'Self-Efficacy', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 112, statement: 'I bounce back quickly from setbacks', scale: 'Self-Efficacy', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 156, statement: 'I screw up under pressure', scale: 'Self-Efficacy', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 5, statement: 'I am afraid of having to change my plans', scale: 'Fear of Failure', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 62, statement: 'I feel in control', scale: 'Fear of Failure', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 63, statement: 'I am confident of living up to people’s expectations', scale: 'Fear of Failure', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 85, statement: 'I am confident of doing well', scale: 'Fear of Failure', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 93, statement: 'I am afraid of failing', scale: 'Fear of Failure', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 94, statement: 'I am afraid of losing control', scale: 'Fear of Failure', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 124, statement: 'I am afraid of people losing interest in me', scale: 'Fear of Failure', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 153, statement: 'I am confident of succeeding', scale: 'Fear of Failure', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 19, statement: 'I deliver the performance I rehearse in my mind', scale: 'Flow', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 33, statement: 'I perform in the zone', scale: 'Flow', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 57, statement: 'I feel a sense of exhilaration while performing', scale: 'Flow', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 87, statement: 'I get totally absorbed in my performance', scale: 'Flow', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 99, statement: 'I perform out of my box', scale: 'Flow', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 109, statement: 'I perform to the best of my ability', scale: 'Flow', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 113, statement: 'I am totally focused', scale: 'Flow', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 167, statement: 'I feel my play rising to a new level', scale: 'Flow', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 8, statement: 'I follow a healthy lifestyle', scale: 'Stress Management', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 25, statement: 'I handle stressful events well', scale: 'Stress Management', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 114, statement: 'I cope with performance slumps', scale: 'Stress Management', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 120, statement: 'I feel like quitting my sport', scale: 'Stress Management', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 128, statement: 'I am able to sleep well', scale: 'Stress Management', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 150, statement: 'I feel emotionally exhausted', scale: 'Stress Management', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 152, statement: 'I feel anxious', scale: 'Stress Management', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 165, statement: 'I handle stress better than most people', scale: 'Stress Management', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 28, statement: 'I am able to manage my emotions', scale: 'Emotions', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 37, statement: 'I find that being with people improves my mood', scale: 'Emotions', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 51, statement: 'I find relaxation techniques have little effect', scale: 'Emotions', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 67, statement: 'I am unable to control my emotions', scale: 'Emotions', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 116, statement: 'When I get angry, I tend to lose it', scale: 'Emotions', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 121, statement: 'I know what to do to improve my mood', scale: 'Emotions', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 135, statement: 'I have a successful technique for controlling my emotions', scale: 'Emotions', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 145, statement: 'I am able to reduce the negative effects of anxiety', scale: 'Emotions', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 3, statement: 'I put myself down', scale: 'Self-Talk', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 20, statement: 'I tell myself to keep on trying', scale: 'Self-Talk', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 31, statement: 'I talk myself into giving up', scale: 'Self-Talk', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 79, statement: 'I tell myself to stay calm when I feel under pressure', scale: 'Self-Talk', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 89, statement: 'I tell myself I am a failure', scale: 'Self-Talk', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 105, statement: 'I tell myself I can win', scale: 'Self-Talk', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 108, statement: 'I tell myself not to give up', scale: 'Self-Talk', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 122, statement: 'I tell myself to perform well', scale: 'Self-Talk', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 11, statement: 'I am aware of my shortcomings', scale: 'Self-Awareness', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 21, statement: 'I analyse my strengths and weaknesses', scale: 'Self-Awareness', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 43, statement: 'I am reluctant to ask for feedback', scale: 'Self-Awareness', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 69, statement: 'I know how my emotions affect me', scale: 'Self-Awareness', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 80, statement: 'I am able to laugh at myself', scale: 'Self-Awareness', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 117, statement: 'I know where I need to improve', scale: 'Self-Awareness', factor: 'Confidence and Resilience', keying: 'p' },
  { item: 143, statement: 'I am slow to learn the lessons of past performances', scale: 'Self-Awareness', factor: 'Confidence and Resilience', keying: 'n' },
  { item: 164, statement: 'I know myself', scale: 'Self-Awareness', factor: 'Confidence and Resilience', keying: 'p' },
];

const GENDER_NORMS: Record<SpqGenderNorm, Record<string, { mean: number; sd: number }>> = {
  women: {
    Achievement: { mean: 24.51, sd: 4.90 }, Adaptability: { mean: 19.88, sd: 4.01 }, Competitiveness: { mean: 24.06, sd: 4.88 }, Conscientiousness: { mean: 22.43, sd: 4.93 }, Visualisation: { mean: 20.72, sd: 5.26 }, Intuition: { mean: 18.89, sd: 4.17 }, 'Goal Setting': { mean: 21.10, sd: 4.83 }, 'Managing Pressure': { mean: 17.94, sd: 6.26 }, 'Self-Efficacy': { mean: 18.03, sd: 5.99 }, 'Fear of Failure': { mean: 14.78, sd: 6.72 }, Flow: { mean: 18.61, sd: 5.25 }, 'Stress Management': { mean: 12.24, sd: 5.28 }, Emotions: { mean: 19.55, sd: 5.46 }, 'Self-Talk': { mean: 22.39, sd: 5.59 }, 'Self-Awareness': { mean: 21.04, sd: 4.47 },
  },
  men: {
    Achievement: { mean: 24.02, sd: 5.13 }, Adaptability: { mean: 20.09, sd: 4.09 }, Competitiveness: { mean: 24.29, sd: 5.06 }, Conscientiousness: { mean: 21.69, sd: 5.06 }, Visualisation: { mean: 20.72, sd: 5.22 }, Intuition: { mean: 18.76, sd: 4.23 }, 'Goal Setting': { mean: 20.31, sd: 4.68 }, 'Managing Pressure': { mean: 16.19, sd: 6.24 }, 'Self-Efficacy': { mean: 18.88, sd: 6.03 }, 'Fear of Failure': { mean: 13.42, sd: 6.35 }, Flow: { mean: 18.50, sd: 5.32 }, 'Stress Management': { mean: 12.19, sd: 5.04 }, Emotions: { mean: 19.12, sd: 5.13 }, 'Self-Talk': { mean: 22.93, sd: 5.34 }, 'Self-Awareness': { mean: 20.28, sd: 4.59 },
  },
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export type SpqBand = 'work-on' | 'improve-on' | 'capitalise-on';

export const stenBand = (sten: number): SpqBand => {
  if (sten <= 3.5) return 'work-on';
  if (sten <= 7.5) return 'improve-on';
  return 'capitalise-on';
};

export const stenBandLabel = (band: SpqBand) =>
  band === 'work-on' ? 'Work On' : band === 'improve-on' ? 'Improve On' : 'Capitalise On';

export const stenBandColor = (band: SpqBand) =>
  band === 'work-on' ? '#d14343' : band === 'improve-on' ? '#e0a826' : '#3aa564';

// Cumulative normal distribution → percentile (0..1) from a z-score.
// Approximation good to ~1e-7. Used to express SPQ scale results as a
// "1 = best of 100, 100 = worst of 100" league-style ranking, since the
// SPQ manual frames results as relative position vs the norm group.
const cdfNormal = (z: number) => {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp(-z * z / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - p : p;
};

/** Return rank-from-best out of 100, where 1 = best, 100 = worst (clamped 1..100). */
export const stenToRankOf100 = (sten: number, z: number): number => {
  // Higher sten = better, so percentile-from-top = 1 - CDF(z)
  const fromTop = 1 - cdfNormal(z);
  const rank = Math.round(fromTop * 99) + 1; // 1..100
  return Math.max(1, Math.min(100, rank));
};

/** Short, manual-aligned guidance for each SPQ scale. Used in the report. */
export const SPQ_SCALE_GUIDANCE: Record<string, { workOn: string; improveOn: string; capitaliseOn: string }> = {
  Achievement: {
    workOn: 'Reset goals around effort and standards. Track daily commitment and protect non-negotiables before sessions.',
    improveOn: 'Stretch the bar in training. Add one progressive challenge each week and review against personal best.',
    capitaliseOn: 'Channel drive into leadership and standards across the squad. Use as a model for newer players.',
  },
  Adaptability: {
    workOn: 'Practise reacting to in-session change-ups. Rehearse one new constraint or rule per session and reflect on it.',
    improveOn: 'Add variability to drills and game scenarios. Force decisions in unfamiliar shapes or numbers.',
    capitaliseOn: 'Use as a tool for tactical flexibility. Take on roles in multiple positions or systems.',
  },
  Competitiveness: {
    workOn: 'Build small competitive cues into solo work. Frame drills as duels with measurable winners.',
    improveOn: 'Use score-based mini games and 1v1 contexts to sharpen the edge without losing composure.',
    capitaliseOn: 'Drive intensity in tight game phases. Use this energy to lift teammates in big moments.',
  },
  Conscientiousness: {
    workOn: 'Tighten daily routines: sleep, prep, recovery. Build a non-negotiable pre-session checklist.',
    improveOn: 'Add structure to the week and review adherence honestly. Small daily wins compound.',
    capitaliseOn: 'Lean on this consistency to take ownership of standards and lead the prep culture.',
  },
  Visualisation: {
    workOn: 'Start with 3 minutes daily of guided imagery: rehearse the next session in detail.',
    improveOn: 'Add specific match scenarios and decision moments to visual rehearsal.',
    capitaliseOn: 'Use pre-match imagery as part of activation. Rehearse high-pressure moments in advance.',
  },
  Intuition: {
    workOn: 'Trust first reads in low-stakes drills. Reflect after sessions on what your gut said vs what happened.',
    improveOn: 'Pair instinct with structured cues. Decide-then-confirm on tactical patterns.',
    capitaliseOn: 'Lead through anticipation. Communicate reads early to teammates.',
  },
  'Goal Setting': {
    workOn: 'Set one weekly process goal that is specific and measurable. Review it each Sunday.',
    improveOn: 'Add tiered goals (session, week, block) with concrete metrics.',
    capitaliseOn: 'Use long-range goals to map a development pathway and share it with coaches.',
  },
  'Managing Pressure': {
    workOn: 'Practise pressure rehearsal: scoreboard, time-on-clock, crowd audio. Add breathing reset routines.',
    improveOn: 'Build pre-performance routines and trigger words for high-stakes phases.',
    capitaliseOn: 'Take responsibility in critical moments — penalties, last actions, set pieces.',
  },
  'Self-Efficacy': {
    workOn: 'Bank evidence: log small wins after every session to rebuild belief.',
    improveOn: 'Connect prep quality to game confidence. Speak in specific, evidence-based terms.',
    capitaliseOn: 'Use confidence to back risk-taking decisions and lead in tight phases.',
  },
  'Fear of Failure': {
    workOn: 'Reframe errors as data. Use a "next play" cue and focus on the very next action only.',
    improveOn: 'Practise low-stakes risk-taking in training to build a healthier relationship with mistakes.',
    capitaliseOn: 'Stay brave on the ball in important moments and back teammates to do the same.',
  },
  Flow: {
    workOn: 'Reduce overthinking: use external focus cues (where the ball goes, not how you move).',
    improveOn: 'Build pre-session routines that reliably trigger immersion.',
    capitaliseOn: 'Identify the conditions that get you "in the zone" and engineer them on match days.',
  },
  'Stress Management': {
    workOn: 'Address the basics: sleep, nutrition, downtime. Add one daily decompression habit.',
    improveOn: 'Layer breathing, journaling and recovery rituals around heavy weeks.',
    capitaliseOn: 'Use composure to set tone for the squad in heavy fixture runs.',
  },
  Emotions: {
    workOn: 'Build a simple "name it to tame it" habit post-session. Talk it out with one trusted person.',
    improveOn: 'Use a routine for cooling off between drills or after errors.',
    capitaliseOn: 'Lead emotionally on big days; set tone in dressing room and warm-up.',
  },
  'Self-Talk': {
    workOn: 'Replace one recurring negative phrase with a specific cue word. Practise it on the training pitch.',
    improveOn: 'Build a small set of trigger phrases for different moments (start, recovery, pressure).',
    capitaliseOn: 'Coach yourself loudly and back others with positive cues during play.',
  },
  'Self-Awareness': {
    workOn: 'Open up to feedback. Schedule short weekly check-ins with a coach or mentor.',
    improveOn: 'Pair self-review (clip, journal) with external feedback to triangulate.',
    capitaliseOn: 'Use insight to fast-track development plans and own your next steps.',
  },
};

export const parseSpqAnswers = (text: string): Record<number, number> => {
  const answers: Record<number, number> = {};
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (const line of lines) {
    // Capture leading item number and the LAST 0-4 token on the line as the answer.
    // This avoids picking digits inside the statement (e.g. "100 percent").
    const head = line.match(/^\s*(\d{1,3})\b/);
    if (!head) continue;
    const tail = line.match(/([0-4])(?!.*[0-4])\s*$/);
    if (!tail) continue;
    const item = Number(head[1]);
    const value = Number(tail[1]);
    if (item >= 1 && item <= 168) answers[item] = value;
  }
  return answers;
};

export const calculateSpqScores = (answers: Record<number, number>, gender: SpqGenderNorm) => {
  const scales = Object.values(SPQ_FACTORS).flat();
  const scaleScores = scales.map((scale) => {
    const items = SPQ_ITEMS.filter(item => item.scale === scale);
    const factor = items[0]?.factor || 'Achievement and Competitiveness';
    const raw = items.reduce((sum, item) => {
      const answer = answers[item.item];
      if (answer == null) return sum;
      return sum + (item.keying === 'p' ? answer : 4 - answer);
    }, 0);
    const answered = items.filter(item => answers[item.item] != null).length;
    const norm = GENDER_NORMS[gender][scale];
    const z = norm ? (raw - norm.mean) / norm.sd : 0;
    const stenRaw = (z * 2) + 5.5;
    // Per manual: cap at 10.0, floor at 0.0; show one decimal.
    const sten = clamp(stenRaw, 0, 10);
    return {
      scale,
      factor,
      raw,
      answered,
      max: 32,
      mean: norm?.mean ?? 0,
      sd: norm?.sd ?? 1,
      z,
      sten,
      stenRounded: Math.round(sten * 10) / 10,
      confidenceLow: Math.max(0, Math.round((sten - 1) * 10) / 10),
      confidenceHigh: Math.min(10, Math.round((sten + 1) * 10) / 10),
    } satisfies SpqScaleScore;
  });

  const factorScores = (Object.keys(SPQ_FACTORS) as SpqFactor[]).map((factor) => {
    const factorScales = scaleScores.filter(score => score.factor === factor);
    const averageSten = factorScales.reduce((sum, score) => sum + score.sten, 0) / factorScales.length;
    const averageRaw = factorScales.reduce((sum, score) => sum + score.raw, 0) / factorScales.length;
    return { factor, averageSten, averageRaw, lowHigh: averageSten >= 5.5 ? 'High' : 'Low' };
  });

  return { scaleScores, factorScores };
};

export const buildSpqReportPrompt = (playerName: string, scores: SpqScaleScore[]) => {
  const strongest = [...scores].sort((a, b) => b.sten - a.sten).slice(0, 4);
  const focus = [...scores].sort((a, b) => a.sten - b.sten).slice(0, 4);
  return `Write a concise UK English sport psychology SPQ report for ${playerName}. Use these SPQ sten scores. Strongest: ${strongest.map(s => `${s.scale} ${s.stenRounded}/10`).join(', ')}. Focus areas: ${focus.map(s => `${s.scale} ${s.stenRounded}/10`).join(', ')}. Do not diagnose. Explain likely performance implications and give practical coaching recommendations.`;
};

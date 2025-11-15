// Position-specific scouting skills based on RISE methodology

export interface SkillDefinition {
  domain: "Physical" | "Psychological" | "Technical" | "Tactical";
  skill_name: string;
  description: string;
}

export const SCOUTING_POSITIONS = [
  "Goalkeeper",
  "Full-Back",
  "Centre-Back",
  "Central Defensive Midfielder",
  "Central Midfielder",
  "Central Attacking Midfielder",
  "Winger / Wide Forward",
  "Centre Forward / Striker"
] as const;

export type ScoutingPosition = typeof SCOUTING_POSITIONS[number];

export const SKILL_GRADES = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"] as const;

export const POSITION_SKILLS: Record<ScoutingPosition, SkillDefinition[]> = {
  "Goalkeeper": [
    // Physical Domain (4 skills)
    { domain: "Physical", skill_name: "Reflexes", description: "Excellent reflexes to make quick reaction saves in one-on-one situations or during close-range shots. Agility is critical for diving across the goal quickly and changing direction when needed." },
    { domain: "Physical", skill_name: "Reach", description: "How well they cover the dimensions of the goal. Best seen from their saves and goals conceded. Which shots beat them? The greater area of the goal they effectively protect consistently, the better." },
    { domain: "Physical", skill_name: "Footwork", description: "Lateral power to cover the goal swiftly, launch themselves for diving saves, or quickly spring into action when rushing out to smother the ball. Most importantly this extends to their saves, pushing the ball effectively away from danger." },
    { domain: "Physical", skill_name: "Explosiveness", description: "Constantly on their toes, bouncing at the right times to gain the extra energy for pushing off in any direction. The best will apply this perfectly to cover more of the goal." },
    // Psychological Domain (4 skills)
    { domain: "Psychological", skill_name: "Authority", description: "Command their box with authority, inspiring confidence in their defenders. Lead the line with assertive direction, take charge of aerial situations and make decisions quickly without hesitation for the entire team." },
    { domain: "Psychological", skill_name: "Composure", description: "Makes the right decisions in the most pivotal moments. When attacking, do they attack gaps and execute the best shot, cross or pass? Are they willing to try the unorthodox and stay on the ball to create chances." },
    { domain: "Psychological", skill_name: "Focus", description: "The best keepers make fewest mistakes. Although everyone has one in them, this should not result from a loss of concentration. Did they close space and angles consistently through the game?" },
    { domain: "Psychological", skill_name: "Response to Scenarios", description: "Whether or not a goal is conceded, how do they rally their team and collect themselves in important moments such as after a mistake, goal conceded or even goal scored by their team?" },
    // Tactical Domain (4 skills)
    { domain: "Tactical", skill_name: "Positioning", description: "Anticipation of play before it happens, positioning themselves optimally to cover angles and make saves easier. Must be aware of the situation to cut down space and anticipate the attackers' intentions to intercept their shots." },
    { domain: "Tactical", skill_name: "Timing", description: "Timing their approach, when to bounce, shift position and set their feet is vital to setting themselves up to make saves. The best will consistently read triggers in a split second to cover their goal and react correctly to the shot." },
    { domain: "Tactical", skill_name: "Reading Play Offensively", description: "Can they spot weaknesses in the opposition defensive shape to exploit them quickly with their distribution? Important to this are key principles like finding players with space to open forwards or overloaded areas of the pitch." },
    { domain: "Tactical", skill_name: "Game Management", description: "Managing the game by controlling the tempo. This includes slowing things down when under pressure or speeding up transitions with quick distributions. Should also manage their defensive setup well to ensure organisation." },
    // Technical Domain (4 skills)
    { domain: "Technical", skill_name: "Shot Stopping", description: "The primary technical skill requires strong hands and quick reactions. Should be able to deal with a variety of shots: low, high, powerful, or curling - ensuring they get an adequate hand behind the ball to avoid conceding." },
    { domain: "Technical", skill_name: "Handling & Catching", description: "Clean handling, ensuring that they securely catch crosses, long shots and set-pieces. Should avoid spilling the ball into dangerous areas and command their box by catching or punching crosses while stepping out aggressively." },
    { domain: "Technical", skill_name: "Footwork", description: "The best will be intelligent in how they step and where they place their body weight to quickly travel in any direction. Watch for the knee that bends, as this is where their weight distributes towards and gives an advantage pushing off." },
    { domain: "Technical", skill_name: "Distribution", description: "Good set-up touches to quickly play powerful passes. Should be comfortable passing short or long, most importantly under pressure, playing as a 'sweeper' when needed and keeping possession for the team." }
  ],
  "Full-Back": [
    // Physical
    { domain: "Physical", skill_name: "Strength, Power & Speed", description: "Speed to recover defensively and overlap offensively. Power in duels and acceleration to burst past opponents. Must have endurance for constant transitions." },
    { domain: "Physical", skill_name: "Use of Body", description: "Physical presence in duels, using body to shield the ball, ride challenges while dribbling, and maintain balance when jockeying opponents." },
    { domain: "Physical", skill_name: "Anaerobic Endurance", description: "Capacity to maintain high-intensity running throughout the game, covering large distances with repeated sprints up and down the flank." },
    { domain: "Physical", skill_name: "Size", description: "How size is utilized in aerial duels and physical battles. Smaller players must compensate with timing, positioning, and technical excellence." },
    // Psychological
    { domain: "Psychological", skill_name: "Composure", description: "Maintains calm in defensive situations and when pressed on the ball. Makes smart decisions under pressure in both defensive and attacking phases." },
    { domain: "Psychological", skill_name: "Aggression & Intensity", description: "Plays with controlled aggression, engaging opponents high up the pitch and committing to tackles without being reckless. Shows competitive edge." },
    { domain: "Psychological", skill_name: "Consistency", description: "Reliable defensively while maintaining attacking output. Continues to make correct decisions throughout 90 minutes regardless of game state." },
    { domain: "Psychological", skill_name: "Confidence", description: "Confident taking on opponents 1v1, delivering crosses, and making recovery runs. Willing to take risks in the attacking third." },
    // Technical
    { domain: "Technical", skill_name: "Defensive Technique", description: "Quality of tackling, jockeying, and body positioning in 1v1s. Ability to delay attackers and time tackles without committing fouls." },
    { domain: "Technical", skill_name: "First Touch & Ball Control", description: "Clean first touch to receive under pressure and control in tight spaces. Comfortable with both feet in all situations." },
    { domain: "Technical", skill_name: "Crossing & Delivery", description: "Quality and variety of crosses from different positions. Can deliver early crosses, cutbacks, and driven balls across the box." },
    { domain: "Technical", skill_name: "Passing & Distribution", description: "Range and accuracy of passing. Can switch play, play through lines, and maintain possession under pressure with both short and long passes." },
    // Tactical
    { domain: "Tactical", skill_name: "Defensive Positioning", description: "Smart positioning to cover space, tuck in when needed, and recover goal-side quickly. Understands when to engage and when to contain." },
    { domain: "Tactical", skill_name: "Attacking Positioning", description: "Timing of overlapping and underlapping runs. Creates width and depth, offering passing options and stretching the opposition." },
    { domain: "Tactical", skill_name: "Decision-Making", description: "Knows when to dribble, pass, or cross. When to stay back defensively or commit forward. Reads the game to make optimal choices." },
    { domain: "Tactical", skill_name: "1v1 Defending", description: "Ability to defend in isolation against tricky wingers. Stays patient, forces opponents outside, and doesn't get beaten easily." }
  ],
  "Centre-Back": [
    // Physical
    { domain: "Physical", skill_name: "Strength, Power & Speed", description: "Physical dominance in duels, power in the air, and recovery speed to cover ground. Must be strong enough to compete with physical strikers." },
    { domain: "Physical", skill_name: "Use of Body", description: "Effective body positioning to shield the ball, maintain balance in physical contests, and guide opponents away from danger areas." },
    { domain: "Physical", skill_name: "Anaerobic Endurance", description: "Stamina to maintain concentration and physical intensity throughout the match, especially during sustained defensive pressure and late-game situations." },
    { domain: "Physical", skill_name: "Size & Aerial Ability", description: "How size and jumping ability are utilized in aerial duels. Must dominate in the air both defensively and on set pieces." },
    // Psychological
    { domain: "Psychological", skill_name: "Composure", description: "Calm under pressure, making sound decisions with the ball and reading situations without panic. Never rushed in possession or defensive actions." },
    { domain: "Psychological", skill_name: "Leadership & Communication", description: "Vocal and visual leadership to organize the defensive line. Commands respect and ensures teammates are in correct positions." },
    { domain: "Psychological", skill_name: "Consistency", description: "Reliable performance with minimal errors. Makes correct decisions consistently and maintains concentration throughout the match." },
    { domain: "Psychological", skill_name: "Confidence", description: "Self-assured in defensive actions and comfortable playing out from the back. Willing to step into midfield or engage in physical duels." },
    // Technical
    { domain: "Technical", skill_name: "Defending Technique", description: "Quality of tackling, interceptions, and blocking. Times challenges well and uses body positioning to win the ball cleanly." },
    { domain: "Technical", skill_name: "Heading & Aerial Duels", description: "Dominance in aerial battles both defensively and offensively. Powerful and accurate heading with good timing and positioning." },
    { domain: "Technical", skill_name: "Passing & Build-Up Play", description: "Range and accuracy of passing to build from the back. Comfortable under pressure and can break lines with passing." },
    { domain: "Technical", skill_name: "First Touch & Ball Control", description: "Clean first touch to control under pressure. Comfortable with both feet and can turn smoothly when receiving." },
    // Tactical
    { domain: "Tactical", skill_name: "Defensive Positioning", description: "Optimal positioning to cover space, maintain defensive shape, and be in the right place at the right time. Reads danger early." },
    { domain: "Tactical", skill_name: "Anticipation & Reading", description: "Anticipates opponent movements and passes to intercept danger before it develops. Proactive rather than reactive defending." },
    { domain: "Tactical", skill_name: "Decision-Making", description: "Knows when to step out, when to hold position, when to play out or clear. Makes correct split-second choices under pressure." },
    { domain: "Tactical", skill_name: "Covering & Recovery", description: "Provides cover for teammates, recovers into position quickly, and understands when to squeeze up or drop off." }
  ],
  "Central Defensive Midfielder": [
    // Physical
    { domain: "Physical", skill_name: "Strength, Power & Speed", description: "Physical presence to win duels in midfield. Power to break up play and speed to cover ground and track runners." },
    { domain: "Physical", skill_name: "Use of Body", description: "Effective use of body to shield the ball, win physical contests, and maintain balance when pressed or pressing." },
    { domain: "Physical", skill_name: "Anaerobic Endurance", description: "High work rate to cover ground defensively and offensively. Must maintain intensity for repeated sprints and physical contests throughout the match." },
    { domain: "Physical", skill_name: "Size", description: "How size is utilized in duels and aerial battles. Must be effective in physical confrontations and set-piece situations." },
    // Psychological
    { domain: "Psychological", skill_name: "Composure", description: "Calm under pressure when receiving in tight spaces. Makes smart decisions to maintain possession and recycle the ball effectively." },
    { domain: "Psychological", skill_name: "Tactical Intelligence", description: "Reads the game well, positioning to intercept and break up play. Understands when to press and when to hold position." },
    { domain: "Psychological", skill_name: "Consistency", description: "Reliable performance in both defensive and possession phases. Makes correct decisions consistently throughout the match." },
    { domain: "Psychological", skill_name: "Confidence", description: "Self-assured in defensive actions and comfortable on the ball. Willing to receive under pressure and make progressive passes." },
    // Technical
    { domain: "Technical", skill_name: "Defensive Technique", description: "Quality of tackling, interceptions, and positioning to break up play. Times challenges well and wins the ball cleanly." },
    { domain: "Technical", skill_name: "First Touch & Ball Control", description: "Clean first touch to receive under pressure from all angles. Comfortable with both feet in tight spaces." },
    { domain: "Technical", skill_name: "Passing & Distribution", description: "Range and accuracy of passing. Can play short to maintain possession and long to switch play or break lines." },
    { domain: "Technical", skill_name: "Ball Retention", description: "Ability to keep the ball under pressure, using body and technique to protect possession and find passing options." },
    // Tactical
    { domain: "Tactical", skill_name: "Defensive Positioning", description: "Optimal positioning to screen the defense, cover space, and intercept passes. Understands when to engage and when to drop off." },
    { domain: "Tactical", skill_name: "Pressing & Counterpressing", description: "Timing and intensity of pressing actions. Coordinates with teammates to win the ball back quickly in dangerous areas." },
    { domain: "Tactical", skill_name: "Decision-Making", description: "Knows when to play forward, recycle possession, or break lines. Makes optimal choices based on game state and positioning." },
    { domain: "Tactical", skill_name: "Reading the Game", description: "Anticipates opponent movements and passes. Positions proactively to intercept danger and provide passing options." }
  ],
  "Central Midfielder": [
    // Physical
    { domain: "Physical", skill_name: "Strength, Power & Speed", description: "Physical presence in midfield battles. Power to drive forward with the ball and speed to cover ground both ways." },
    { domain: "Physical", skill_name: "Use of Body", description: "Effective body positioning to shield the ball, ride challenges, and maintain balance in tight spaces under pressure." },
    { domain: "Physical", skill_name: "Anaerobic Endurance", description: "High work rate to contribute in all phases. Must maintain intensity for box-to-box running throughout 90 minutes." },
    { domain: "Physical", skill_name: "Size", description: "How size is utilized in physical contests and aerial duels. Must be effective in winning second balls and competing physically." },
    // Psychological
    { domain: "Psychological", skill_name: "Composure", description: "Calm under pressure in all phases. Makes smart decisions with the ball and maintains tempo even when pressed." },
    { domain: "Psychological", skill_name: "Vision & Creativity", description: "Sees passes before they develop. Creative in finding solutions and willing to attempt difficult passes to break down defenses." },
    { domain: "Psychological", skill_name: "Consistency", description: "Reliable performance in possession, progression, and defensive duties. Maintains output throughout the match." },
    { domain: "Psychological", skill_name: "Confidence", description: "Self-assured on the ball and willing to receive in tight areas. Confident to attempt creative passes and dribbles." },
    // Technical
    { domain: "Technical", skill_name: "First Touch & Ball Control", description: "Exceptional first touch to control in tight spaces from all angles. Comfortable with both feet under pressure." },
    { domain: "Technical", skill_name: "Passing & Distribution", description: "Range and accuracy of passing. Can play short combinations, switch play, and deliver decisive through balls." },
    { domain: "Technical", skill_name: "Dribbling & Ball Carrying", description: "Ability to carry the ball forward under pressure, beat opponents in tight spaces, and drive the team up the pitch." },
    { domain: "Technical", skill_name: "Shooting & Finishing", description: "Quality of shots from distance and in the box. Timing of runs into the box to get on the end of chances." },
    // Tactical
    { domain: "Tactical", skill_name: "Positioning & Movement", description: "Intelligent positioning to receive the ball and create passing angles. Movement to find space between lines." },
    { domain: "Tactical", skill_name: "Attacking Contribution", description: "Timing of forward runs, link-up play in the final third, and ability to create and score goals." },
    { domain: "Tactical", skill_name: "Decision-Making", description: "Knows when to play forward, recycle, dribble, or shoot. Makes optimal choices to progress play effectively." },
    { domain: "Tactical", skill_name: "Defensive Awareness", description: "Understanding of defensive responsibilities, tracking runners, and contributing to pressing and ball recovery." }
  ],
  "Central Attacking Midfielder": [
    // Physical
    { domain: "Physical", skill_name: "Strength, Power & Speed", description: "Power to burst into space and ride challenges in the final third. Speed to exploit gaps and make runs in behind." },
    { domain: "Physical", skill_name: "Use of Body", description: "Effective use of body to shield the ball in tight areas, hold off defenders, and maintain balance when dribbling." },
    { domain: "Physical", skill_name: "Anaerobic Endurance", description: "Stamina to maintain creative intensity throughout the match, making repeated sprints and movements in the final third." },
    { domain: "Physical", skill_name: "Size", description: "How size is utilized to hold up the ball and compete physically. Smaller players must excel technically to compensate." },
    // Psychological
    { domain: "Psychological", skill_name: "Composure", description: "Calm in the final third under pressure. Makes clear decisions with the ball in tight spaces and scoring positions." },
    { domain: "Psychological", skill_name: "Creativity & Vision", description: "Sees and attempts passes others don't. Creative problem-solver who can unlock defenses with unique solutions." },
    { domain: "Psychological", skill_name: "Consistency", description: "Reliable creative output. Continues to attempt creative actions even when they don't come off initially." },
    { domain: "Psychological", skill_name: "Confidence", description: "Self-assured in taking risks, attempting dribbles, and shooting from anywhere. Confidence remains high regardless of success rate." },
    // Technical
    { domain: "Technical", skill_name: "First Touch & Ball Control", description: "Exceptional first touch in tight spaces. Can receive from any angle and immediately create shooting or passing opportunities." },
    { domain: "Technical", skill_name: "Passing & Creativity", description: "Range and weight of passing to unlock defenses. Through balls, flicks, and creative passes to create chances." },
    { domain: "Technical", skill_name: "Dribbling & 1v1", description: "Ability to beat opponents in tight spaces with quick feet, feints, and changes of direction. Creates space for shots and passes." },
    { domain: "Technical", skill_name: "Shooting & Finishing", description: "Quality and variety of shots from all ranges. Can finish chances created and create own shooting opportunities." },
    // Tactical
    { domain: "Tactical", skill_name: "Positioning & Movement", description: "Intelligent movement to find space between lines. Timing of runs to receive in pockets and exploit gaps." },
    { domain: "Tactical", skill_name: "Attacking Positioning", description: "Positioning to receive in dangerous areas and create scoring opportunities. Understands when to drop deep or stay high." },
    { domain: "Tactical", skill_name: "Decision-Making", description: "Knows when to pass, shoot, or dribble in the final third. Makes optimal choices to create and convert chances." },
    { domain: "Tactical", skill_name: "Link-Up Play", description: "Ability to combine with teammates in tight areas, play quick one-twos, and facilitate attacking play." }
  ],
  "Winger / Wide Forward": [
    // Physical
    { domain: "Physical", skill_name: "Strength, Power & Speed", description: "Explosive speed to beat defenders in 1v1s and make runs in behind. Power to ride challenges and maintain balance when dribbling at pace." },
    { domain: "Physical", skill_name: "Use of Body", description: "Effective use of body to shield the ball, maintain balance when changing direction at speed, and hold off challenges." },
    { domain: "Physical", skill_name: "Anaerobic Endurance", description: "Capacity for repeated high-intensity sprints throughout the match. Must maintain explosive speed in later stages of the game." },
    { domain: "Physical", skill_name: "Size", description: "How size is utilized in physical battles and aerial duels. Smaller players must compensate with low center of gravity and agility." },
    // Psychological
    { domain: "Psychological", skill_name: "Composure", description: "Calm in 1v1 situations and when in shooting positions. Makes clear decisions under pressure in the final third." },
    { domain: "Psychological", skill_name: "Directness & Aggression", description: "Plays with directness to attack defenders constantly. Shows aggressive intent to take on opponents and create chances." },
    { domain: "Psychological", skill_name: "Consistency", description: "Reliable attacking output. Continues to attempt to beat opponents and create chances even when initial attempts fail." },
    { domain: "Psychological", skill_name: "Confidence", description: "Self-assured in 1v1s, willing to shoot from anywhere, and confident to take risks. Bounces back quickly from mistakes." },
    // Technical
    { domain: "Technical", skill_name: "Dribbling & 1v1", description: "Exceptional ability to beat opponents with pace, skill, and changes of direction. Comfortable taking on defenders in tight spaces." },
    { domain: "Technical", skill_name: "First Touch & Ball Control", description: "Clean first touch at pace to control and immediately attack space. Comfortable receiving with back to goal and turning." },
    { domain: "Technical", skill_name: "Crossing & Delivery", description: "Quality and variety of crosses and cutbacks. Can deliver early balls, driven crosses, and precise cutbacks." },
    { domain: "Technical", skill_name: "Shooting & Finishing", description: "Quality of shots from all angles and ranges. Can finish chances and create shooting opportunities by cutting inside." },
    // Tactical
    { domain: "Tactical", skill_name: "Attacking Positioning", description: "Intelligent positioning to receive wide and in pockets. Timing of runs in behind and movements inside." },
    { domain: "Tactical", skill_name: "Movement & Runs", description: "Variety and timing of runs: in behind, diagonal, checking to feet. Creates space for self and teammates." },
    { domain: "Tactical", skill_name: "Decision-Making", description: "Knows when to dribble, cross, shoot, or cut inside. Makes optimal choices to create and convert chances." },
    { domain: "Tactical", skill_name: "Link-Up Play", description: "Ability to combine with teammates, play quick one-twos, and facilitate attacking play in the final third." }
  ],
  "Centre Forward / Striker": [
    // Physical
    { domain: "Physical", skill_name: "Strength, Power & Speed", description: "Must be physically dominant in at least one aspect, if not all physically and use it to full effect. The ideal is a player strong enough to win duels against bigger defenders and fast enough to exploit space with destructive movements." },
    { domain: "Physical", skill_name: "Use of Body", description: "Regardless of physical attributes, this player must be able to use their body effectively to hold the ball up, retain balance while dribbling and break free from opposing markers." },
    { domain: "Physical", skill_name: "Anaerobic Endurance", description: "Capacity to make repeated sprint efforts throughout the game with only marginal loss in athletic ability. Look for players who are still sharp and effective in later stages of a game." },
    { domain: "Physical", skill_name: "Size", description: "It is all about how size is used. We want players who recognise their advantages to make the most of them and reduce the negative aspects of any disadvantages to their size." },
    // Psychological
    { domain: "Psychological", skill_name: "Composure", description: "Should always look in control and playing at their own tempo regardless of what is around them. When they want to go fast they do so without thought and when the defence wants to rush them, they take their time while rolling into space." },
    { domain: "Psychological", skill_name: "Killer Instinct", description: "We want a player that makes the right decisions in the most pivotal moments. When given an opportunity, no matter how big or small, do they show an unrelenting desire to make something of it and put the ball in the back of the net." },
    { domain: "Psychological", skill_name: "Consistency", description: "Do they make the right actions regardless of the results and continue in spite of mistakes? With a focus on attacking gaps in the defensive line. Were the decisions that led to their best actions continued throughout the game?" },
    { domain: "Psychological", skill_name: "Confidence", description: "The best will never shy away from an opportunity to attack aggressively and take shots from anywhere. We want them to turn their matchup and open into shots at every opportunity. This should continue whether having success or not." },
    // Technical
    { domain: "Technical", skill_name: "Set-Up Touches", description: "Their first touch should always fit the situation and be executed perfectly. This is important both for hold-up and link play, as well as in front of goal to quickly generate powerful shots that restrict the time keepers have to react." },
    { domain: "Technical", skill_name: "Finishing", description: "Must be able to finish clinically in all scenarios. This does not only mean finding the corners of the goal, but more dimensionally to create space for shots anywhere on the pitch and catch keepers off-guard without their feet set." },
    { domain: "Technical", skill_name: "Heading", description: "Good ability to win aerial duels, including flick-ons. The undersized are also included in this with positioning and timing important. In front of goal, ability to redirect the ball powerfully towards goal from all angles." },
    { domain: "Technical", skill_name: "Distribution", description: "Ability to recognise defensive weaknesses and exploit gaps with sharp passing decision-making on the half-turn and when opening to face up after starting with their back to goal." },
    // Tactical
    { domain: "Tactical", skill_name: "Offensive Positioning", description: "Smart offensive positioning to occupy the right gaps for the time, including pulling away to the far side early. Most importantly in and around the box, with timing their runs late and fast rather than arriving too early." },
    { domain: "Tactical", skill_name: "Off-Ball Movement", description: "Movements to receive the ball made aggressively and continually such that when one fails, they are ready to offer again from a new position. Generally be difficult to mark and keep track of for defenders." },
    { domain: "Tactical", skill_name: "On-Ball Decision-Making", description: "We want players that are capable at passing and dribbling to take advantage of what a defence shows them. Can they spot the weaknesses prior to receiving and then attack these at the appropriate pace?" },
    { domain: "Tactical", skill_name: "Hold-Up & Link Play", description: "Must be able to receive under pressure, using their body and technical execution to retain the ball even in unfavourable circumstances with fewer options. They act as the anchor to allow teammates time to make forward runs." }
  ]
};

export interface SkillEvaluation {
  domain: "Physical" | "Psychological" | "Technical" | "Tactical";
  skill_name: string;
  description: string;
  grade: string;
  notes: string[];
}

export const getSkillsForPosition = (position: string): SkillDefinition[] => {
  return POSITION_SKILLS[position as ScoutingPosition] || [];
};

export const initializeSkillEvaluations = (position: string): SkillEvaluation[] => {
  const skills = getSkillsForPosition(position);
  return skills.map(skill => ({
    ...skill,
    grade: "",
    notes: []
  }));
};

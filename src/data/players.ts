import player1 from "@/assets/player1.jpg";
import player2 from "@/assets/player2.jpg";
import player3 from "@/assets/player3.jpg";
import player4 from "@/assets/player4.jpg";
import player5 from "@/assets/player5.jpg";
import player6 from "@/assets/player6.jpg";

export interface Player {
  id: string;
  name: string;
  position: string;
  age: number;
  nationality: string;
  number: number;
  image: string;
  stats: {
    matches: number;
    goals?: number;
    assists?: number;
    cleanSheets?: number;
    saves?: number;
    minutes: number;
  };
  bio: string;
  whatsapp?: string;
  externalLinks?: {
    label: string;
    url: string;
  }[];
  strengthsAndPlayStyle?: string[];
  tacticalFormations?: {
    club: string;
    formation: string;
    matches: number;
    clubLogo: string;
  }[];
  videoHighlights?: {
    seasonHighlights?: string; // URL to season highlights video
    matchHighlights?: {
      opponent: string;
      clubLogo: string;
      videoUrl: string;
      date?: string;
    }[];
  };
}

export const players: Player[] = [
  {
    id: "tyrese-omotoye",
    name: "Tyrese Omotoye",
    position: "ST",
    age: 21,
    nationality: "Nigeria",
    number: 9,
    image: player1,
    stats: {
      matches: 24,
      goals: 14,
      assists: 5,
      minutes: 2100,
    },
    bio: "Dynamic centre-forward with exceptional pace and finishing ability. Tyrese has been a consistent goal threat for FC Vysocina Jihlava, combining technical skill with physical presence to lead the attack.",
    whatsapp: "+447508342901",
    externalLinks: [
      { label: "Transfermarkt", url: "https://www.transfermarkt.com" },
      { label: "Match Reports", url: "#" }
    ],
    strengthsAndPlayStyle: [
      "Clinical finisher in the box with both feet",
      "Explosive pace to beat defenders",
      "Strong aerial ability and physical presence",
      "Intelligent movement and positioning"
    ],
    tacticalFormations: [
      { club: "FC Vysocina Jihlava", formation: "4-2-3-1", matches: 24, clubLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Manchester_United_FC_crest.svg/200px-Manchester_United_FC_crest.svg.png" },
      { club: "Previous Club", formation: "4-3-3", matches: 18, clubLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/200px-Liverpool_FC.svg.png" }
    ],
    videoHighlights: {
      seasonHighlights: "#",
      matchHighlights: [
        {
          opponent: "Sparta Prague",
          clubLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Manchester_United_FC_crest.svg/200px-Manchester_United_FC_crest.svg.png",
          videoUrl: "#"
        },
        {
          opponent: "Slavia Prague",
          clubLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/200px-Liverpool_FC.svg.png",
          videoUrl: "#"
        }
      ]
    }
  },
  {
    id: "michael-vit-mulligan",
    name: "Michael Vit Mulligan",
    position: "CDM",
    age: 22,
    nationality: "Czech Republic",
    number: 6,
    image: player2,
    stats: {
      matches: 26,
      goals: 2,
      assists: 4,
      minutes: 2280,
    },
    bio: "Tenacious central defensive midfielder with excellent tactical awareness and ball-winning ability. Michael anchors the midfield for TJ Jiskra Domazlice, providing both defensive stability and distribution from deep positions.",
    whatsapp: "+447508342901",
    externalLinks: [
      { label: "Transfermarkt", url: "https://www.transfermarkt.com" },
      { label: "Match Reports", url: "#" }
    ],
    strengthsAndPlayStyle: [
      "Exceptional defensive positioning and interceptions",
      "Strong in the tackle and aerial duels",
      "Composed distribution and ball retention",
      "High work rate and tactical discipline"
    ],
    tacticalFormations: [
      { club: "TJ Jiskra Domazlice", formation: "4-2-3-1", matches: 26, clubLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/cc/Chelsea_FC.svg/200px-Chelsea_FC.svg.png" },
      { club: "Previous Club", formation: "4-3-3", matches: 15, clubLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/200px-Arsenal_FC.svg.png" }
    ]
  },
  {
    id: "jaroslav-svoboda",
    name: "Jaroslav Svoboda",
    position: "CM",
    age: 18,
    nationality: "Czech Republic",
    number: 8,
    image: player3,
    stats: {
      matches: 22,
      goals: 6,
      assists: 9,
      minutes: 1890,
    },
    bio: "Promising young central midfielder with exceptional vision and technical ability. Jaroslav has been a standout performer for Bohemians 1905 U18, showcasing maturity beyond his years with creative passing and intelligent positioning.",
    whatsapp: "+447508342901",
    externalLinks: [
      { label: "Transfermarkt", url: "https://www.transfermarkt.com" },
      { label: "Match Reports", url: "#" }
    ],
    strengthsAndPlayStyle: [
      "Exceptional vision and passing range",
      "Creative playmaker with excellent ball control",
      "Strong football intelligence and decision-making",
      "Ability to control tempo and dictate play"
    ],
    tacticalFormations: [
      { club: "Bohemians 1905 U18", formation: "4-3-3", matches: 22, clubLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/7/7a/Manchester_United_FC_crest.svg/200px-Manchester_United_FC_crest.svg.png" },
      { club: "Youth Academy", formation: "4-4-2", matches: 16, clubLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/0/0c/Liverpool_FC.svg/200px-Liverpool_FC.svg.png" }
    ]
  },
];

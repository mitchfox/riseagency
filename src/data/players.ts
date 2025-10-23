import player1 from "@/assets/player1.jpg";
import player2 from "@/assets/player2.jpg";
import player3 from "@/assets/player3.jpg";
import player4 from "@/assets/player4.jpg";
import player5 from "@/assets/player5.jpg";
import player6 from "@/assets/player6.jpg";
import fcVysocinaLogo from "@/assets/clubs/fc-vysocina-jihlava.png";
import tjJiskraLogo from "@/assets/clubs/tj-jiskra-domazlice.png";
import bohemiansLogo from "@/assets/clubs/bohemians-1905.png";

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
    age: 22,
    nationality: "Belgium",
    number: 9,
    image: player1,
    stats: {
      matches: 24,
      goals: 12,
      assists: 4,
      minutes: 1980,
    },
    bio: "Dynamic Belgian centre-forward who joined FC Vysocina Jihlava in July 2025. Born in Hasselt, Belgium, Tyrese combines explosive pace with clinical finishing ability. His intelligent movement and physical presence make him a constant threat in the attacking third.",
    whatsapp: "+447508342901",
    externalLinks: [
      { label: "Transfermarkt", url: "https://www.transfermarkt.us/tyrese-omotoye/profil/spieler/551309" },
      { label: "Match Reports", url: "#" }
    ],
    strengthsAndPlayStyle: [
      "Clinical finishing with both feet",
      "Explosive pace and acceleration to beat defenders",
      "Strong aerial ability and physical presence",
      "Intelligent off-the-ball movement and positioning"
    ],
    tacticalFormations: [
      { club: "FC Vysocina Jihlava", formation: "4-2-3-1", matches: 24, clubLogo: fcVysocinaLogo },
      { club: "Forest Green Rovers", formation: "4-3-3", matches: 18, clubLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/5/53/Arsenal_FC.svg/200px-Arsenal_FC.svg.png" }
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
      assists: 5,
      minutes: 2280,
    },
    bio: "Tenacious Czech defensive midfielder playing for TJ Jiskra Domazlice. Born September 17, 2002, Michael stands 1.87m tall and excels at breaking up opposition attacks. His tactical intelligence and ball-winning ability make him the anchor of the midfield.",
    whatsapp: "+447508342901",
    externalLinks: [
      { label: "Transfermarkt", url: "https://www.transfermarkt.com/michael-mulligan/profil/spieler/921082" },
      { label: "Match Reports", url: "#" }
    ],
    strengthsAndPlayStyle: [
      "Exceptional defensive positioning and interceptions",
      "Strong in the tackle and aerial duels (1.87m)",
      "Composed distribution from deep positions",
      "High work rate and tactical discipline"
    ],
    tacticalFormations: [
      { club: "TJ Jiskra Domazlice", formation: "4-2-3-1", matches: 26, clubLogo: tjJiskraLogo },
      { club: "Previous Club", formation: "4-3-3", matches: 15, clubLogo: "https://upload.wikimedia.org/wikipedia/en/thumb/c/cc/Chelsea_FC.svg/200px-Chelsea_FC.svg.png" }
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
    bio: "Highly promising young Czech midfielder featuring for Bohemians 1905 U19. At just 18 years old, Jaroslav displays exceptional vision and technical ability beyond his years. His creative passing and intelligent positioning mark him as one to watch for the future.",
    whatsapp: "+447508342901",
    externalLinks: [
      { label: "Transfermarkt", url: "https://www.transfermarkt.us/bohemians-prague-1905/kader/verein/715" },
      { label: "Match Reports", url: "#" }
    ],
    strengthsAndPlayStyle: [
      "Exceptional vision and creative passing range",
      "Advanced technical ability and ball control",
      "Strong football intelligence for his age",
      "Ability to control tempo and dictate play"
    ],
    tacticalFormations: [
      { club: "Bohemians 1905 U19", formation: "4-3-3", matches: 22, clubLogo: bohemiansLogo },
      { club: "Youth Academy", formation: "4-4-2", matches: 16, clubLogo: bohemiansLogo }
    ]
  },
];

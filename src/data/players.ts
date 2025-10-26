import player1 from "@/assets/player1.jpg";
import player2 from "@/assets/player2.jpg";
import player3 from "@/assets/player3.jpg";
import player4 from "@/assets/player4.jpg";
import player5 from "@/assets/player5.jpg";
import player6 from "@/assets/player6.jpg";
import tyreseImage from "@/assets/tyrese-omotoye.png";
import michaelImage from "@/assets/michael-mulligan.png";
import jaroslavImage from "@/assets/jaroslav-svoboda.jpg";
import fcVysocinaLogo from "@/assets/clubs/fc-vysocina-jihlava-official.png";
import tjJiskraLogo from "@/assets/clubs/tj-jiskra-domazlice-official.png";
import bohemiansLogo from "@/assets/clubs/bohemians-1905-official.png";
import forestGreenLogo from "@/assets/clubs/forest-green-rovers.png";
import norwichLogo from "@/assets/clubs/norwich-city-official.png";

export interface Player {
  id: string;
  name: string;
  position: string;
  age: number;
  dateOfBirth: string;
  nationality: string;
  number: number;
  image: string;
  currentClub: string;
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
  news?: {
    title: string;
    date: string;
    summary: string;
    image?: string;
    link?: string;
  }[];
  topStats?: {
    label: string;
    value: string | number;
    description?: string;
    icon?: string;
  }[];
}

export const players: Player[] = [
  {
    id: "tyrese-omotoye",
    name: "Tyrese Omotoye",
    position: "ST",
    age: 23,
    dateOfBirth: "23/09/2002",
    nationality: "Belgium",
    currentClub: "FC Vysocina Jihlava",
    number: 9,
    image: tyreseImage,
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
      { club: "Forest Green Rovers", formation: "3-4-1-2", matches: 18, clubLogo: forestGreenLogo },
      { club: "Forest Green Rovers", formation: "4-2-2-2", matches: 15, clubLogo: forestGreenLogo },
      { club: "Norwich City", formation: "4-3-3", matches: 12, clubLogo: norwichLogo }
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
    },
    topStats: [
      { label: "Goals Per Game", value: "0.50", description: "12 goals in 24 matches" },
      { label: "Shot Accuracy", value: "68%", description: "Above league average" },
      { label: "Aerial Duels Won", value: "74%", description: "Strong in the air" }
    ],
    news: [
      {
        title: "Omotoye Scores Brace in Derby Victory",
        date: "March 15, 2025",
        summary: "Belgian striker Tyrese Omotoye netted two crucial goals as FC Vysocina Jihlava secured a 3-1 victory in the regional derby, taking his season tally to 12 goals.",
        link: "#"
      },
      {
        title: "Rising Star Attracts Interest from Top Leagues",
        date: "March 8, 2025",
        summary: "Sources indicate multiple clubs from major European leagues are monitoring the 23-year-old's impressive performances this season.",
        link: "#"
      },
      {
        title: "Omotoye Named Player of the Month",
        date: "February 28, 2025",
        summary: "The Belgian forward's exceptional form throughout February has earned him the league's Player of the Month award for the first time.",
        link: "#"
      }
    ]
  },
  {
    id: "michael-vit-mulligan",
    name: "Michael Vit Mulligan",
    position: "CDM",
    age: 22,
    dateOfBirth: "17/09/2002",
    nationality: "Czech Republic",
    currentClub: "TJ Jiskra Domazlice",
    number: 6,
    image: michaelImage,
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
    ],
    topStats: [
      { label: "Interceptions", value: "#1 In League", description: "14.0 per 90 minutes", icon: "shield" },
      { label: "Passing Accuracy", value: "92%", description: "Exceptional distribution", icon: "target" }
    ],
    news: [
      {
        title: "Mulligan's Defensive Masterclass Secures Clean Sheet",
        date: "March 18, 2025",
        summary: "The Czech midfielder dominated the midfield with 8 tackles and 5 interceptions in TJ Jiskra Domazlice's 2-0 victory.",
        link: "#"
      },
      {
        title: "International Call-Up on the Horizon",
        date: "March 10, 2025",
        summary: "Michael Vit Mulligan's consistent performances have put him in contention for a senior Czech Republic call-up ahead of upcoming qualifiers.",
        link: "#"
      }
    ]
  },
  {
    id: "jaroslav-svoboda",
    name: "Jaroslav Svoboda",
    position: "CM",
    age: 18,
    dateOfBirth: "15/03/2007",
    nationality: "Czech Republic",
    currentClub: "Bohemians 1905 U19",
    number: 8,
    image: jaroslavImage,
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
    ],
    topStats: [
      { label: "Key Passes", value: "4.1", description: "Per match average" },
      { label: "Dribble Success", value: "78%", description: "Exceptional technique" },
      { label: "Assists", value: "9", description: "In 22 appearances" }
    ],
    news: [
      {
        title: "Youth Prodigy Shines in U19 League",
        date: "March 20, 2025",
        summary: "18-year-old Jaroslav Svoboda delivered a man-of-the-match performance with 2 assists and a goal in Bohemians U19's 4-1 win.",
        link: "#"
      },
      {
        title: "First Team Training with Bohemians 1905 Senior Squad",
        date: "March 12, 2025",
        summary: "The talented midfielder has been invited to train with the senior squad, marking a significant step in his development.",
        link: "#"
      },
      {
        title: "Svoboda: The Next Czech Midfield Sensation",
        date: "March 5, 2025",
        summary: "Local media spotlight the young midfielder's exceptional vision and passing ability, comparing him to Czech legends.",
        link: "#"
      }
    ]
  },
];

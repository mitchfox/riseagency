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
}

export const players: Player[] = [
  {
    id: "marcus-silva",
    name: "Marcus Silva",
    position: "GK",
    age: 22,
    nationality: "Brazil",
    number: 1,
    image: player1,
    stats: {
      matches: 18,
      cleanSheets: 7,
      saves: 89,
      minutes: 1620,
    },
    bio: "Marcus Silva joined the academy at age 16 and quickly established himself as a reliable goalkeeper. Known for his exceptional reflexes and commanding presence in the box, he's been a key player in the team's defensive success.",
  },
  {
    id: "alex-rodriguez",
    name: "Alex Rodriguez",
    position: "CM",
    age: 21,
    nationality: "Spain",
    number: 8,
    image: player2,
    stats: {
      matches: 24,
      goals: 5,
      assists: 12,
      minutes: 2040,
    },
    bio: "A creative midfielder with excellent vision and passing ability. Alex has been instrumental in orchestrating the team's attacks and creating scoring opportunities for his teammates.",
  },
  {
    id: "james-taylor",
    name: "James Taylor",
    position: "ST",
    age: 23,
    nationality: "England",
    number: 9,
    image: player3,
    stats: {
      matches: 26,
      goals: 18,
      assists: 6,
      minutes: 2180,
    },
    bio: "James is a prolific striker with an eye for goal. His pace, positioning, and clinical finishing have made him the team's top scorer this season.",
  },
  {
    id: "david-muller",
    name: "David Müller",
    position: "CB",
    age: 24,
    nationality: "Germany",
    number: 4,
    image: player4,
    stats: {
      matches: 25,
      goals: 2,
      assists: 3,
      minutes: 2250,
    },
    bio: "A solid and reliable defender with excellent tactical awareness. David's leadership qualities and defensive skills make him a cornerstone of the team's backline.",
  },
  {
    id: "lucas-fernandez",
    name: "Lucas Fernández",
    position: "RW",
    age: 20,
    nationality: "Argentina",
    number: 11,
    image: player5,
    stats: {
      matches: 23,
      goals: 8,
      assists: 10,
      minutes: 1890,
    },
    bio: "An exciting young winger with explosive pace and dribbling skills. Lucas has the ability to change games with his individual brilliance and creativity.",
  },
  {
    id: "thomas-dupont",
    name: "Thomas Dupont",
    position: "CM",
    age: 22,
    nationality: "France",
    number: 6,
    image: player6,
    stats: {
      matches: 27,
      goals: 3,
      assists: 8,
      minutes: 2340,
    },
    bio: "A versatile midfielder who excels in both defensive and attacking roles. Thomas's work rate and technical ability make him an invaluable asset to the team.",
  },
];

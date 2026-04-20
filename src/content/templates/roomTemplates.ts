export type RhetoricalType =
  | "premise"
  | "conclusion"
  | "definition"
  | "analogy"
  | "fallacy"
  | "circular"
  | "objection"
  | "meta";

export interface RoomTemplate {
  id: string;
  title: string;
  descriptions: string[];
  rhetoricalType: RhetoricalType;
}

export const ROOM_TEMPLATES: readonly RoomTemplate[] = [
  {
    id: "premise-hall",
    title: "The Premise Hall",
    descriptions: [
      "You stand in the Premise Hall, where columns of assumptions rise into the darkness. Each is engraved with a statement that seems obvious—until you read it twice.",
      "Tall marble columns line this chamber, each bearing an axiom carved in silver script. The floor is a mosaic of interlocking claims, each supporting the next.",
    ],
    rhetoricalType: "premise",
  },
  {
    id: "conclusion-balcony",
    title: "The Conclusion Balcony",
    descriptions: [
      "A wide balcony overlooking a void. The railing is inscribed: 'Therefore.' Somewhere below, the premises wait to be examined.",
      "You emerge onto the Conclusion Balcony, the dizzying endpoint of several lines of reasoning. The argument stretches below you—a city of logic in the dark.",
    ],
    rhetoricalType: "conclusion",
  },
  {
    id: "definition-antechamber",
    title: "The Definition Antechamber",
    descriptions: [
      "The walls here are lined with dictionaries, each defining the same word differently. A plaque reads: 'Meaning is negotiable.'",
      "A vestibule crowded with framed definitions, many contradicting each other. The light is uncertain, the air thick with qualification.",
    ],
    rhetoricalType: "definition",
  },
  {
    id: "analogy-gallery",
    title: "The Analogy Gallery",
    descriptions: [
      "Paintings line the walls, each depicting a comparison: a ship at sea labeled 'The State'; a flame labeled 'Passion'; a mirror labeled 'Memory'. Whether the comparisons hold is left as an exercise.",
      "A long gallery where everything resembles something else. The paintings are beautiful but suspect. 'This is like that,' reads every caption, 'and therefore...'",
    ],
    rhetoricalType: "analogy",
  },
  {
    id: "fallacy-cellar",
    title: "The Fallacy Cellar",
    descriptions: [
      "Stone steps descend into a cool, dim cellar. Shelves line the walls, holding labeled jars: 'Ad Hominem', 'Straw Man', 'Slippery Slope'. They look harmless in storage.",
      "The cellar smells of damp logic. Cobwebs connect the shelves. Each jar contains a preserved fallacy—still dangerous if opened.",
    ],
    rhetoricalType: "fallacy",
  },
  {
    id: "circular-atrium",
    title: "The Circular Atrium",
    descriptions: [
      "A perfectly round room. Every exit leads back here. The walls are mirrors reflecting an argument that assumes what it tries to prove. 'Welcome,' says a voice from nowhere, 'you've been here before.'",
      "The Circular Atrium has no corners and no escape. The floor bears the inscription: 'This statement is true because it is true.' You feel a familiar dizziness.",
    ],
    rhetoricalType: "circular",
  },
  {
    id: "objection-cloister",
    title: "The Objection Cloister",
    descriptions: [
      "A quiet cloister where counter-arguments grow like roses in the courtyard. Each is pruned but never quite killed. The gardener has been here recently.",
      "Arched walkways surround a garden of objections—carefully tended but ultimately decorative. The argument has survived them all, though you're not sure how.",
    ],
    rhetoricalType: "objection",
  },
  {
    id: "meta-room",
    title: "The Chamber of Self-Reference",
    descriptions: [
      "A room that describes itself. The walls display the argument you have been navigating, including this very chamber. A sign reads: 'You have reached the point. It was circular all along.'",
      "Here, the argument looks at itself. Every premise was a conclusion; every conclusion was a premise. The game was the argument, and the argument was always about itself.",
    ],
    rhetoricalType: "meta",
  },
];

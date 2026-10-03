/** De kleuren van de kaart, licht en donker (bij een donkere schermstand). */
export type KaartKleuren = {
  gebieden: number[];
  zijkant: number;
  /** de namen van de bekende gebouwen met een minigame */
  minigame: number;
  buurtlijn: number;
  gebiedslijn: number;
  rand: number;
  water: number;
  weg: number;
  wegstreep: number;
  label: number;
  labelRand: number;
  positief: number;
  negatief: number;
};

export const LICHT: KaartKleuren = {
  gebieden: [0xa9db8a, 0x98d077, 0xb4e09b, 0x8fcb6d, 0xa2d684, 0xbce5a6, 0x9cd27d],
  zijkant: 0x7a5c3e,
  minigame: 0xb34700,
  buurtlijn: 0xffffff,
  gebiedslijn: 0x2e6b2e,
  rand: 0x1233c4,
  water: 0x4a9fd8,
  weg: 0xf3e9d2,
  wegstreep: 0xc9b98f,
  label: 0x15193a,
  labelRand: 0xffffff,
  positief: 0x15875a,
  negatief: 0xc4321e,
};

export const DONKER: KaartKleuren = {
  gebieden: [0x3f6b3a, 0x375f33, 0x46753f, 0x33592f, 0x3d6838, 0x4a7a43, 0x396335],
  zijkant: 0x3b2d20,
  minigame: 0xffb07a,
  buurtlijn: 0x9ec79a,
  gebiedslijn: 0xd7f5c9,
  rand: 0x8fa2ff,
  water: 0x2f6f9e,
  weg: 0x5b5446,
  wegstreep: 0x8b7f63,
  label: 0xf2f4ff,
  labelRand: 0x11142b,
  positief: 0x4fd19a,
  negatief: 0xff8a75,
};

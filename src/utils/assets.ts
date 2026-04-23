export const renderMoons = (sum: number, count: number) => {
  if (!count) return "🌕"; // default
  const avg = Math.max(1, Math.min(Math.round(sum / count), 5));
  return ["🌑", "🌒", "🌓", "🌔", "🌕"][avg - 1];
};

// Spirit asset map — defined at module level for performance
export const SPIRIT_ASSETS: Record<string, any> = {
  cosmos: require("../assets/cosmos.png"),
  crystal: require("../assets/crystal.png"),
  forest: require("../assets/forest.png"),
  character: require("../assets/character.png"),
  moonwarrior: require("../assets/moonwarrior.png"),
  shroom: require("../assets/shroom.png"),
  sun: require("../assets/sun.png"),
  sunwarrior: require("../assets/sunwarrior.png"),
  trident: require("../assets/trident.png"),
  yingyang: require("../assets/yingyang.png"),
};

export const SPIRIT_LABELS: Record<string, string> = {
  cosmos: "Cosmos",
  crystal: "Crystal",
  forest: "Forest",
  moonwarrior: "Moon",
  shroom: "Shroom",
  sun: "Sun",
  sunwarrior: "Warrior",
  trident: "Trident",
  yingyang: "Yin Yang",
};

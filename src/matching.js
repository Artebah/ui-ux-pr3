export function matchingRecipes(recipes, selected) {
  if (!selected.size) return [];

  return recipes.flatMap(recipe => {
    const missing = recipe.ingredients.map(([name]) => name).filter(name => !selected.has(name));
    const matched = recipe.ingredients.length - missing.length;
    return matched > 0 && missing.length <= 2 ? [{recipe, missing, matched}] : [];
  }).sort((a, b) => a.missing.length - b.missing.length || b.matched - a.matched || a.recipe.time - b.recipe.time);
}

export function filterCatalog(recipes, {query, type, time, difficulty, diet, sort}, selected = new Set()) {
  const matchedCount = recipe => recipe.ingredients.filter(([name]) => selected.has(name)).length;
  const order = {
    time: (a, b) => a.time - b.time,
    difficulty: (a, b) => Number(a.difficulty !== "Легко") - Number(b.difficulty !== "Легко") || a.time - b.time,
    name: (a, b) => a.name.localeCompare(b.name, "uk"),
    matches: (a, b) => matchedCount(b) - matchedCount(a) || a.time - b.time,
  };
  const needle = query.trim().toLocaleLowerCase("uk");
  return recipes.filter(recipe =>
    recipe.name.toLocaleLowerCase("uk").includes(needle) &&
    (!type || recipe.type === type) &&
    (!time || recipe.time <= Number(time)) &&
    (!difficulty || recipe.difficulty === difficulty) &&
    (!diet || recipe.diets.includes(diet))
  ).sort(order[sort]);
}

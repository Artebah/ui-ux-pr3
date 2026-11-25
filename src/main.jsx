import {useEffect, useRef, useState} from "react";
import {createRoot} from "react-dom/client";
import {Heart, RotateCcw, Search} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {NativeSelect, NativeSelectOption} from "@/components/ui/native-select";
import recipes from "./recipes.json";
import {filterCatalog, matchingRecipes} from "./matching";
import "./style.css";

const routes = [["", "Головна"], ["ingredients", "Підбір"], ["recipes", "Каталог"], ["favorites", "Обране"]];
const ingredients = [...new Set(recipes.flatMap(recipe => recipe.ingredients.map(([name]) => name)))].sort((a, b) => a.localeCompare(b, "uk"));
const asset = filename => import.meta.env.BASE_URL + filename + "?v=" + __PHOTO_VERSIONS__[filename];
const recipeUrl = recipe => "#/recipes/" + recipe.id;
const format = new Intl.NumberFormat("uk", {maximumFractionDigits: 2});
const storageKey = "easyrecipe-favorites";
const initialFilters = {query: "", type: "", time: "", difficulty: "", diet: "", sort: "time"};

function readFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

function Metadata({recipe}) {
  return <p className="metadata"><span>{recipe.type}</span><span>{recipe.time} хв</span><span>{recipe.difficulty}</span><span>≈ {recipe.kcal} ккал / порція</span></p>;
}

function FavoriteButton({recipe, favorites, onFavorite, detail = false}) {
  const saved = favorites.has(recipe.id);
  return <Button type="button" variant="outline" size={detail ? "default" : "icon"} className={detail ? "favorite-detail" : "heart"} data-favorite={recipe.id}
    aria-label={`Обране: ${recipe.name}`} aria-pressed={saved} onClick={() => onFavorite(recipe)}>
    <Heart aria-hidden="true" fill={saved ? "currentColor" : "none"} />
    {detail && (saved ? "У збережених" : "Зберегти")}
  </Button>;
}

function RecipeCard({recipe, missing, favoriteProps, heading: Heading = "h3"}) {
  return <Card role="article" className="card">
    <img src={asset(recipe.image)} alt={recipe.alt} width="480" height="300" loading="lazy" />
    <FavoriteButton recipe={recipe} {...favoriteProps} />
    <CardContent className="card-body">
      <Heading><a href={recipeUrl(recipe)}>{recipe.name}</a></Heading>
      <Metadata recipe={recipe} />
      <p className="muted">{recipe.ingredients.map(([name]) => name).join(", ")}</p>
      {missing && (missing.length
        ? <Badge variant="secondary" className="status warning">Бракує: {missing.join(", ")}</Badge>
        : <Badge variant="secondary" className="status">Усі інгредієнти є</Badge>)}
    </CardContent>
  </Card>;
}

function RecipeGrid({entries, favoriteProps, heading}) {
  return <div className="grid">
    {entries.map(({recipe, missing}) => <RecipeCard key={recipe.id} {...{recipe, missing, favoriteProps, heading}} />)}
  </div>;
}

function Intro({title, children}) {
  return <div className="intro"><h1>{title}</h1><p>{children}</p></div>;
}

function Empty({children}) {
  return <div className="empty"><p>{children}</p></div>;
}

function Home({favoriteProps}) {
  return <>
    <section className="hero">
      <div className="hero-copy"><h1>Готуй із того, що вже є вдома</h1>
        <p>Обери продукти зі свого холодильника й знайди страву, яку можна приготувати вже сьогодні.</p>
        <div className="actions"><Button asChild><a href="#/ingredients">Підібрати рецепт</a></Button><Button asChild variant="outline"><a href="#/recipes">Переглянути каталог</a></Button></div>
      </div>
      <img src={asset("hero.jpg")} alt="Омлет із зеленню, яйця й помідори на столі" width="744" height="449" fetchPriority="high" />
    </section>
    <section className="section" aria-labelledby="ideas">
      <div className="section-head"><h2 id="ideas">Смачні ідеї на сьогодні</h2><a href="#/recipes">Усі рецепти</a></div>
      <RecipeGrid entries={recipes.slice(0, 3).map(recipe => ({recipe}))} favoriteProps={favoriteProps} />
    </section>
  </>;
}

function IngredientPicker({selected, setSelected, favoriteProps}) {
  const [query, setQuery] = useState("");
  const search = useRef(null);
  const results = useRef(null);
  const needle = query.trim().toLocaleLowerCase("uk");
  const matches = matchingRecipes(recipes, selected);
  const groups = [
    ["Можна приготувати прямо зараз", matches.filter(match => !match.missing.length)],
    ["Бракує 1–2 інгредієнтів", matches.filter(match => match.missing.length)],
  ];
  function toggle(name) {
    const next = new Set(selected);
    if (next.has(name)) {
      next.delete(name);
      if (!name.includes(needle)) search.current.focus();
    } else {
      next.add(name);
    }
    setSelected(next);
  }
  return <>
    <Intro title="Що є у вашому холодильнику?">Додайте наявні продукти. Ми покажемо, що можна приготувати та чого бракує.</Intro>
    <section className="panel" aria-label="Вибір продуктів">
      <label className="field">Знайти інгредієнт<Input ref={search} type="search" placeholder="Наприклад, яйця або молоко" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <div className="chips">{ingredients.filter(name => selected.has(name) || name.includes(needle)).map(name =>
        <button key={name} className="chip" type="button" aria-pressed={selected.has(name)} onClick={() => toggle(name)}>{name}</button>)}</div>
      {needle && !ingredients.some(name => name.includes(needle)) && <p className="muted">Інгредієнта з такою назвою немає в каталозі.</p>}
      <div className="actions">
        <Button type="button" variant="outline" onClick={() => {setSelected(new Set()); setQuery("");}}>Очистити вибір</Button>
        <Button type="button" onClick={() => results.current.focus()}>До результатів</Button>
      </div>
      <p className="result-count" role="status">Обрано продуктів: {selected.size}. Знайдено рецептів: {matches.length}.</p>
    </section>
    <section className="section" ref={results} tabIndex={-1} aria-label="Результати підбору">
      {!selected.size ? <Empty><strong>Почніть з інгредієнтів</strong><br />Оберіть продукти, щоб побачити рецепти.</Empty>
        : !matches.length ? <Empty>За цими продуктами збігів немає. Додайте інші інгредієнти або <a href="#/recipes">перегляньте каталог</a>.</Empty>
          : groups.map(([title, entries]) => entries.length > 0 && <section className="match-group" key={title}>
            <h2>{title}</h2><RecipeGrid entries={entries} favoriteProps={favoriteProps} />
          </section>)}
    </section>
  </>;
}

function SelectField({label, values, value, onChange}) {
  return <label className="field">{label}<NativeSelect value={value} onChange={event => onChange(event.target.value)}>
    {values.map(option => {
      const [id, title] = Array.isArray(option) ? option : [option, option];
      return <NativeSelectOption key={id} value={id}>{title}</NativeSelectOption>;
    })}
  </NativeSelect></label>;
}

const any = ["", "Усі"];
const catalogFields = [
  ["type", "Тип страви", [any, ...new Set(recipes.map(recipe => recipe.type))]],
  ["time", "Час", [any, ["15", "До 15 хв"], ["30", "До 30 хв"], ["60", "До 60 хв"]]],
  ["difficulty", "Складність", [any, "Легко", "Середньо"]],
  ["diet", "Раціон", [any, ...new Set(recipes.flatMap(recipe => recipe.diets))]],
  ["sort", "Сортування", [["time", "Найшвидші"], ["difficulty", "За складністю"], ["matches", "За кількістю збігів"], ["name", "За назвою"]]],
];

function Catalog({filters, setFilters, selected, favoriteProps}) {
  const results = filterCatalog(recipes, filters, selected);
  const setFilter = (name, value) => setFilters(current => ({...current, [name]: value}));
  return <>
    <Intro title="Каталог рецептів">Знайдіть страву за назвою або скористайтеся фільтрами.</Intro>
    <form className="panel filter-panel" aria-label="Фільтри каталогу" onSubmit={event => event.preventDefault()}
      onReset={event => {event.preventDefault(); setFilters(initialFilters);}}>
      <div className="filter-toolbar">
        <label className="field search-field">Назва страви
          <span className="search-control"><Search aria-hidden="true" /><Input type="search" placeholder="Наприклад, омлет" value={filters.query} onChange={event => setFilter("query", event.target.value)} /></span>
        </label>
        <Button type="reset" variant="outline"><RotateCcw aria-hidden="true" />Скинути фільтри</Button>
      </div>
      <div className="controls">{catalogFields.map(([name, label, values]) => <SelectField key={name} label={label} values={values}
        value={filters[name]} onChange={value => setFilter(name, value)} />)}</div>
    </form>
    <p className="result-count" role="status">Знайдено рецептів: {results.length}.</p>
    <section aria-label="Рецепти">{results.length
      ? <RecipeGrid entries={results.map(recipe => ({recipe}))} favoriteProps={favoriteProps} heading="h2" />
      : <Empty>Нічого не знайдено. Змініть назву або послабте фільтри.</Empty>}</section>
  </>;
}

function RecipeDetail({recipe, favoriteProps}) {
  const [portions, setPortions] = useState(recipe.servings);
  return <>
    <a href="#/recipes">До каталогу</a>
    <section className="detail">
      <div className="detail-copy"><h1>{recipe.name}</h1><Metadata recipe={recipe} /><FavoriteButton recipe={recipe} detail {...favoriteProps} /></div>
      <img src={asset(recipe.image)} alt={recipe.alt} width="480" height="300" />
    </section>
    <div className="recipe-body">
      <section className="panel"><h2>Інгредієнти</h2>
        <SelectField label="Кількість порцій" values={[1, 2, 3, 4, 5, 6]} value={portions} onChange={value => setPortions(Number(value))} />
        <ul aria-live="polite">{recipe.ingredients.map(([name, quantity, unit]) =>
          <li key={name}>{name} — {format.format(quantity * portions / recipe.servings)} {unit}</li>)}</ul>
      </section>
      <section className="panel"><h2>Приготування</h2><ol>{recipe.steps.map(step =>
        <li key={step}><label className="step"><input type="checkbox" /><span>{step}</span></label></li>)}</ol></section>
    </div>
  </>;
}

function Favorites({favoriteProps}) {
  const items = recipes.filter(recipe => favoriteProps.favorites.has(recipe.id));
  return <>
    <Intro title="Обране">Тут зібрані рецепти, які ви зберегли в цьому браузері.</Intro>
    <div id="favorites-list">{items.length
      ? <RecipeGrid entries={items.map(recipe => ({recipe}))} favoriteProps={favoriteProps} heading="h2" />
      : <Empty>Поки що тут порожньо. <a href="#/recipes">Знайдіть рецепт у каталозі</a> й натисніть серце.</Empty>}</div>
  </>;
}

function App() {
  const readRoute = () => location.hash.startsWith("#/") ? location.hash.slice(2) : "";
  const [route, setRoute] = useState(readRoute);
  const [selected, setSelected] = useState(() => new Set());
  const [filters, setFilters] = useState(initialFilters);
  const [favorites, setFavorites] = useState(readFavorites);
  const [notice, setNotice] = useState("");
  const main = useRef(null);
  const initialRoute = useRef(true);
  const pendingFavoriteFocus = useRef(null);
  const [view, id] = route.split("/");
  const recipe = id && recipes.find(item => item.id === id);

  useEffect(() => {
    const change = () => setRoute(readRoute());
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    document.title = main.current.querySelector("h1").textContent + " · EasyRecipe";
    if (initialRoute.current) {
      initialRoute.current = false;
      return;
    }
    main.current.focus({preventScroll: true});
    scrollTo(0, 0);
  }, [route]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timeout);
  }, [notice]);
  useEffect(() => {
    if (view !== "favorites" || pendingFavoriteFocus.current === null) return;
    const buttons = [...main.current.querySelectorAll("[data-favorite]")];
    const focus = buttons[Math.min(pendingFavoriteFocus.current, buttons.length - 1)] || main.current.querySelector("#favorites-list a");
    pendingFavoriteFocus.current = null;
    focus?.focus();
  }, [favorites, view]);

  function onFavorite(item) {
    const next = new Set(favorites);
    const saved = !next.has(item.id);
    if (saved) next.add(item.id);
    else {
      next.delete(item.id);
      if (view === "favorites") {
        const buttons = [...main.current.querySelectorAll("[data-favorite]")];
        pendingFavoriteFocus.current = buttons.findIndex(button => button.dataset.favorite === item.id);
      }
    }
    let persistenceMessage = "";
    try { localStorage.setItem(storageKey, JSON.stringify([...next])); }
    catch { persistenceMessage = " Браузерне сховище недоступне. Зміна діє до перезавантаження."; }
    setFavorites(next);
    setNotice(`${saved ? "Збережено" : "Видалено з обраного"}: ${item.name}.${persistenceMessage}`);
  }

  const favoriteProps = {favorites, onFavorite};
  let screen;
  if (!view) screen = <Home favoriteProps={favoriteProps} />;
  else if (view === "ingredients") screen = <IngredientPicker {...{selected, setSelected, favoriteProps}} />;
  else if (view === "recipes" && !id) screen = <Catalog {...{filters, setFilters, selected, favoriteProps}} />;
  else if (view === "recipes" && recipe) screen = <RecipeDetail key={recipe.id} {...{recipe, favoriteProps}} />;
  else if (view === "favorites") screen = <Favorites favoriteProps={favoriteProps} />;
  else screen = <><Intro title="Сторінку не знайдено">Можливо, посилання застаріло.</Intro><a className="button" href="#/recipes">До каталогу</a></>;

  return <>
    <a className="skip" href="#main" onClick={event => {event.preventDefault(); main.current.focus();}}>Перейти до вмісту</a>
    <header className="header"><div className="wrap top">
      <a className="brand" href="#/"><span aria-hidden="true">ER</span> EasyRecipe</a>
      <nav aria-label="Основна навігація">{routes.map(([path, title]) =>
        <a key={path} href={`#/${path}`} aria-current={view === path ? (id ? "location" : "page") : undefined}>{title}</a>)}</nav>
    </div></header>
    <main className="wrap" id="main" ref={main} tabIndex={-1}>{screen}</main>
    <p id="notice" className={notice ? undefined : "sr"} role="status">{notice}</p>
    <footer><div className="wrap">EasyRecipe · Готуйте з того, що вже є</div></footer>
  </>;
}

createRoot(document.getElementById("root")).render(<App />);

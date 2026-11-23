import type { Question } from "./game";

/**
 * Questions des thèmes d'origine : 20 par thème, chacune portant sur un fait
 * stable et largement documenté (pas de chiffre sujet à changement).
 */
const q = (id: string, category: string, prompt: string, options: string[], correct: number, explanation: string): Question => ({ id, prompt, options, correct, explanation, category });
const tf = (id: string, category: string, prompt: string, answer: boolean, explanation: string): Question => ({ id, prompt, options: ["Vrai", "Faux"], correct: answer ? 0 : 1, explanation, category, type: "truefalse" });

const POP = "Pop culture";
export const popQuestions: Question[] = [
  q("pop-1", POP, "Comment s’appelle le frère de Mario ?", ["Wario", "Luigi", "Yoshi", "Toad"], 1, "C’est Luigi, le plombier à la casquette verte. Le joueur 2 mérite aussi son moment de gloire !"),
  q("pop-2", POP, "Sur quelle plateforme peut-on regarder Stranger Things ?", ["Disney+", "Prime Video", "Netflix", "Apple TV+"], 2, "Stranger Things est une série originale Netflix, lancée en 2016."),
  q("pop-3", POP, "« Vers l’infini et au-delà ! » Qui a dit ça ?", ["Superman", "Buzz l’Éclair", "Wall-E", "Dark Vador"], 1, "C’est la réplique culte de Buzz l’Éclair dans Toy Story."),
  q("pop-4", POP, "De quel type est le Pokémon Pikachu ?", ["Feu", "Plante", "Normal", "Électrik"], 3, "Pikachu est de type Électrik. Ses joues rouges emmagasinent de l’électricité."),
  q("pop-5", POP, "Dans quel pays Spotify a-t-il été créé ?", ["États-Unis", "Suède", "Royaume-Uni", "Danemark"], 1, "Spotify est né à Stockholm, en Suède, en 2006."),
  q("pop-6", POP, "Quel réalisateur a signé les quatre premiers épisodes de la série Mercredi ?", ["Steven Spielberg", "Wes Anderson", "Tim Burton", "Christopher Nolan"], 2, "L’univers gothique et décalé de Mercredi porte la signature de Tim Burton."),
  q("pop-7", POP, "Comment s’appelle l’école de sorcellerie où étudie Harry Potter ?", ["Beauxbâtons", "Poudlard", "Durmstrang", "Serdaigle"], 1, "Harry étudie à Poudlard. Beauxbâtons et Durmstrang sont deux autres écoles de sorcellerie de la saga."),
  q("pop-8", POP, "Dans quelle saga de films trouve-t-on le capitaine Jack Sparrow ?", ["Pirates des Caraïbes", "Indiana Jones", "Le Seigneur des anneaux", "Peter Pan"], 0, "Jack Sparrow, interprété par Johnny Depp, est le héros de Pirates des Caraïbes."),
  q("pop-9", POP, "Quel groupe a chanté « Bohemian Rhapsody » ?", ["The Beatles", "Queen", "Pink Floyd", "ABBA"], 1, "« Bohemian Rhapsody » est un titre de Queen, sorti en 1975. Freddie Mercury en était le chanteur."),
  q("pop-10", POP, "Dans Star Wars, qui est le père de Luke Skywalker ?", ["Obi-Wan Kenobi", "L’Empereur Palpatine", "Dark Vador", "Han Solo"], 2, "Dark Vador, autrefois Anakin Skywalker, révèle à Luke qu’il est son père dans L’Empire contre-attaque."),
  q("pop-11", POP, "Quel chanteur est surnommé le « Roi de la pop » ?", ["Prince", "Elvis Presley", "Michael Jackson", "Justin Timberlake"], 2, "Michael Jackson porte ce surnom. Son album Thriller (1982) est l’un des plus vendus de l’histoire."),
  q("pop-12", POP, "Dans quel jeu vidéo construit-on et explore-t-on un monde fait de blocs cubiques ?", ["Fortnite", "Roblox", "Minecraft", "Terraria"], 2, "Minecraft, créé par Markus Persson puis développé par Mojang, est connu pour son monde de blocs."),
  tf("pop-13", POP, "Dans la saga The Legend of Zelda, le héros que l’on incarne s’appelle Zelda.", false, "Faux : le héros s’appelle Link. Zelda est la princesse qu’il cherche à protéger."),
  q("pop-14", POP, "Comment s’appelle le royaume d’Elsa et Anna dans La Reine des neiges ?", ["Arendelle", "Agrabah", "Corona", "Atlantica"], 0, "Elsa et Anna vivent à Arendelle. Agrabah est la ville d’Aladdin, Corona celle de Raiponce."),
  q("pop-15", POP, "Quel super-héros se cache derrière l’identité de Peter Parker ?", ["Batman", "Spider-Man", "Iron Man", "Flash"], 1, "Peter Parker est Spider-Man, piqué par une araignée radioactive dans les comics de Marvel."),
  q("pop-16", POP, "Quelle série raconte la lutte pour le Trône de fer ?", ["Vikings", "The Witcher", "Game of Thrones", "Rome"], 2, "Game of Thrones, diffusée de 2011 à 2019, adapte les romans de George R. R. Martin."),
  q("pop-17", POP, "Dans quelle ville se déroule la série Friends ?", ["Los Angeles", "Chicago", "Boston", "New York"], 3, "Les six amis vivent à New York et se retrouvent souvent au café Central Perk."),
  q("pop-18", POP, "Quelle chanteuse est derrière le tube « Shake It Off » ?", ["Taylor Swift", "Katy Perry", "Adele", "Rihanna"], 0, "« Shake It Off » est un titre de Taylor Swift, sorti en 2014."),
  q("pop-19", POP, "Quel petit robot de Pixar est chargé de nettoyer une Terre abandonnée ?", ["R2-D2", "WALL-E", "Baymax", "Robby"], 1, "WALL-E, sorti en 2008, compacte les déchets d’une planète désertée. R2-D2 vient de Star Wars, Baymax de Disney."),
  q("pop-20", POP, "En quelle année est sorti le film Avatar de James Cameron ?", ["2005", "2007", "2009", "2012"], 2, "Le premier Avatar est sorti en décembre 2009."),
];

const WORLD = "Tour du monde";
export const worldQuestions: Question[] = [
  q("world-1", WORLD, "Quelle est la capitale de l’Australie ?", ["Sydney", "Melbourne", "Canberra", "Perth"], 2, "C’est Canberra, choisie comme compromis entre les rivales Sydney et Melbourne."),
  q("world-2", WORLD, "Quel est le plus grand océan de la planète ?", ["Atlantique", "Indien", "Arctique", "Pacifique"], 3, "Le Pacifique est le plus vaste des océans, il couvre environ un tiers de la surface du globe."),
  q("world-3", WORLD, "Quelle grande ville s’étend sur deux continents ?", ["Istanbul", "Le Caire", "Athènes", "Lisbonne"], 0, "Istanbul est à cheval sur l’Europe et l’Asie, de part et d’autre du Bosphore."),
  q("world-4", WORLD, "Quel pays a une feuille d’érable sur son drapeau ?", ["Japon", "Canada", "Suisse", "Nouvelle-Zélande"], 1, "Le Canada. Ce drapeau est en place depuis 1965."),
  q("world-5", WORLD, "Dans quelle ville se trouve la Sagrada Família ?", ["Madrid", "Rome", "Barcelone", "Séville"], 2, "La basilique d’Antoni Gaudí se trouve à Barcelone. Sa construction a commencé en 1882."),
  q("world-6", WORLD, "Quel est le plus long fleuve de France ?", ["La Seine", "La Loire", "Le Rhône", "La Garonne"], 1, "La Loire, avec environ 1 000 km, est le plus long fleuve de France."),
  q("world-7", WORLD, "Quelle est la capitale du Brésil ?", ["Rio de Janeiro", "São Paulo", "Salvador", "Brasilia"], 3, "Brasilia, inaugurée en 1960. Rio de Janeiro était la capitale auparavant."),
  q("world-8", WORLD, "Quel est le plus haut sommet du monde ?", ["Le K2", "L’Everest", "Le mont Blanc", "Le Kilimandjaro"], 1, "L’Everest, dans l’Himalaya, culmine à environ 8 849 mètres."),
  q("world-9", WORLD, "Quel est le plus grand désert chaud du monde ?", ["Le Sahara", "Le Gobi", "Le Kalahari", "Le désert d’Arabie"], 0, "Le Sahara, en Afrique du Nord, est le plus grand désert chaud du monde."),
  q("world-10", WORLD, "Dans quel pays se trouve le site du Machu Picchu ?", ["Mexique", "Bolivie", "Pérou", "Colombie"], 2, "Le Machu Picchu est une cité inca des Andes, au Pérou."),
  q("world-11", WORLD, "Quel fleuve traverse Budapest ?", ["Le Danube", "Le Rhin", "La Vistule", "L’Elbe"], 0, "Le Danube sépare Buda et Pest, les deux anciennes villes qui forment la capitale hongroise."),
  q("world-12", WORLD, "Quel pays a la forme d’une botte ?", ["Grèce", "Portugal", "Italie", "Croatie"], 2, "L’Italie, dont la péninsule dessine une botte."),
  q("world-13", WORLD, "Quel est le plus petit pays du monde par sa superficie ?", ["Monaco", "Le Vatican", "Saint-Marin", "Liechtenstein"], 1, "Le Vatican fait environ 0,44 km², moins que bien des parcs urbains."),
  q("world-14", WORLD, "Quelle est la capitale du Canada ?", ["Toronto", "Montréal", "Vancouver", "Ottawa"], 3, "Ottawa. Toronto et Montréal sont plus peuplées, mais ne sont pas la capitale."),
  tf("world-15", WORLD, "Le mont Blanc est le plus haut sommet des Alpes.", true, "Vrai : il culmine à environ 4 806 mètres."),
  q("world-16", WORLD, "Quelle chaîne de montagnes sépare traditionnellement l’Europe de l’Asie ?", ["L’Oural", "Le Caucase", "Les Carpates", "Les Pyrénées"], 0, "L’Oural, en Russie, est la limite conventionnelle entre l’Europe et l’Asie."),
  q("world-17", WORLD, "Quelle est la capitale du Kenya ?", ["Addis-Abeba", "Nairobi", "Dakar", "Lagos"], 1, "Nairobi est la capitale du Kenya."),
  q("world-18", WORLD, "Quel détroit sépare l’Espagne du Maroc ?", ["Le Bosphore", "Le détroit de Messine", "Le détroit de Gibraltar", "Le détroit de Magellan"], 2, "Le détroit de Gibraltar relie l’Atlantique à la Méditerranée et ne mesure que 14 km à son point le plus étroit."),
  q("world-19", WORLD, "Dans quel pays se trouve le Taj Mahal ?", ["Inde", "Pakistan", "Iran", "Turquie"], 0, "Le Taj Mahal est un mausolée de marbre blanc situé à Agra, en Inde."),
  q("world-20", WORLD, "Quel océan borde la côte est de l’Afrique ?", ["L’océan Atlantique", "L’océan Arctique", "L’océan Pacifique", "L’océan Indien"], 3, "La côte est de l’Afrique donne sur l’océan Indien. La côte ouest, sur l’Atlantique."),
];

const FOOD = "À table !";
export const foodQuestions: Question[] = [
  q("food-1", FOOD, "Quelle herbe est la star du pesto traditionnel ?", ["Persil", "Coriandre", "Basilic", "Menthe"], 2, "Le pesto genovese se prépare avec du basilic, des pignons, de l’ail, de l’huile d’olive et du fromage."),
  q("food-2", FOOD, "De quel pays vient le tiramisu ?", ["Espagne", "France", "Grèce", "Italie"], 3, "Le tiramisu est italien. Son nom signifie « remonte-moi le moral »."),
  q("food-3", FOOD, "Quelle épice colore et parfume la paella traditionnelle ?", ["Curcuma", "Safran", "Paprika", "Curry"], 1, "Le safran, tiré des stigmates du crocus, donne sa teinte dorée au riz."),
  q("food-4", FOOD, "Quel est l’ingrédient principal du guacamole ?", ["Courgette", "Petit pois", "Avocat", "Concombre"], 2, "L’avocat. Le guacamole est une spécialité mexicaine."),
  q("food-5", FOOD, "Quel fromage garnit traditionnellement une pizza Margherita ?", ["Gruyère", "Mozzarella", "Cheddar", "Emmental"], 1, "La mozzarella, avec la tomate et le basilic, reprend les couleurs du drapeau italien."),
  q("food-6", FOOD, "Quel fruit sert à faire le cidre ?", ["La poire", "La cerise", "Le raisin", "La pomme"], 3, "Le cidre est fabriqué à partir de jus de pomme fermenté. Avec des poires, on obtient du poiré."),
  q("food-7", FOOD, "Quel est l’ingrédient principal du houmous ?", ["Les lentilles", "Les pois chiches", "Les haricots blancs", "Les fèves"], 1, "Le houmous se prépare avec des pois chiches mixés, du tahini, du citron et de l’huile d’olive."),
  q("food-8", FOOD, "À partir de quelle plante fabrique-t-on le tofu ?", ["Le soja", "Le riz", "Le maïs", "Le blé"], 0, "Le tofu est obtenu en faisant cailler du lait de soja."),
  q("food-9", FOOD, "Quel fruit est traditionnellement utilisé dans un clafoutis ?", ["Les pommes", "Les fraises", "Les cerises", "Les abricots"], 2, "Le clafoutis traditionnel, originaire du Limousin, est fait avec des cerises."),
  q("food-10", FOOD, "Quel légume fait souvent pleurer quand on le coupe ?", ["Le poireau", "L’oignon", "Le céleri", "Le radis"], 1, "En coupant l’oignon, on libère un gaz qui irrite les yeux."),
  q("food-11", FOOD, "De quel pays vient la feta ?", ["Turquie", "Italie", "Grèce", "Bulgarie"], 2, "La feta est un fromage grec, fabriqué avec du lait de brebis, éventuellement mélangé à du lait de chèvre."),
  q("food-12", FOOD, "Avec quoi fabrique-t-on le chocolat ?", ["Des fèves de cacao", "Des grains de café", "Des noisettes", "De la vanille"], 0, "Le chocolat est fabriqué à partir de fèves de cacao, torréfiées et broyées."),
  q("food-13", FOOD, "Quelle sauce se prépare en émulsionnant un jaune d’œuf avec de l’huile ?", ["La béchamel", "La vinaigrette", "Le ketchup", "La mayonnaise"], 3, "La mayonnaise est une émulsion de jaune d’œuf et d’huile, relevée de moutarde et de vinaigre."),
  tf("food-14", FOOD, "Sur le plan botanique, la tomate est un fruit.", true, "Vrai : elle provient de la fleur et renferme des graines. On la cuisine pourtant comme un légume."),
  tf("food-15", FOOD, "Le café est fabriqué à partir de fèves de cacao.", false, "Faux : le café provient des graines du caféier. Les fèves de cacao servent à faire le chocolat."),
  q("food-16", FOOD, "Dans quelle ville est née la pizza napolitaine ?", ["Rome", "Naples", "Milan", "Florence"], 1, "La pizza napolitaine vient de Naples, dans le sud de l’Italie."),
  q("food-17", FOOD, "Quelle pâtisserie au beurre est une spécialité de Bretagne ?", ["Le kouign-amann", "Le canelé", "La madeleine", "Le financier"], 0, "Le kouign-amann, né à Douarnenez, est un gâteau breton feuilleté au beurre. Le canelé est bordelais."),
  q("food-18", FOOD, "Que signifie une cuisson « al dente » pour des pâtes ?", ["Très fondantes", "À peine cuites", "Fermes sous la dent", "Grillées"], 2, "« Al dente » (« à la dent » en italien) désigne des pâtes cuites mais encore fermes sous la dent."),
  q("food-19", FOOD, "Quel légume est la base du kimchi, spécialité coréenne ?", ["Le chou chinois", "Le concombre", "Le radis noir", "La carotte"], 0, "Le kimchi traditionnel est fait de chou chinois fermenté avec des piments, de l’ail et du gingembre."),
  q("food-20", FOOD, "Quel pays est le premier producteur mondial de café ?", ["Colombie", "Vietnam", "Éthiopie", "Brésil"], 3, "Le Brésil est le premier producteur mondial de café depuis plus d’un siècle."),
];

/** « Le grand mélange » : 20 questions équilibrées, en alternant les trois thèmes. */
const pick = (list: Question[], ids: number[]) => ids.map(i => list[i - 1]);
const parts = [pick(popQuestions, [1, 3, 9, 10, 14, 16, 19]), pick(worldQuestions, [1, 3, 6, 8, 12, 15, 18]), pick(foodQuestions, [1, 3, 5, 14, 17, 20])];
export const mixQuestions: Question[] = Array.from({ length: 7 }, (_, i) => parts.map(list => list[i])).flat().filter((x): x is Question => Boolean(x));

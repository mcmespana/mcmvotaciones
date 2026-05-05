/**
 * Fun test datasets for QA / stress testing the voting system.
 * Each dataset provides candidates with names, locations, groups, and ages.
 */

export interface TestCandidate {
  name: string;
  surname: string;
  location: string;
  group_name: string;
  age: number | null;
  description: string;
  image_url: string;
}

export interface TestDataset {
  id: string;
  title: string;
  description: string;
  team: "ECE" | "ECL";
  emoji: string;
  candidates: TestCandidate[];
}

export const testDatasets: TestDataset[] = [
  {
    id: "breakfast-world-cup",
    title: "🍳 Mundial de Desayunos",
    description:
      "¿Quién ganará la copa mundial de los desayunos? Vota por tu favorito.",
    team: "ECE",
    emoji: "🍳",
    candidates: [
      {
        name: "Croissant",
        surname: "Mantequilla",
        location: "Francia",
        group_name: "Dulces",
        age: 180,
        description:
          "Crujiente por fuera, tierno por dentro. El clásico francés.",
        image_url: "https://loremflickr.com/400/400/croissant?lock=1",
      },
      {
        name: "Churros",
        surname: "con Chocolate",
        location: "España",
        group_name: "Dulces",
        age: 400,
        description: "Fritos, azucarados y mojados en chocolate espeso.",
        image_url: "https://loremflickr.com/400/400/churros,chocolate?lock=2",
      },
      {
        name: "Pancakes",
        surname: "Sirope de Arce",
        location: "Estados Unidos",
        group_name: "Dulces",
        age: 250,
        description: "Torre de tortitas esponjosas bañadas en sirope.",
        image_url: "https://loremflickr.com/400/400/pancakes?lock=3",
      },
      {
        name: "Arepa",
        surname: "Reina Pepiada",
        location: "Venezuela",
        group_name: "Salados",
        age: 3000,
        description:
          "Masa de maíz rellena de pollo y aguacate. Patrimonio cultural.",
        image_url: "https://loremflickr.com/400/400/arepa?lock=4",
      },
      {
        name: "Dim Sum",
        surname: "Har Gow",
        location: "China",
        group_name: "Salados",
        age: 1000,
        description:
          "Delicados bocados al vapor de la tradición cantonesa.",
        image_url: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=400&q=80",
      },
      {
        name: "Shakshuka",
        surname: "Especiada",
        location: "Israel",
        group_name: "Salados",
        age: 500,
        description: "Huevos pochados en salsa de tomate con especias.",
        image_url: "https://images.unsplash.com/photo-1590412200988-a436970781fa?auto=format&fit=crop&w=400&q=80",
      },
      {
        name: "Full",
        surname: "English Breakfast",
        location: "Reino Unido",
        group_name: "Salados",
        age: 300,
        description:
          "Huevos, bacon, salchichas, tostadas, beans... ¡completo!",
        image_url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80",
      },
      {
        name: "Tacos",
        surname: "de Desayuno",
        location: "México",
        group_name: "Salados",
        age: 600,
        description: "Tortillas de maíz con huevos, frijoles y salsa verde.",
        image_url: "https://loremflickr.com/400/400/breakfast,tacos?lock=5",
      },
      {
        name: "Açaí",
        surname: "Bowl",
        location: "Brasil",
        group_name: "Bebibles",
        age: 50,
        description: "Superfruta amazónica con granola y frutas tropicales.",
        image_url: "https://loremflickr.com/400/400/acai,bowl?lock=6",
      },
      {
        name: "Matcha",
        surname: "Latte",
        location: "Japón",
        group_name: "Bebibles",
        age: 800,
        description: "Té verde en polvo batido con leche espumosa.",
        image_url: "https://loremflickr.com/400/400/matcha,latte?lock=7",
      },
      {
        name: "Café",
        surname: "Espresso",
        location: "Italia",
        group_name: "Bebibles",
        age: 120,
        description: "Pequeño pero poderoso. La base de todo buen día.",
        image_url: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=400&q=80",
      },
      {
        name: "Tostada",
        surname: "con Tomate",
        location: "España",
        group_name: "Salados",
        age: 200,
        description:
          "Pan crujiente con tomate rallado y aceite de oliva virgen extra.",
        image_url: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=400&q=80",
      },
    ],
  },
  {
    id: "country-cup",
    title: "🌍 Copa de Países",
    description:
      "¿Qué país es el mejor? Vota por tu favorito en esta copa mundial.",
    team: "ECL",
    emoji: "🌍",
    candidates: [
      { name: "España", surname: "🇪🇸", location: "Europa", group_name: "Grupo A", age: null, description: "Sol, playa y paella.", image_url: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=400&q=80" },
      { name: "Brasil", surname: "🇧🇷", location: "América", group_name: "Grupo A", age: null, description: "Samba, fútbol y alegría.", image_url: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=400&q=80" },
      { name: "Japón", surname: "🇯🇵", location: "Asia", group_name: "Grupo B", age: null, description: "Tecnología, tradición y sushi.", image_url: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80" },
      { name: "Italia", surname: "🇮🇹", location: "Europa", group_name: "Grupo B", age: null, description: "Arte, pasta y dolce vita.", image_url: "https://loremflickr.com/400/400/italy,rome?lock=8" },
      { name: "México", surname: "🇲🇽", location: "América", group_name: "Grupo C", age: null, description: "Tacos, mariachi y colores.", image_url: "https://loremflickr.com/400/400/mexico?lock=9" },
      { name: "Australia", surname: "🇦🇺", location: "Oceanía", group_name: "Grupo C", age: null, description: "Canguros, surf y outback.", image_url: "https://loremflickr.com/400/400/australia,sydney?lock=10" },
      { name: "Kenia", surname: "🇰🇪", location: "África", group_name: "Grupo D", age: null, description: "Safaris, atletismo y naturaleza.", image_url: "https://images.unsplash.com/photo-1481464904474-a575a33b44a0?auto=format&fit=crop&w=400&q=80" },
      { name: "Canadá", surname: "🇨🇦", location: "América", group_name: "Grupo D", age: null, description: "Hockey, maple y amabilidad.", image_url: "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=400&q=80" },
      { name: "Francia", surname: "🇫🇷", location: "Europa", group_name: "Grupo A", age: null, description: "Romance, vino y queso.", image_url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80" },
      { name: "Argentina", surname: "🇦🇷", location: "América", group_name: "Grupo B", age: null, description: "Tango, asado y Messi.", image_url: "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?auto=format&fit=crop&w=400&q=80" },
      { name: "India", surname: "🇮🇳", location: "Asia", group_name: "Grupo C", age: null, description: "Bollywood, curry y diversidad.", image_url: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=400&q=80" },
      { name: "Egipto", surname: "🇪🇬", location: "África", group_name: "Grupo D", age: null, description: "Pirámides, faraones e historia.", image_url: "https://loremflickr.com/400/400/egypt,pyramids?lock=11" },
    ],
  },
  {
    id: "movies",
    title: "🎬 Mejores Películas",
    description:
      "¿Cuál es la mejor película de todos los tiempos? Tu voto decide.",
    team: "ECE",
    emoji: "🎬",
    candidates: [
      { name: "El Padrino", surname: "(1972)", location: "USA", group_name: "Drama", age: 53, description: "Una oferta que no podrás rechazar.", image_url: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&w=400&q=80" },
      { name: "Pulp Fiction", surname: "(1994)", location: "USA", group_name: "Thriller", age: 31, description: "Royale with cheese.", image_url: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=80" },
      { name: "El Señor de los Anillos", surname: "(2001)", location: "Nueva Zelanda", group_name: "Fantasía", age: 24, description: "Un anillo para gobernarlos a todos.", image_url: "https://loremflickr.com/400/400/lord,rings,fantasy?lock=12" },
      { name: "Matrix", surname: "(1999)", location: "Australia", group_name: "Sci-Fi", age: 26, description: "¿Pastilla roja o azul?", image_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80" },
      { name: "Parásitos", surname: "(2019)", location: "Corea del Sur", group_name: "Thriller", age: 6, description: "La brecha social nunca fue tan intensa.", image_url: "https://loremflickr.com/400/400/seoul,korea?lock=13" },
      { name: "Spirited Away", surname: "(2001)", location: "Japón", group_name: "Animación", age: 24, description: "El viaje de Chihiro al mundo de los espíritus.", image_url: "https://loremflickr.com/400/400/anime,studio,ghibli?lock=14" },
      { name: "Interstellar", surname: "(2014)", location: "USA", group_name: "Sci-Fi", age: 11, description: "No vayas gentilmente en esa buena noche.", image_url: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=400&q=80" },
      { name: "Amélie", surname: "(2001)", location: "Francia", group_name: "Comedia", age: 24, description: "La fabulosa misión de hacer felices a otros.", image_url: "https://images.unsplash.com/photo-1514315384763-ba401779410f?auto=format&fit=crop&w=400&q=80" },
      { name: "Cinema Paradiso", surname: "(1988)", location: "Italia", group_name: "Drama", age: 37, description: "Una carta de amor al cine.", image_url: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=400&q=80" },
      { name: "Coco", surname: "(2017)", location: "México", group_name: "Animación", age: 8, description: "Recuérdame… antes que el recuerdo se vaya.", image_url: "https://loremflickr.com/400/400/dia,muertos?lock=15" },
      { name: "La Vida es Bella", surname: "(1997)", location: "Italia", group_name: "Drama", age: 28, description: "El humor frente al horror.", image_url: "https://loremflickr.com/400/400/cinema,vintage?lock=16" },
      { name: "Jurassic Park", surname: "(1993)", location: "USA", group_name: "Sci-Fi", age: 32, description: "Los científicos estaban tan ocupados que no pensaron si debían.", image_url: "https://loremflickr.com/400/400/dinosaur?lock=17" },
    ],
  },
  {
    id: "superheroes",
    title: "🦸 Mejor Superhéroe",
    description:
      "¿Quién salvaría mejor el mundo? Vota por tu superhéroe favorito.",
    team: "ECE",
    emoji: "🦸",
    candidates: [
      { name: "Spider-Man", surname: "Peter Parker", location: "Nueva York", group_name: "Marvel", age: 17, description: "Un gran poder conlleva una gran responsabilidad.", image_url: "https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=400&q=80" },
      { name: "Iron Man", surname: "Tony Stark", location: "Malibú", group_name: "Marvel", age: 48, description: "Genio, millonario, playboy, filántropo.", image_url: "https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?auto=format&fit=crop&w=400&q=80" },
      { name: "Capitán América", surname: "Steve Rogers", location: "Brooklyn", group_name: "Marvel", age: 105, description: "Puedo hacer esto todo el día.", image_url: "https://loremflickr.com/400/400/captain,america,shield?lock=18" },
      { name: "Thor", surname: "Odinson", location: "Asgard", group_name: "Marvel", age: 1500, description: "Dios del trueno con martillo incluido.", image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80" },
      { name: "Batman", surname: "Bruce Wayne", location: "Gotham", group_name: "DC", age: 40, description: "Soy la noche. Soy la venganza. Soy Batman.", image_url: "https://loremflickr.com/400/400/batman,gotham?lock=19" },
      { name: "Superman", surname: "Clark Kent", location: "Metrópolis", group_name: "DC", age: 38, description: "El último hijo de Krypton.", image_url: "https://images.unsplash.com/photo-1620336655055-088d06e36bf0?auto=format&fit=crop&w=400&q=80" },
      { name: "Wonder Woman", surname: "Diana Prince", location: "Themyscira", group_name: "DC", age: 5000, description: "Princesa amazona, guerrera incansable.", image_url: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?auto=format&fit=crop&w=400&q=80" },
      { name: "The Flash", surname: "Barry Allen", location: "Central City", group_name: "DC", age: 28, description: "El hombre más rápido del mundo.", image_url: "https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?auto=format&fit=crop&w=400&q=80" },
      { name: "Hulk", surname: "Bruce Banner", location: "Dayton", group_name: "Marvel", age: 50, description: "No te gustaría verme enfadado.", image_url: "https://images.unsplash.com/photo-1635863138275-d9b33299680b?auto=format&fit=crop&w=400&q=80" },
      { name: "Black Widow", surname: "Natasha Romanoff", location: "Stalingrado", group_name: "Marvel", age: 35, description: "Espía letal con un pasado oscuro.", image_url: "https://images.unsplash.com/photo-1626278664285-f796b9ee7806?auto=format&fit=crop&w=400&q=80" },
      { name: "Aquaman", surname: "Arthur Curry", location: "Atlántida", group_name: "DC", age: 36, description: "Rey de los siete mares.", image_url: "https://images.unsplash.com/photo-1583394293214-28ded15ee548?auto=format&fit=crop&w=400&q=80" },
      { name: "Doctor Strange", surname: "Stephen Strange", location: "Nueva York", group_name: "Marvel", age: 45, description: "Hechicero supremo, maestro de las artes místicas.", image_url: "https://loremflickr.com/400/400/wizard,magic?lock=20" },
    ],
  },
  {
    id: "world-desserts",
    title: "🍰 Postres del Mundo",
    description:
      "Una guerra dulce sin precedentes. ¿Cuál es el mejor postre del planeta?",
    team: "ECL",
    emoji: "🍰",
    candidates: [
      { name: "Tiramisú", surname: "Clásico", location: "Italia", group_name: "Europa", age: 60, description: "Bizcochos, café, mascarpone y cacao. Pura elegancia italiana.", image_url: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=400&q=80" },
      { name: "Cheesecake", surname: "New York", location: "Estados Unidos", group_name: "América", age: 150, description: "Cremoso, denso y absolutamente irresistible.", image_url: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=400&q=80" },
      { name: "Macarons", surname: "Parisinos", location: "Francia", group_name: "Europa", age: 200, description: "Pequeñas joyas de almendra en mil colores.", image_url: "https://images.unsplash.com/photo-1558326567-98ae2405596b?auto=format&fit=crop&w=400&q=80" },
      { name: "Mochi", surname: "de Helado", location: "Japón", group_name: "Asia", age: 1000, description: "Bocados de arroz glutinoso rellenos de helado.", image_url: "https://images.unsplash.com/photo-1631206753348-db44968fd440?auto=format&fit=crop&w=400&q=80" },
      { name: "Baklava", surname: "con Pistacho", location: "Turquía", group_name: "Asia", age: 800, description: "Hojaldre crujiente bañado en miel y frutos secos.", image_url: "https://images.unsplash.com/photo-1598110750624-207050c4f28c?auto=format&fit=crop&w=400&q=80" },
      { name: "Brigadeiro", surname: "Brasileño", location: "Brasil", group_name: "América", age: 80, description: "Bombones de chocolate y leche condensada.", image_url: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=400&q=80" },
      { name: "Pavlova", surname: "con Frutas", location: "Australia", group_name: "Oceanía", age: 100, description: "Merengue crujiente con nata y frutas frescas.", image_url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80" },
      { name: "Tarta de Santiago", surname: "Gallega", location: "España", group_name: "Europa", age: 700, description: "Almendra, huevo y azúcar coronada con la cruz de Santiago.", image_url: "https://images.unsplash.com/photo-1606471191009-63994c53433b?auto=format&fit=crop&w=400&q=80" },
      { name: "Flan", surname: "de Caramelo", location: "México", group_name: "América", age: 500, description: "Suave, tembloroso y con caramelo dorado.", image_url: "https://images.unsplash.com/photo-1488477304112-4944851de03d?auto=format&fit=crop&w=400&q=80" },
      { name: "Dorayaki", surname: "de Anko", location: "Japón", group_name: "Asia", age: 200, description: "Las tortitas favoritas de Doraemon, rellenas de pasta de judía.", image_url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80" },
      { name: "Crème Brûlée", surname: "Vainilla", location: "Francia", group_name: "Europa", age: 350, description: "Natilla con costra de azúcar caramelizada.", image_url: "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?auto=format&fit=crop&w=400&q=80" },
      { name: "Malva Pudding", surname: "Sudafricano", location: "Sudáfrica", group_name: "África", age: 120, description: "Bizcocho esponjoso bañado en salsa de albaricoque.", image_url: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=400&q=80" },
    ],
  },
];

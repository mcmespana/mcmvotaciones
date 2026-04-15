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
        image_url: "",
      },
      {
        name: "Churros",
        surname: "con Chocolate",
        location: "España",
        group_name: "Dulces",
        age: 400,
        description: "Fritos, azucarados y mojados en chocolate espeso.",
        image_url: "",
      },
      {
        name: "Pancakes",
        surname: "Sirope de Arce",
        location: "Estados Unidos",
        group_name: "Dulces",
        age: 250,
        description: "Torre de tortitas esponjosas bañadas en sirope.",
        image_url: "",
      },
      {
        name: "Arepa",
        surname: "Reina Pepiada",
        location: "Venezuela",
        group_name: "Salados",
        age: 3000,
        description:
          "Masa de maíz rellena de pollo y aguacate. Patrimonio cultural.",
        image_url: "",
      },
      {
        name: "Dim Sum",
        surname: "Har Gow",
        location: "China",
        group_name: "Salados",
        age: 1000,
        description:
          "Delicados bocados al vapor de la tradición cantonesa.",
        image_url: "",
      },
      {
        name: "Shakshuka",
        surname: "Especiada",
        location: "Israel",
        group_name: "Salados",
        age: 500,
        description: "Huevos pochados en salsa de tomate con especias.",
        image_url: "",
      },
      {
        name: "Full",
        surname: "English Breakfast",
        location: "Reino Unido",
        group_name: "Salados",
        age: 300,
        description:
          "Huevos, bacon, salchichas, tostadas, beans... ¡completo!",
        image_url: "",
      },
      {
        name: "Tacos",
        surname: "de Desayuno",
        location: "México",
        group_name: "Salados",
        age: 600,
        description: "Tortillas de maíz con huevos, frijoles y salsa verde.",
        image_url: "",
      },
      {
        name: "Açaí",
        surname: "Bowl",
        location: "Brasil",
        group_name: "Bebibles",
        age: 50,
        description: "Superfruta amazónica con granola y frutas tropicales.",
        image_url: "",
      },
      {
        name: "Matcha",
        surname: "Latte",
        location: "Japón",
        group_name: "Bebibles",
        age: 800,
        description: "Té verde en polvo batido con leche espumosa.",
        image_url: "",
      },
      {
        name: "Café",
        surname: "Espresso",
        location: "Italia",
        group_name: "Bebibles",
        age: 120,
        description: "Pequeño pero poderoso. La base de todo buen día.",
        image_url: "",
      },
      {
        name: "Tostada",
        surname: "con Tomate",
        location: "España",
        group_name: "Salados",
        age: 200,
        description:
          "Pan crujiente con tomate rallado y aceite de oliva virgen extra.",
        image_url: "",
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
      { name: "España", surname: "🇪🇸", location: "Europa", group_name: "Grupo A", age: null, description: "Sol, playa y paella.", image_url: "" },
      { name: "Brasil", surname: "🇧🇷", location: "América", group_name: "Grupo A", age: null, description: "Samba, fútbol y alegría.", image_url: "" },
      { name: "Japón", surname: "🇯🇵", location: "Asia", group_name: "Grupo B", age: null, description: "Tecnología, tradición y sushi.", image_url: "" },
      { name: "Italia", surname: "🇮🇹", location: "Europa", group_name: "Grupo B", age: null, description: "Arte, pasta y dolce vita.", image_url: "" },
      { name: "México", surname: "🇲🇽", location: "América", group_name: "Grupo C", age: null, description: "Tacos, mariachi y colores.", image_url: "" },
      { name: "Australia", surname: "🇦🇺", location: "Oceanía", group_name: "Grupo C", age: null, description: "Canguros, surf y outback.", image_url: "" },
      { name: "Kenia", surname: "🇰🇪", location: "África", group_name: "Grupo D", age: null, description: "Safaris, atletismo y naturaleza.", image_url: "" },
      { name: "Canadá", surname: "🇨🇦", location: "América", group_name: "Grupo D", age: null, description: "Hockey, maple y amabilidad.", image_url: "" },
      { name: "Francia", surname: "🇫🇷", location: "Europa", group_name: "Grupo A", age: null, description: "Romance, vino y queso.", image_url: "" },
      { name: "Argentina", surname: "🇦🇷", location: "América", group_name: "Grupo B", age: null, description: "Tango, asado y Messi.", image_url: "" },
      { name: "India", surname: "🇮🇳", location: "Asia", group_name: "Grupo C", age: null, description: "Bollywood, curry y diversidad.", image_url: "" },
      { name: "Egipto", surname: "🇪🇬", location: "África", group_name: "Grupo D", age: null, description: "Pirámides, faraones e historia.", image_url: "" },
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
      { name: "El Padrino", surname: "(1972)", location: "USA", group_name: "Drama", age: 53, description: "Una oferta que no podrás rechazar.", image_url: "" },
      { name: "Pulp Fiction", surname: "(1994)", location: "USA", group_name: "Thriller", age: 31, description: "Royale with cheese.", image_url: "" },
      { name: "El Señor de los Anillos", surname: "(2001)", location: "Nueva Zelanda", group_name: "Fantasía", age: 24, description: "Un anillo para gobernarlos a todos.", image_url: "" },
      { name: "Matrix", surname: "(1999)", location: "Australia", group_name: "Sci-Fi", age: 26, description: "¿Pastilla roja o azul?", image_url: "" },
      { name: "Parásitos", surname: "(2019)", location: "Corea del Sur", group_name: "Thriller", age: 6, description: "La brecha social nunca fue tan intensa.", image_url: "" },
      { name: "Spirited Away", surname: "(2001)", location: "Japón", group_name: "Animación", age: 24, description: "El viaje de Chihiro al mundo de los espíritus.", image_url: "" },
      { name: "Interstellar", surname: "(2014)", location: "USA", group_name: "Sci-Fi", age: 11, description: "No vayas gentilmente en esa buena noche.", image_url: "" },
      { name: "Amélie", surname: "(2001)", location: "Francia", group_name: "Comedia", age: 24, description: "La fabulosa misión de hacer felices a otros.", image_url: "" },
      { name: "Cinema Paradiso", surname: "(1988)", location: "Italia", group_name: "Drama", age: 37, description: "Una carta de amor al cine.", image_url: "" },
      { name: "Coco", surname: "(2017)", location: "México", group_name: "Animación", age: 8, description: "Recuérdame… antes que el recuerdo se vaya.", image_url: "" },
      { name: "La Vida es Bella", surname: "(1997)", location: "Italia", group_name: "Drama", age: 28, description: "El humor frente al horror.", image_url: "" },
      { name: "Jurassic Park", surname: "(1993)", location: "USA", group_name: "Sci-Fi", age: 32, description: "Los científicos estaban tan ocupados que no pensaron si debían.", image_url: "" },
    ],
  },
];

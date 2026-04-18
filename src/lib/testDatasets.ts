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
        image_url: "https://images.unsplash.com/photo-1555507036-ab1f40ce88cb?auto=format&fit=crop&w=400&q=80",
      },
      {
        name: "Churros",
        surname: "con Chocolate",
        location: "España",
        group_name: "Dulces",
        age: 400,
        description: "Fritos, azucarados y mojados en chocolate espeso.",
        image_url: "https://images.unsplash.com/photo-1624371414361-e670ead018fd?auto=format&fit=crop&w=400&q=80",
      },
      {
        name: "Pancakes",
        surname: "Sirope de Arce",
        location: "Estados Unidos",
        group_name: "Dulces",
        age: 250,
        description: "Torre de tortitas esponjosas bañadas en sirope.",
        image_url: "https://images.unsplash.com/photo-1528207776546-3841115f4f1f?auto=format&fit=crop&w=400&q=80",
      },
      {
        name: "Arepa",
        surname: "Reina Pepiada",
        location: "Venezuela",
        group_name: "Salados",
        age: 3000,
        description:
          "Masa de maíz rellena de pollo y aguacate. Patrimonio cultural.",
        image_url: "https://images.unsplash.com/photo-1615887023516-9bfa640a3250?auto=format&fit=crop&w=400&q=80",
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
        image_url: "https://images.unsplash.com/photo-1565299585-e6a3dbdf8b9a?auto=format&fit=crop&w=400&q=80",
      },
      {
        name: "Açaí",
        surname: "Bowl",
        location: "Brasil",
        group_name: "Bebibles",
        age: 50,
        description: "Superfruta amazónica con granola y frutas tropicales.",
        image_url: "https://images.unsplash.com/photo-1590675751912-32b00a552882?auto=format&fit=crop&w=400&q=80",
      },
      {
        name: "Matcha",
        surname: "Latte",
        location: "Japón",
        group_name: "Bebibles",
        age: 800,
        description: "Té verde en polvo batido con leche espumosa.",
        image_url: "https://images.unsplash.com/photo-1515823662972-da6a2ca11231?auto=format&fit=crop&w=400&q=80",
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
      { name: "Italia", surname: "🇮🇹", location: "Europa", group_name: "Grupo B", age: null, description: "Arte, pasta y dolce vita.", image_url: "https://images.unsplash.com/photo-1516483638261-f40af5ebcf89?auto=format&fit=crop&w=400&q=80" },
      { name: "México", surname: "🇲🇽", location: "América", group_name: "Grupo C", age: null, description: "Tacos, mariachi y colores.", image_url: "https://images.unsplash.com/photo-1518105779142-d971f22e61dc?auto=format&fit=crop&w=400&q=80" },
      { name: "Australia", surname: "🇦🇺", location: "Oceanía", group_name: "Grupo C", age: null, description: "Canguros, surf y outback.", image_url: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9a7?auto=format&fit=crop&w=400&q=80" },
      { name: "Kenia", surname: "🇰🇪", location: "África", group_name: "Grupo D", age: null, description: "Safaris, atletismo y naturaleza.", image_url: "https://images.unsplash.com/photo-1481464904474-a575a33b44a0?auto=format&fit=crop&w=400&q=80" },
      { name: "Canadá", surname: "🇨🇦", location: "América", group_name: "Grupo D", age: null, description: "Hockey, maple y amabilidad.", image_url: "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=400&q=80" },
      { name: "Francia", surname: "🇫🇷", location: "Europa", group_name: "Grupo A", age: null, description: "Romance, vino y queso.", image_url: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80" },
      { name: "Argentina", surname: "🇦🇷", location: "América", group_name: "Grupo B", age: null, description: "Tango, asado y Messi.", image_url: "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?auto=format&fit=crop&w=400&q=80" },
      { name: "India", surname: "🇮🇳", location: "Asia", group_name: "Grupo C", age: null, description: "Bollywood, curry y diversidad.", image_url: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=400&q=80" },
      { name: "Egipto", surname: "🇪🇬", location: "África", group_name: "Grupo D", age: null, description: "Pirámides, faraones e historia.", image_url: "https://images.unsplash.com/photo-1539667468225-eebb663053ea?auto=format&fit=crop&w=400&q=80" },
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
      { name: "El Señor de los Anillos", surname: "(2001)", location: "Nueva Zelanda", group_name: "Fantasía", age: 24, description: "Un anillo para gobernarlos a todos.", image_url: "https://images.unsplash.com/photo-1462759353907-b2ea5ebd728a?auto=format&fit=crop&w=400&q=80" },
      { name: "Matrix", surname: "(1999)", location: "Australia", group_name: "Sci-Fi", age: 26, description: "¿Pastilla roja o azul?", image_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80" },
      { name: "Parásitos", surname: "(2019)", location: "Corea del Sur", group_name: "Thriller", age: 6, description: "La brecha social nunca fue tan intensa.", image_url: "https://images.unsplash.com/photo-1510255444855-46387d8a6ff6?auto=format&fit=crop&w=400&q=80" },
      { name: "Spirited Away", surname: "(2001)", location: "Japón", group_name: "Animación", age: 24, description: "El viaje de Chihiro al mundo de los espíritus.", image_url: "https://images.unsplash.com/photo-1578305943717-3bfd7ba85a9f?auto=format&fit=crop&w=400&q=80" },
      { name: "Interstellar", surname: "(2014)", location: "USA", group_name: "Sci-Fi", age: 11, description: "No vayas gentilmente en esa buena noche.", image_url: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=400&q=80" },
      { name: "Amélie", surname: "(2001)", location: "Francia", group_name: "Comedia", age: 24, description: "La fabulosa misión de hacer felices a otros.", image_url: "https://images.unsplash.com/photo-1514315384763-ba401779410f?auto=format&fit=crop&w=400&q=80" },
      { name: "Cinema Paradiso", surname: "(1988)", location: "Italia", group_name: "Drama", age: 37, description: "Una carta de amor al cine.", image_url: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=400&q=80" },
      { name: "Coco", surname: "(2017)", location: "México", group_name: "Animación", age: 8, description: "Recuérdame… antes que el recuerdo se vaya.", image_url: "https://images.unsplash.com/photo-1508804185872-d7bad675871e?auto=format&fit=crop&w=400&q=80" },
      { name: "La Vida es Bella", surname: "(1997)", location: "Italia", group_name: "Drama", age: 28, description: "El humor frente al horror.", image_url: "https://images.unsplash.com/photo-1473661131174-cdffba181fc8?auto=format&fit=crop&w=400&q=80" },
      { name: "Jurassic Park", surname: "(1993)", location: "USA", group_name: "Sci-Fi", age: 32, description: "Los científicos estaban tan ocupados que no pensaron si debían.", image_url: "https://images.unsplash.com/photo-1515053229713-14995f190e24?auto=format&fit=crop&w=400&q=80" },
    ],
  },
];

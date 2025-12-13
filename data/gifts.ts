
// A map of common TikTok gift IDs to their coin values.
// This serves as a fallback when the live server doesn't provide the diamondCount.
// Gift values sourced from community lists like streamtoearn.io

export const giftValues = new Map<number, number>([
    // --- 1 Coin Gifts ---
    [5655, 1],   // Rose (Mawar)
    [1, 1],      // TikTok Logo
    // FIX: Corrected the coin value for Finger Heart from 1 to 5 based on recent data.
    [6093, 5],   // Finger Heart (Saranghaeyo)
    [5487, 1],   // Ice Cream Cone
    [6291, 1],   // Coffee
    [5995, 1],   // Mini Speaker
    [6072, 1],   // Love Letter
    [5987, 1],   // Tennis Ball

    // --- Small Gifts (5-99 Coins) ---
    [5592, 5],   // Panda
    [5869, 5],   // Doughnut
    [6104, 10],  // Heart
    [6049, 10],  // Microphone
    [6146, 25],  // Love Bang
    [5760, 29],  // Mishka Bear
    [5607, 30],  // Watermelon
    [5870, 99],  // Confetti
    [5758, 99],  // Heart Balloons

    // --- Medium Gifts (100-999 Coins) ---
    [5678, 100], // Money Gun
    [6001, 199], // Submarine
    [6176, 299], // Wings
    [6303, 399], // Rose Tea
    [5953, 499], // Train
    [5998, 699], // Carousel
    [6203, 899], // Tambourine

    // --- Large Gifts (1000-4999 Coins) ---
    [5831, 1000], // Little Crown
    [6192, 1000], // Swan
    [5585, 1500], // Wishing Bottle
    [5617, 2150], // Whale
    [5988, 2988], // Motorcycle
    [5897, 3000], // Money Rain
    [6191, 4000], // Seiyun's Show

    // --- Epic Gifts (5000-9999 Coins) ---
    [5662, 5000], // Golden Party
    [5992, 6000], // Jet Plane
    [5732, 7000], // Sports Car
    [6054, 7999], // Phoenix
    [6177, 8888], // Leon the Kitten
    
    // --- Whale Gifts (10000+ Coins) ---
    [6042, 10000], // Dragon
    [6428, 10000], // Antares
    [6116, 10999], // Falcon
    [6100, 13000], // Cruise Ship
    [5821, 15000], // Planet
    [5609, 20000], // Fantasy Castle
    [5675, 29999], // Lion
    [5827, 34999], // TikTok Universe
    [9287, 39999], // TikTok Stars
    [9239, 41999], // Leon the Lion
]);

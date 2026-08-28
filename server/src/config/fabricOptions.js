// Reference lists carried over verbatim from the source workbook's "FABRIC" sheet
// (columns B/Color, C/Pattern, D/Nature). These are fixed reference data, not
// user-managed master records — the source never gave them an add/edit UI either.

export const SALE_TYPES = ["YARD", "TROUSER", "BUNDLE"];

export const COLOURS = [
  "Air Force Blue", "Amber", "Amber Orange", "Amethyst", "Antique Gold", "Antique White",
  "Apple Green", "Apple Red", "Apricot", "Aqua", "Aqua Blue", "Arctic Blue", "Army Green",
  "Ash", "Avocado", "Azure", "Baby Blue", "Baby Pink", "Banana", "Basil", "Beige", "Black",
  "Blood Red", "Blue", "Blush", "Blush Red", "Bordeaux", "Bottle Green", "Brass", "Brick Red",
  "Bright Red", "Bronze", "Bronze Brown", "Brown", "Bubblegum Pink", "Burgundy", "Burnt Orange",
  "Butter", "Camel", "Canary", "Candy Apple Red", "Capri Blue", "Caramel", "Carbon Black",
  "Cardinal Red", "Carmine", "Carnation Pink", "Carrot", "Cerise", "Cerulean", "Champagne",
  "Champagne Gold", "Charcoal", "Chartreuse", "Cherry", "Cherry Red", "Chestnut", "Chocolate",
  "Chrome", "Cinnamon", "Cloud Grey", "Coal Black", "Cobalt", "Cobalt Blue", "Cocoa", "Coffee",
  "Color Mix", "Copper", "Copper Brown", "Copper Orange", "Coral", "Coral Red", "Corn Yellow",
  "Cornflower Blue", "Cotton Candy", "Cranberry", "Cream", "Crimson", "Cyan", "Daffodil",
  "Dark Green", "Dark Grey", "Dark Red", "Deep Ocean Blue", "Deep Purple", "Deep Red",
  "Denim Blue", "Dodger Blue", "Dove Grey", "Dusty Rose", "Ebony", "Eggplant", "Eggshell",
  "Egyptian Blue", "Electric Blue", "Emerald", "Espresso", "Evergreen", "Fern", "Fire Red",
  "Flamingo", "Floral White", "Forest Green", "French Blue", "Fuchsia", "Fuchsia Pink",
  "Garnet", "Ghost White", "Gold", "Golden Yellow", "Gradient", "Grape", "Graphite",
  "Grass Green", "Green", "Grey", "Gunmetal", "Gunmetal Metallic", "Hazel", "Heather",
  "Holographic", "Honey", "Hot Pink", "Hunter Green", "Ice Blue", "Indigo", "Ink Black",
  "Iridescent", "Iris", "Ivory", "Jade", "Jet Black", "Kelly Green", "Khaki", "Lavender",
  "Lemon", "Light Grey", "Lilac", "Lime", "Linen", "Magenta", "Mahogany", "Maize", "Malachite",
  "Mandarin", "Maroon", "Matte Black", "Mauve", "Merlot", "Metallic Gold", "Metallic Silver",
  "Midnight Blue", "Milk White", "Mint", "Mocha", "Moss Green", "Mulberry", "Multi Colour",
  "Multicolor", "Mustard", "Natural", "Navy", "Navy Blue", "Neon Blue", "Neon Green",
  "Neon Orange", "Neon Pink", "Neon Purple", "Neon Red", "Neon Yellow", "Off White", "Old Gold",
  "Olive", "Olive Drab", "Ombre", "Onyx", "Orange", "Orchid", "Oxblood", "Oxford Blue",
  "Pacific Blue", "Papaya", "Pastel Pink", "Pastel Yellow", "Pea Green", "Peach",
  "Peacock Blue", "Pear Green", "Pearl Grey", "Pearl White", "Periwinkle", "Periwinkle Blue",
  "Persian Red", "Persimmon", "Pewter", "Piano Black", "Pine Green", "Pink", "Pistachio",
  "Platinum", "Platinum Metallic", "Plum", "Poppy Red", "Powder Blue", "Prussian Blue",
  "Pumpkin", "Purple", "Rainbow", "Raspberry", "Raven", "Red", "Rose", "Rose Gold",
  "Rose Pink", "Rose Red", "Rosewood", "Royal Blue", "Royal Purple", "Ruby", "Rust",
  "Rust Orange", "Rust Red", "Sage", "Salmon", "Salmon Pink", "Sand", "Sapphire", "Scarlet",
  "Sea Green", "Seafoam", "Sepia", "Shamrock", "Silver", "Sky Blue", "Slate", "Slate Blue",
  "Smoke", "Snow White", "Spring Green", "Steel Blue", "Stone", "Sunflower", "Tan",
  "Tangerine", "Taupe", "Teal", "Teal Blue", "Terra Cotta", "Terracotta", "Thistle",
  "Tie Dye", "Tiffany Blue", "Titanium", "Tomato Red", "Transparent", "Turquoise",
  "Tyrian Purple", "Venetian Red", "Vermilion", "Violet", "Viridian", "Walnut", "White",
  "Wine", "Yellow",
];

export const PATTERNS = [
  "Abstract", "Adire", "Animal Print", "Ankara Print", "Aso Oke Weave", "Basket Weave",
  "Batik", "Beaded", "Botanical", "Brocade", "Butterfly", "Camouflage", "Candy Stripe",
  "Check", "Cheetah", "Chevron", "Circle", "Cloud", "Clouds", "Cow Print", "Crochet",
  "Damask", "Diamond", "Digital Print", "Embossed", "Ethnic", "Eyelet", "Floral", "Galaxy",
  "Geometric", "Gingham", "Glitter", "Gloss", "Gradient", "Heart", "Hearts", "Hexagon",
  "Honeycomb", "Horizontal Stripe", "Houndstooth", "Jacquard", "Kente", "Lace Pattern",
  "Leaf Print", "Leopard", "Marble", "Matte", "Mesh", "Net", "Ombre", "Paisley", "Patchwork",
  "Pearl", "Pinstripe", "Plaid", "Plain", "Pleated", "Polka Dot", "Quilted", "Ribbed",
  "Sequins", "Snake", "Snake Skin", "Solid", "Stars", "Stone Texture", "Striped", "Tartan",
  "Tie Dye", "Tiger", "Triangle", "Tribal", "Vertical Stripe", "Water Ripple", "Wave",
  "Wax Print", "Windowpane", "Wood Grain", "Zebra", "Zigzag",
];

export const NATURES = [
  "Acrylic", "Adire", "Ankara", "Aso Oke", "Batik", "Breathable", "Brocade", "Brushed",
  "Canvas", "Cashmere", "Chiffon", "Corduroy", "Cotton", "Crepe", "Denim", "Dyed",
  "Embroidered", "Fire Resistant", "Flannel", "Fleece", "Foil", "Georgette", "Handwoven",
  "Heavyweight", "Jacquard", "Jersey", "Kente", "Knitted", "Lace", "Leather", "Lightweight",
  "Linen", "Lycra", "Machine Woven", "Medium Weight", "Mesh", "Net", "Non-Stretch",
  "Non-Woven", "Nylon", "Organic", "Organza", "Polyester", "Pre-Shrunk", "Printed", "PVC",
  "Rayon", "Recycled", "Satin", "Sequined", "Silk", "Soft Finish", "Spandex", "Stiff Finish",
  "Stretch", "Suede", "Taffeta", "Tweed", "Velvet", "Vinyl", "Viscose", "Waterproof", "Wool",
  "Woven",
];

#!/usr/bin/env python3

import hashlib
import json
import random
import re
from pathlib import Path

WEBSITE_ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = WEBSITE_ROOT.parent / "The Quiz"
WEBSITE_QUIZ_DIR = WEBSITE_ROOT / "quizzes"
APP_QUIZ_DIR = APP_ROOT / "The Quiz" / "SeedData" / "quizzes"
NUMBER_WORD_VALUES = {
    "zero": 0,
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "eleven": 11,
    "twelve": 12,
    "thirteen": 13,
    "fourteen": 14,
    "fifteen": 15,
    "sixteen": 16,
    "seventeen": 17,
    "eighteen": 18,
    "nineteen": 19,
    "twenty": 20,
}
NUMBER_WORDS = set(NUMBER_WORD_VALUES)
EXACT_COLOR_WORDS = {
    "red", "blue", "green", "yellow", "orange", "purple", "black", "white",
    "gold", "silver", "pink", "brown",
}

QUESTION_RULES = [
    ("color", re.compile(r"\bcolor\b|\bcolour\b", re.I)),
    ("color_combo", re.compile(r"\bwhat two colors\b|\bwhat two colours\b", re.I)),
    ("year", re.compile(r"^in what year\b", re.I)),
    ("decade", re.compile(r"\bwhich decade\b|\bwhat decade\b", re.I)),
    ("capital_city", re.compile(r"\bcapital(?: city)?\b", re.I)),
    ("currency", re.compile(r"\bcurrency\b", re.I)),
    ("planet", re.compile(r"\bplanet\b", re.I)),
    ("chemical_symbol", re.compile(r"\bchemical symbol\b", re.I)),
    ("chemical_formula", re.compile(r"\bchemical formula\b", re.I)),
    ("acronym_expansion", re.compile(r"^what does\b|^what do the initials\b", re.I)),
    ("who", re.compile(r"^who\b", re.I)),
    ("singer", re.compile(r"\bsinger\b|frontman", re.I)),
    ("rapper", re.compile(r"\brapper\b", re.I)),
    ("actor", re.compile(r"\bactor\b|\bactress\b", re.I)),
    ("director", re.compile(r"\bdirector\b|\bfilmmaker\b", re.I)),
    ("composer", re.compile(r"\bcomposer\b", re.I)),
    ("writer_creator", re.compile(r"\bwriter\b|\bpoet\b|\bnovelist\b|\bphilosopher\b|\bscientist\b|^who created\b|^who revived\b|^who proposed\b|^who discovered\b|^who invented\b|^who painted\b|^who wrote\b", re.I)),
    ("band", re.compile(r"\bband\b", re.I)),
    ("network", re.compile(r"\bnetwork\b", re.I)),
    ("newspaper", re.compile(r"\bnewspaper\b", re.I)),
    ("toy_brand", re.compile(r"\btoy brand\b", re.I)),
    ("toy_franchise", re.compile(r"\btoy franchise\b|\btoy line\b", re.I)),
    ("board_game", re.compile(r"\bboard game\b", re.I)),
    ("tabletop_rpg", re.compile(r"\btabletop role-playing game\b", re.I)),
    ("tabletop_miniatures", re.compile(r"\btabletop miniatures game\b", re.I)),
    ("superhero_team", re.compile(r"\bsuperhero team\b", re.I)),
    ("fictional_material", re.compile(r"\bfictional metal\b", re.I)),
    ("record_label", re.compile(r"\brecord label\b", re.I)),
    ("wwe_event", re.compile(r"\bWWE event\b", re.I)),
    ("animation_studio", re.compile(r"\banimation studio\b", re.I)),
    ("film_festival", re.compile(r"\bfilm festival\b", re.I)),
    ("stage_name", re.compile(r"^under what stage name\b", re.I)),
    ("tv_title", re.compile(r"\btelevision\b|\bseries\b|\bsitcom\b|\bcomedy\b|\bdrama\b|\bmockumentary\b", re.I)),
    ("film_title", re.compile(r"\bfilm\b|\bmovie\b|\bthriller\b|\bblockbuster\b", re.I)),
    ("game_title", re.compile(r"\bgame franchise\b|\bmanga adaptation\b|\bmanga series\b", re.I)),
    ("award_name", re.compile(r"\bawards ceremony\b|\bgold statuette\b", re.I)),
    ("device_or_instrument", re.compile(r"\bdevice\b|\binstrument\b|\btool\b", re.I)),
    ("gas", re.compile(r"\bwhat gas\b|\bwhich gas\b", re.I)),
    ("force", re.compile(r"\bwhat force\b|\bwhat pulls objects\b|\bwhat pulls\b", re.I)),
    ("unit", re.compile(r"\bmetric unit\b", re.I)),
    ("process", re.compile(r"\bwhat process\b|\bwhat biological process\b|\bname the phase of cell division\b|\bphase of cell division\b", re.I)),
    ("scientific_law", re.compile(r"\blaw\b|\bprinciple\b|\btheory\b|\beffect\b|\brule\b", re.I)),
    ("scale", re.compile(r"\bscale\b", re.I)),
    ("element_or_metal", re.compile(r"\belement\b|\bmetal\b|\bmineral\b", re.I)),
    ("acid", re.compile(r"\bacid\b", re.I)),
    ("particle", re.compile(r"\bparticle\b", re.I)),
    ("equation", re.compile(r"\bequation\b", re.I)),
    ("phylum", re.compile(r"\bphylum\b", re.I)),
    ("animal_term", re.compile(r"\banimal\b|\bbaby dog\b|\bblood cell\b|\bkind of blood cell\b|\btype of blood cells\b", re.I)),
    ("anatomy", re.compile(r"\bpart of the\b|\bpart of a\b|\borgan\b|\bbody system\b|\bstructure\b|\borganelle\b|\bcell contains\b|\bcell contains genetic material\b|\bpart of the brain\b", re.I)),
    ("water_body", re.compile(r"\bocean\b|\bsea\b|\bstrait\b|\briver\b|\blake\b|\bcanal\b|\bwater body\b|\bocean current\b", re.I)),
    ("country", re.compile(r"\bcountry\b|\bnation\b", re.I)),
    ("continent", re.compile(r"\bcontinent\b", re.I)),
    ("state_or_region", re.compile(r"\bstate\b|\bterritory\b|\bregion\b", re.I)),
    ("mountain_or_desert", re.compile(r"\bmountain\b|\bpeak\b|\bdesert\b|\bplateau\b|\bvolcano\b|\bwaterfall\b|\breef\b|\bmountain range\b", re.I)),
    ("map_or_geo_term", re.compile(r"\barchipelago\b|\bfjord\b|\bwatershed\b|\bbalkanization\b|\bmonsoon\b|\blegend\b|\bkey\b|\bdelta\b|\bcompass rose\b|\bcontinent(al)? divide\b|\bline of longitude\b|\bline of latitude\b|\bisthmus\b|\btributary\b|\bpeninsula\b|\bbasin\b|\boasis\b|\bmesa\b|\bcaldera\b|\btundra\b|\brainforest\b|\bvalley\b", re.I)),
    ("organization", re.compile(r"\balliance\b|\borganization\b|\bheadquarters\b", re.I)),
    ("treaty_or_document", re.compile(r"\btreaty\b|\bdocument\b|\bconstitution\b|\bproclamation\b|\bdeclaration\b|\bcode of law\b|\bcode name\b", re.I)),
    ("event_or_conflict", re.compile(r"\bwar\b|\bbattle\b|\bconflict\b|\brebellion\b|\brevolution\b|\btrials\b|\bpogrom\b|\bconference\b|\bscandal\b|\bproject\b|\bholiday\b|\bfamine\b", re.I)),
]

SUBTYPE_SUPERTYPE = {
    "who": "person",
    "scientist": "person",
    "philosopher": "person",
    "historical_figure": "person",
    "historical_ruler": "person",
    "singer": "person",
    "rapper": "person",
    "actor": "person",
    "director": "person",
    "composer": "person",
    "writer_creator": "person",
    "band": "named_entity",
    "network": "named_entity",
    "newspaper": "named_entity",
    "toy_brand": "named_entity",
    "toy_franchise": "named_entity",
    "board_game": "named_entity",
    "tabletop_rpg": "named_entity",
    "tabletop_miniatures": "named_entity",
    "superhero_team": "named_entity",
    "fictional_material": "named_entity",
    "record_label": "named_entity",
    "wwe_event": "named_entity",
    "animation_studio": "named_entity",
    "film_festival": "named_entity",
    "stage_name": "named_entity",
    "tv_title": "named_entity",
    "film_title": "named_entity",
    "game_title": "named_entity",
    "award_name": "named_entity",
    "book_title": "named_entity",
    "character_name": "named_entity",
    "monument": "named_entity",
    "empire_or_civilization": "named_entity",
    "historical_place": "named_entity",
    "historical_ship": "named_entity",
    "historical_place_pair": "named_entity",
    "capital_city": "location",
    "city": "location",
    "country": "location",
    "continent": "location",
    "state_or_region": "location",
    "river": "location",
    "strait": "location",
    "sea": "location",
    "ocean": "location",
    "lake": "location",
    "canal": "location",
    "current": "location",
    "water_body": "location",
    "mountain_range": "location",
    "desert": "location",
    "peak": "location",
    "waterfall": "location",
    "mountain_or_desert": "location",
    "map_or_geo_term": "definition",
    "organization": "named_entity",
    "amendment": "named_entity",
    "treaty_or_document": "named_entity",
    "event_or_conflict": "named_entity",
    "device_or_instrument": "term",
    "musical_instrument": "term",
    "office_device": "term",
    "gas": "term",
    "force": "term",
    "unit": "term",
    "force_unit": "term",
    "metric_length_unit": "term",
    "energy_unit": "term",
    "process": "term",
    "scientific_law": "term",
    "scale": "term",
    "element_or_metal": "term",
    "rock_or_mineral": "term",
    "acid": "term",
    "particle": "term",
    "astronomical_object": "term",
    "equation": "term",
    "phylum": "term",
    "cell_part": "term",
    "plant_part": "term",
    "body_system": "term",
    "brain_part": "term",
    "eye_part": "term",
    "genetics_structure": "term",
    "animal_term": "term",
    "animal_species": "term",
    "anatomy": "term",
    "body_part_or_organ": "term",
    "scientist_role": "term",
    "life_stage": "term",
    "genre": "term",
    "legal_principle": "term",
    "philosophy_branch": "term",
    "map_attribute": "term",
    "music_definition": "definition",
    "invention": "term",
}

NON_PERSON_TOKENS = {
    "empire", "war", "battle", "conference", "project", "treaty", "constitution", "depression",
    "river", "ocean", "sea", "strait", "desert", "mountains", "period", "system", "world",
    "conference", "league", "kingdom", "city", "island", "army", "oasis", "peninsula",
    "greece", "rome", "australia", "africa", "asia", "europe", "america", "mexico", "china",
}

ABSTRACT_SINGLE_NAME_SUFFIXES = ("ism", "tion", "ity", "ship", "ment", "ness", "ology", "ics")

CURATED_OPTIONS = {
    "color": ["Blue", "Red", "Green", "Yellow", "Purple", "Orange"],
    "color_combo": ["Red and White.", "Blue and Yellow.", "Green and Gold.", "Black and White."],
    "planet": ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"],
    "genre": ["Hip-Hop / Rap.", "Rock", "Pop", "R&B / Soul"],
    "game_title": ["Pokemon", "Death Note", "One Piece", "The Legend of Zelda"],
    "composer": ["Antonio Vivaldi", "Bernard Herrmann", "Igor Stravinsky", "John Williams"],
    "scientist": ["Marie Curie", "Isaac Newton", "Galileo Galilei", "Charles Darwin"],
    "philosopher": ["Plato", "Aristotle", "Socrates", "Immanuel Kant"],
    "historical_figure": ["Augustus", "Florence Nightingale", "Abraham Lincoln", "Nelson Mandela"],
    "stage_name": ["Aphex Twin", "Burial", "Four Tet", "Flying Lotus"],
    "rapper": ["Kendrick Lamar", "Lauryn Hill", "Missy Elliott", "Nicki Minaj"],
    "toy_brand": ["LEGO", "Playmobil", "K'Nex", "Meccano"],
    "toy_franchise": ["Transformers", "Masters of the Universe", "G.I. Joe", "My Little Pony"],
    "board_game": ["Monopoly", "Risk", "Cluedo", "Scrabble"],
    "tabletop_rpg": ["Dungeons & Dragons", "Pathfinder", "Call of Cthulhu", "Shadowrun"],
    "tabletop_miniatures": ["Warhammer 40,000", "Warmachine", "Battletech", "Warhammer Age of Sigmar"],
    "superhero_team": ["The Avengers", "Justice League", "X-Men", "Fantastic Four"],
    "fictional_material": ["Adamantium", "Vibranium", "Mithril", "Unobtainium"],
    "record_label": ["Blue Note Records", "Motown", "Atlantic Records", "ECM Records"],
    "wwe_event": ["WrestleMania", "Royal Rumble", "SummerSlam", "Survivor Series"],
    "animation_studio": ["Studio Ghibli", "Pixar", "DreamWorks Animation", "LAIKA"],
    "film_festival": ["Cannes Film Festival", "Venice Film Festival", "Berlin International Film Festival", "Sundance Film Festival"],
    "newspaper": ["Daily Bugle", "Daily Planet", "Daily Globe", "New York Bulletin"],
    "network": ["BBC One", "CBS", "NBC", "HBO"],
    "award_name": ["Oscar", "Grammy", "Emmy", "Tony Award"],
    "book_title": ["Moby-Dick", "The Communist Manifesto", "The Republic", "War and Peace"],
    "gas": ["Oxygen", "Nitrogen", "Helium", "Carbon dioxide"],
    "force": ["Gravity", "Friction", "Magnetism", "Buoyancy"],
    "unit": ["Newton", "Joule", "Watt", "Pascal"],
    "force_unit": ["Newton", "Dyne", "Kilonewton", "Pound-force"],
    "metric_length_unit": ["Meter", "Kilometer", "Centimeter", "Millimeter"],
    "energy_unit": ["Calorie", "Joule", "Kilojoule", "Kilowatt-hour"],
    "scale": ["Mohs scale", "pH Scale", "Richter scale", "Beaufort scale"],
    "acid": ["Hydrochloric acid (HCl)", "Sulfuric acid", "Nitric acid", "Acetic acid"],
    "particle": ["Proton", "Neutron", "Electron", "Gluon"],
    "astronomical_object": ["Neutron star", "White dwarf", "Red giant", "Black hole"],
    "equation": ["E = mc^2", "F = ma", "V = IR", "pV = nRT"],
    "phylum": ["Mollusca", "Arthropoda", "Chordata", "Cnidaria"],
    "cell_part": ["Chloroplast", "Nucleus", "Ribosome", "Golgi apparatus", "Mitochondrion", "Cell membrane", "Cell wall", "Vacuole", "Cytoplasm", "Endoplasmic reticulum"],
    "plant_part": ["Roots", "Stem", "Leaves", "Flower"],
    "body_system": ["Digestive system", "Respiratory system", "Nervous system", "Circulatory system"],
    "brain_part": ["Cerebellum", "Cerebrum", "Medulla oblongata", "Hypothalamus"],
    "eye_part": ["Iris", "Lens", "Retina", "Cornea", "Pupil"],
    "genetics_structure": ["Centromere", "Telomere", "Chromatid", "Spindle fiber"],
    "element_or_metal": ["Oxygen", "Calcium", "Aluminum", "Carbon"],
    "rock_or_mineral": ["Diamond", "Granite", "Quartz", "Basalt"],
    "chemical_symbol": ["O", "Na", "H", "He", "Li", "K", "C"],
    "chemical_formula": ["NaCl", "H2O", "CO2", "CH4"],
    "device_or_instrument": ["Thermometer", "Barometer", "Anemometer", "Microscope"],
    "musical_instrument": ["Piano", "Violin", "Trumpet", "Flute"],
    "office_device": ["Printer", "Scanner", "Photocopier", "Shredder"],
    "animal_term": ["Puppy", "Herbivore", "Nocturnal", "White blood cell"],
    "animal_species": ["Camel", "Dolphin", "Elephant", "Kangaroo"],
    "scientist_role": ["Geologist", "Astronomer", "Meteorologist", "Biologist"],
    "life_stage": ["Chrysalis / Pupa", "Larva", "Egg", "Adult"],
    "shape": ["Octagon", "Dodecagon", "Triangle", "Hexagon"],
    "language": ["Portuguese", "Spanish", "English", "French"],
    "function_phrase": ["Transporting oxygen", "Fighting infection", "Filtering waste", "Producing hormones"],
    "measure_quantity": ["Luminous flux", "Frequency", "Mass", "Electric current"],
    "legal_principle": ["Presumption of innocence", "Double jeopardy", "Burden of proof", "Habeas corpus"],
    "philosophy_branch": ["Epistemology", "Metaphysics", "Ethics", "Logic"],
    "map_attribute": ["Elevation", "Slope", "Relief", "Gradient"],
    "music_definition": [
        "A time signature consists of two numbers stacked vertically at the start of a piece. The top number indicates how many beats are in each measure, and the bottom number indicates which note value gets one beat.",
        "Polyphony is a musical texture consisting of two or more simultaneous, independent melodic lines.",
        "A synthesizer is an electronic instrument that generates audio signals to create various sounds, from imitating acoustic instruments to generating entirely synthetic noises.",
        "It means singing without instrumental accompaniment.",
        "A crescendo is a gradual increase in the volume or loudness of the music.",
    ],
    "history_term": ["The Heian period", "The Encomienda system", "Mercantilism", "The Iron Curtain"],
    "field_of_study": ["Meteorology", "Paleontology", "Archaeology", "Ecology"],
    "currency": ["The Euro.", "ringgit", "krone", "peso"],
    "map_or_geo_term": ["Archipelago", "Fjord", "Endorheic basin", "Monsoon", "Watershed", "Peninsula"],
    "character_name": ["Buzz Lightyear", "Grogu", "Marlin", "Indiana Jones", "Daredevil", "Cookie Monster"],
    "monument": ["The Eiffel Tower.", "The Great Wall of China.", "Petra.", "Angkor Wat"],
    "organization": ["NATO", "The League of Nations", "United Nations", "International Court of Justice"],
    "treaty_or_document": ["Treaty of Versailles", "Treaty of Rome", "Declaration of Independence", "The US Constitution"],
    "event_or_conflict": ["World War I", "The Battle of Trafalgar", "The Glorious Revolution", "The Manhattan Project"],
    "empire_or_civilization": ["Byzantine Empire", "Roman Empire", "Ming dynasty", "Khmer Empire"],
    "historical_place": ["Pompeii", "Troy", "Teotihuacan", "Machu Picchu"],
    "historical_ship": ["Titanic", "Mayflower", "HMS Beagle", "Santa Maria"],
    "historical_place_pair": ["Athens and Sparta", "Rome and Carthage", "England and France", "Spain and Portugal"],
    "invention": ["Printing press", "Abacus", "Compass", "Steam engine"],
    "body_part_or_organ": ["Brain", "Heart", "Lungs", "Liver"],
    "capital_city": ["Tokyo", "Canberra", "Copenhagen", "Berlin", "New Delhi", "Pretoria", "Wellington", "Bern"],
    "city": ["The Hague", "Brussels", "Jakarta", "Hanoi", "Oslo", "Santiago"],
    "country": ["Canada", "Australia", "Nigeria", "Romania", "Brunei", "Tanzania", "Bolivia", "Lesotho"],
    "continent": ["Africa", "Asia", "Europe", "South America", "Antarctica."],
    "state_or_region": ["Hawaii.", "Queensland", "South Australia", "Tasmania", "Rhode Island."],
    "river": ["Danube", "Nile River", "Amazon River", "Mekong River", "Seine", "Tigris", "Oder River"],
    "strait": ["Bering Strait", "Strait of Dover", "The Strait of Hormuz.", "Bosphorus"],
    "sea": ["Red Sea", "The Black Sea", "The Mediterranean Sea.", "Arabian Sea"],
    "ocean": ["Pacific Ocean", "Atlantic Ocean", "Indian Ocean", "Arctic Ocean"],
    "lake": ["Lake Victoria", "Lake Titicaca.", "Lake Baikal", "Lake Superior"],
    "canal": ["Suez Canal", "Panama Canal", "Kiel Canal", "Corinth Canal"],
    "current": ["North Atlantic Drift", "Gulf Stream", "Humboldt Current", "Kuroshio Current"],
    "water_body": ["Pacific Ocean", "Atlantic Ocean", "Bering Strait", "Danube", "Lake Victoria", "Suez Canal", "Mekong River"],
    "mountain_range": ["Ural Mountains", "The Himalayas.", "The Andes", "The Appalachian Mountains."],
    "desert": ["The Sahara Desert.", "Gobi Desert", "The Atacama Desert.", "Kalahari Desert"],
    "peak": ["Aconcagua", "Mount Everest", "K2", "Mauna Kea in Hawaii."],
    "mountain_or_desert": ["The Sahara Desert.", "Ural Mountains", "Mount Everest", "Great Barrier Reef", "The Himalayas.", "Kalahari Desert"],
}



def normalize(value: str) -> str:
    value = value.replace("\u2019", "'").strip()
    value = re.sub(r"\s+", " ", value)
    return value


def normalized_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", normalize(value).lower()).strip()


QUESTION_DISTRACTOR_OVERRIDES = {
    normalized_key('What does "WWW" stand for?'): ["Wide World Web", "World Web Wide", "World Wireless Web"],
    normalized_key("What do the initials ATM stand for in banking?"): [
        "Automatic Transfer Machine",
        "Automated Transaction Module",
        "Automatic Teller Mechanism",
    ],
    normalized_key("What does ICJ stand for?"): [
        "International Criminal Justice",
        "Interstate Court of Jurisprudence",
        "International Council of Judges",
    ],
    normalized_key("What does DNA stand for?"): [
        "Deoxyribose nucleic acid",
        "Deoxyribonuclear acid",
        "Dinucleic acid",
    ],
    normalized_key("What does HTTP stand for?"): [
        "Hypertext Transfer Text Protocol",
        "High Text Transfer Protocol",
        "Hyperlink Transfer Protocol",
    ],
    normalized_key("What does GDP stand for?"): [
        "Gross Domestic Production",
        "Global Domestic Product",
        "General Development Product",
    ],
    normalized_key("What does CPU stand for?"): [
        "Central Program Unit",
        "Computer Processing Unit",
        "Central Processor Utility",
    ],
    normalized_key("What does GPS stand for?"): [
        "Global Position System",
        "Geographic Positioning Service",
        "Global Positioning Satellite",
    ],
    normalized_key("What does UNESCO stand for?"): [
        "United Nations Education, Science and Culture Office",
        "United Nations Educational, Scientific and Cultural Office",
        "United Nations Economic, Scientific and Cultural Organization",
    ],
    normalized_key("What do bees collect from flowers to help make honey?"): ["Pollen", "Sap", "Water"],
    normalized_key("In tennis, what word is used for a score of zero?"): ["Ace", "Deuce", "Fault"],
    normalized_key('What is the opposite of "ancient" in everyday English?'): ["Historic", "Archaic", "Timeless"],
    normalized_key("Who is Mickey Mouse's dog?"): ["Goofy", "Donald Duck", "Minnie Mouse"],
    normalized_key("What is the first month of the year?"): ["February", "March", "December"],
    normalized_key("In which sport is the Tour de France contested?"): ["Tennis", "Rowing", "Running"],
    normalized_key("In statistics, what is the midpoint value of an ordered dataset called?"): ["Mean", "Mode", "Range"],
    normalized_key("What artistic movement is Salvador Dali most associated with?"): ["Cubism", "Impressionism", "Expressionism"],
    normalized_key("What event in 1688 led to the overthrow of James II in England?"): ["English Civil War", "Wars of the Roses", "Reform Act"],
    normalized_key("What is the study of word origins called?"): ["Syntax", "Semantics", "Phonetics"],
    normalized_key("Which movement is Claude Monet most associated with?"): ["Cubism", "Surrealism", "Baroque"],
    normalized_key('In music, what does "crescendo" mean?'): [
        "Gradually getting softer",
        "Playing in unison",
        "Repeating a melody",
    ],
    normalized_key("In economics, what does inflation refer to?"): [
        "A general fall in prices over time",
        "A period of negative growth",
        "A cut in government spending",
    ],
    normalized_key("Which branch of government is responsible for interpreting laws?"): [
        "Legislative branch",
        "Executive branch",
        "Administrative branch",
    ],
    normalized_key("What is the term for a painting done on freshly applied wet plaster?"): ["Mosaic", "Tempera", "Lithograph"],
    normalized_key("What is it called when a soccer player scores three goals in one game?"): [
        "Clean sheet",
        "Penalty shootout",
        "Own goal",
    ],
    normalized_key("What economic term describes a general fall in prices over time?"): ["Inflation", "Stagflation", "Recession"],
    normalized_key("Which blood type is considered the universal donor for red blood cells?"): ["O positive", "A negative", "AB negative"],
    normalized_key('What is the term for a word that imitates a sound, like "buzz" or "hiss"?'): [
        "Metaphor",
        "Alliteration",
        "Hyperbole",
    ],
    normalized_key("In court, what term is used for a person accused of a crime?"): ["Witness", "Juror", "Plaintiff"],
    normalized_key("What is the lower house of Germany's federal parliament called?"): ["Bundesrat", "Reichstag", "Volkskammer"],
    normalized_key("What is the title of the head of government in Germany?"): ["President", "Prime Minister", "Premier"],
    normalized_key("What is the upper house of Canada's Parliament called?"): ["House of Commons", "National Assembly", "Privy Council"],
    normalized_key("What is the name of the line of longitude at 0 degrees?"): [
        "Equator",
        "International Date Line",
        "Tropic of Cancer",
    ],
    normalized_key("Which of these countries is well known for producing a large amount of the world's maple syrup?"): [
        "United States",
        "Japan",
        "Brazil",
    ],
    normalized_key("What large landmass lies immediately to the south of the United States?"): [
        "Canada",
        "Greenland",
        "Cuba",
    ],
    normalized_key("Which state in the USA is completely surrounded by the Pacific Ocean?"): [
        "California.",
        "Alaska.",
        "Oregon",
    ],
    normalized_key("What are the massive bodies of saltwater that cover most of the Earth called?"): [
        "Seas",
        "Lakes",
        "Rivers",
    ],
    normalized_key("Which mountain peak is the highest structurally measured from its base on the ocean floor to its summit?"): [
        "Mount Everest",
        "K2",
        "Aconcagua",
    ],
    normalized_key("Name the historically vital narrow body of water connecting the Persian Gulf fundamentally to the Arabian Sea."): [
        "Bosphorus",
        "Strait of Dover",
        "Bering Strait",
    ],
    normalized_key("Which enormous river specifically flows through the heart of the Grand Canyon?"): [
        "Danube",
        "Nile River",
        "Seine",
    ],
    normalized_key("Which of these major African rivers physically crosses the Equator twice during its incredibly long meandering course?"): [
        "The Nile",
        "The Niger",
        "The Zambezi",
    ],
    normalized_key("Which major Asian river flows entirely within the absolutely physical boundaries completely of China?"): [
        "Yellow River",
        "Mekong River",
        "Amur River",
    ],
    normalized_key("Which African nation has three capital cities?"): [
        "Kenya",
        "Nigeria",
        "Egypt",
    ],
    normalized_key("What is the highest uninterrupted waterfall in the world?"): [
        "Victoria Falls",
        "Niagara Falls",
        "Iguazu Falls",
    ],
    normalized_key("Name the deepest known point in the Earth's oceans."): [
        "Puerto Rico Trench",
        "Java Trench",
        "Tonga Trench",
    ],
    normalized_key("Which ocean current helps moderate the climate of western Europe?"): [
        "Gulf Stream",
        "Humboldt Current",
        "Kuroshio Current",
    ],
    normalized_key("How many states of matter are commonly taught in basic science?"): ["2", "4", "5"],
    normalized_key("What simple machine is a sloping surface used to raise or lower objects?"): [
        "Lever",
        "Pulley",
        "Wheel and axle",
    ],
    normalized_key("Which part of a plant cell contains chlorophyll?"): ["Nucleus", "Cell wall", "Vacuole"],
    normalized_key("What part of a plant anchors it in the soil?"): ["Stem", "Leaves", "Flower"],
    normalized_key("What do we call an animal that is active mainly at night?"): ["Diurnal", "Crepuscular", "Migratory"],
    normalized_key("Which kind of blood cell helps the body fight infection?"): [
        "Red blood cell",
        "Platelet",
        "Stem cell",
    ],
    normalized_key("Which type of blood cells are responsible for fighting infection?"): [
        "Red blood cells",
        "Platelets",
        "Stem cells",
    ],
    normalized_key("What do we call the center of an atom?"): ["Electron cloud", "Proton", "Neutron"],
    normalized_key("What do you call molten rock beneath Earth's surface?"): ["Lava", "Basalt", "Obsidian"],
    normalized_key("What term describes a fluid's resistance to flowing?"): ["Density", "Elasticity", "Conductivity"],
    normalized_key("In genetics, what term describes having two different alleles for a given trait?"): [
        "Homozygous",
        "Dominant",
        "Recessive",
    ],
    normalized_key("Name the longest bone in the human body."): ["Tibia", "Humerus", "Radius"],
    normalized_key("What do you call an animal that eats only plants?"): ["Carnivore", "Omnivore", "Scavenger"],
    normalized_key("What is the main energy source for deep ocean food webs lacking sunlight?"): [
        "Photosynthesis",
        "Moonlight",
        "Marine snow",
    ],
    normalized_key("What is a positively charged subatomic particle called?"): ["Electron", "Neutron", "Photon"],
    normalized_key("What type of wave is an earthquake's primary wave?"): [
        "Surface wave",
        "Shear wave",
        "Transverse wave",
    ],
    normalized_key("What body system includes the stomach and intestines?"): [
        "Respiratory system",
        "Nervous system",
        "Circulatory system",
    ],
    normalized_key("What is a baby dog called?"): ["Kitten", "Foal", "Calf"],
    normalized_key("Which season comes after winter?"): ["Summer", "Autumn", "Winter"],
    normalized_key("What is a large body of saltwater called?"): ["Lake", "River", "Pond"],
    normalized_key("What is frozen water called?"): ["Steam", "Vapour", "Snow"],
    normalized_key("What cellular process produces haploid gametes from a diploid cell?"): [
        "Mitosis",
        "Photosynthesis",
        "Cellular respiration",
    ],
    normalized_key("Name the primary pigment responsible for photosynthesis in plants."): [
        "Chlorophyll b",
        "Carotene",
        "Xanthophyll",
    ],
    normalized_key("What is the only noble gas that does not have an octet of electrons in its outer shell?"): [
        "Neon",
        "Argon",
        "Xenon",
    ],
    normalized_key("What is the process by which a gas changes into a liquid?"): [
        "Evaporation",
        "Sublimation",
        "Freezing",
    ],
    normalized_key("What do we call a material that does not conduct electricity well?"): [
        "Conductor",
        "Semiconductor",
        "Electrolyte",
    ],
    normalized_key("What cell organelle modifies, sorts, and packages proteins for transport?"): [
        "Endoplasmic reticulum",
        "Lysosome",
        "Mitochondrion",
    ],
    normalized_key("What biological structure is composed of RNA and proteins, and serves as the site of protein synthesis?"): [
        "Golgi apparatus",
        "Nucleus",
        "Centrosome",
    ],
    normalized_key("What structure connects sister chromatids in a chromosome?"): [
        "Telomere",
        "Spindle fiber",
        "Kinetochore",
    ],
    normalized_key("What part of the cell contains genetic material?"): ["Cytoplasm", "Cell membrane", "Ribosome"],
    normalized_key("Which part of the eye controls the amount of light entering?"): ["Lens", "Retina", "Cornea"],
    normalized_key("What do we call an organism that feeds on dead material?"): ["Producer", "Herbivore", "Parasite"],
    normalized_key("What part of the brain controls balance and coordination?"): [
        "Cerebrum",
        "Medulla oblongata",
        "Hypothalamus",
    ],
    normalized_key("What are the building blocks of proteins?"): ["Fatty acids", "Monosaccharides", "Nucleotides"],
    normalized_key("What phenomenon deflects moving air to the right in the Northern Hemisphere?"): [
        "Greenhouse effect",
        "Doppler effect",
        "Tidal force",
    ],
    normalized_key("What is the closest star to Earth besides the Sun?"): ["Sirius", "Betelgeuse", "Alpha Centauri A"],
    normalized_key("What is the highest mountain on Earth?"): ["K2", "Kilimanjaro", "Denali"],
    normalized_key("What kind of animal is a Komodo dragon?"): ["Snake", "Amphibian", "Bird"],
    normalized_key("What layer of the atmosphere contains the ozone layer?"): ["Troposphere", "Mesosphere", "Thermosphere"],
    normalized_key("What do we call the molten rock that erupts from a volcano?"): ["Magma", "Ash", "Basalt"],
    normalized_key("What principle links pressure, speed, and height in a flowing fluid?"): [
        "Pascal's principle",
        "Archimedes' principle",
        "Poiseuille's law",
    ],
    normalized_key("What rule states that electrons fill lower-energy atomic orbitals before filling higher-energy ones?"): [
        "Pauli exclusion principle",
        "Hund's rule",
        "Heisenberg uncertainty principle",
    ],
    normalized_key("What physical constant has the value 6.626 x 10^-34 J·s?"): [
        "Boltzmann constant",
        "Avogadro's number",
        "Speed of light",
    ],
    normalized_key("What effect refers to the emission of electrons when light hits a material?"): [
        "Doppler effect",
        "Hall effect",
        "Zeeman effect",
    ],
    normalized_key("What theory explains the movement of Earth's landmasses?"): [
        "Continental drift",
        "Uniformitarianism",
        "Catastrophism",
    ],
    normalized_key("In fluid dynamics, what principle states that an increase in the speed of a fluid occurs simultaneously with a decrease in static pressure?"): [
        "Pascal's principle",
        "Archimedes' principle",
        "Newton's first law",
    ],
    normalized_key("What process involves the separation of substances from a liquid mixture based on different boiling points?"): [
        "Filtration",
        "Decantation",
        "Crystallization",
    ],
    normalized_key("What paradox illustrates the bizarre implications of quantum superposition with a feline in a box?"): [
        "Maxwell's demon",
        "The Fermi paradox",
        "The twin paradox",
    ],
    normalized_key("What theory describes the large-scale motion of the Earth's lithosphere?"): [
        "Continental drift",
        "Uniformitarianism",
        "Catastrophism",
    ],
    normalized_key("Who proposed the theory of general relativity?"): [
        "Isaac Newton",
        "Niels Bohr",
        "Galileo Galilei",
    ],
}


def is_person_like(value: str) -> bool:
    normalized = normalize(value).strip()
    if "/" in normalized or "&" in normalized:
        return False
    tokens = [token for token in normalized.split() if token]
    if not 2 <= len(tokens) <= 5:
        return False
    if normalized.startswith("The "):
        return False
    if any(token.lower().strip(".,()") in NON_PERSON_TOKENS for token in tokens):
        return False
    name_token = re.compile(r"^(?:[A-Z][A-Za-z]+(?:[-'][A-Za-z]+)*\.?|[A-Z](?:\.[A-Z])+\.?|[A-Z]\.)$")
    valid_tokens = [token for token in tokens if name_token.fullmatch(token.strip(".,()"))]
    return len(valid_tokens) >= max(2, len(tokens) - 1)


def is_historical_ruler_like(value: str) -> bool:
    if is_person_like(value):
        return True

    normalized = normalize(value).strip().rstrip(".")
    lowered = normalized.lower()
    if "/" in normalized or "&" in normalized or normalized.startswith("The ") or is_sentence_like(normalized):
        return False
    if is_number_like(value) or lowered in {planet.lower() for planet in CURATED_OPTIONS["planet"]} or lowered in EXACT_COLOR_WORDS:
        return False
    if any(lowered.endswith(suffix) for suffix in ABSTRACT_SINGLE_NAME_SUFFIXES):
        return False

    tokens = [token for token in normalized.split() if token]
    if not 1 <= len(tokens) <= 3:
        return False
    if any(token.lower().strip(".,()") in NON_PERSON_TOKENS for token in tokens):
        return False

    return bool(re.fullmatch(r"(?:[A-Z][A-Za-z]+(?:[-'][A-Za-z]+)*)(?:\s+[IVXLCDM]+)?", normalized))


def is_amendment_like(value: str) -> bool:
    normalized = normalize(value).strip().rstrip(".").lower()
    return bool(
        re.fullmatch(
            r"(?:(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|"
            r"thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|"
            r"twenty-first|twenty-second|twenty-third|twenty-fourth|twenty-fifth|twenty-sixth|twenty-seventh)|"
            r"\d+(?:st|nd|rd|th)) amendment",
            normalized,
        )
    )


def is_sentence_like(value: str) -> bool:
    word_count = value.count(" ") + 1
    return (
        len(value) > 60
        or value.count(" ") >= 8
        or (any(punct in value for punct in [",", ";"]) and word_count >= 5)
        or (value.count(".") > 1 and word_count >= 4)
    )


def is_definition_like(value: str) -> bool:
    if not is_sentence_like(value):
        return False
    lowered = normalize(value).lower()
    return any(
        marker in lowered
        for marker in [
            " is ",
            " are ",
            " means ",
            " refers ",
            " explains ",
            " displays ",
            " consists ",
            " connects ",
            " separates ",
            " derives ",
            " describes ",
        ]
    ) or lowered.startswith(("a ", "an ", "the ", "it "))


def is_number_like(value: str) -> bool:
    stripped = normalize(value).rstrip(".")
    if "{{number|" in stripped or "{{measure|" in stripped:
        return True
    if stripped.lower() in NUMBER_WORDS:
        return True
    return bool(re.fullmatch(r"[-+]?\d+(?:,\d{3})*(?:\.\d+)?(?:\s*[a-zA-Z/%\u00b0^]+)?", stripped))


def contains_any(text: str, *needles: str) -> bool:
    return any(needle in text for needle in needles)


def infer_subtype(question: str, answer: str, category: str) -> str:
    lower_question = normalize(question).lower()
    normalized_answer = normalize(answer)

    if re.fullmatch(r"\d{4}", normalized_answer):
        return "year"
    if re.fullmatch(r"\d{4}s", normalized_answer, re.I):
        return "decade"
    if is_number_like(answer) and (
        lower_question.startswith("how many")
        or "square root" in lower_question
        or "rounded to" in lower_question
        or "multiplied by" in lower_question
        or "approximate numeric value" in lower_question
        or "(approx" in lower_question
    ):
        return "number"
    if contains_any(lower_question, "color", "colour"):
        return "color_combo" if "colors" in lower_question or "colours" in lower_question else "color"
    if "stand for" in lower_question and (lower_question.startswith("what does") or lower_question.startswith("what do the initials")):
        return "acronym_expansion"
    if lower_question.startswith("what does '") or lower_question.startswith('what does "'):
        return "music_definition" if category == "Entertainment" else "definition"
    if is_definition_like(answer) and category not in {"Science", "Entertainment"}:
        return "definition"
    if re.search(r"\b(which|what)\b(?:\s+[a-z]+){0,3}\s+(queen|king|emperor|ruler|leader)\b", lower_question):
        return "historical_ruler"
    if re.search(r"\bamendment\b", lower_question):
        return "amendment"

    if category == "Entertainment":
        if lower_question.startswith("explain") or lower_question.startswith("describe"):
            return "music_definition"
        if lower_question.startswith("what does ") and is_definition_like(answer):
            return "music_definition"
        if contains_any(lower_question, "color", "colour"):
            return "color"
        if "what genre" in lower_question or "which genre" in lower_question:
            return "genre"
        if "toy brand" in lower_question:
            return "toy_brand"
        if contains_any(lower_question, "toy franchise", "toy line"):
            return "toy_franchise"
        if "board game" in lower_question:
            return "board_game"
        if "tabletop role-playing game" in lower_question:
            return "tabletop_rpg"
        if "tabletop miniatures game" in lower_question:
            return "tabletop_miniatures"
        if "superhero team" in lower_question:
            return "superhero_team"
        if "fictional metal" in lower_question:
            return "fictional_material"
        if "record label" in lower_question:
            return "record_label"
        if "wwe event" in lower_question:
            return "wwe_event"
        if "animation studio" in lower_question:
            return "animation_studio"
        if "film festival" in lower_question:
            return "film_festival"
        if "network originally aired" in lower_question or lower_question.startswith("which network"):
            return "network"
        if "newspaper" in lower_question:
            return "newspaper"
        if lower_question.startswith("under what stage name"):
            return "stage_name"
        if contains_any(lower_question, "which singer", "lead singer", "frontman of queen"):
            return "singer"
        if "which rapper" in lower_question:
            return "rapper"
        if "which band" in lower_question:
            return "band"
        if contains_any(lower_question, "which actor", "which actress", "south korean actor"):
            return "actor"
        if contains_any(lower_question, "which director", "which filmmaker"):
            return "director"
        if "which composer" in lower_question:
            return "composer"
        if (
            lower_question.startswith("who created")
            or lower_question.startswith("who revived")
            or "writer-performer" in lower_question
            or "which writer" in lower_question
        ):
            return "writer_creator"
        if contains_any(
            lower_question,
            "clownfish father",
            "given name of the creature",
            "toy astronaut",
            "superhero's civilian name",
            "adventurous archaeologist",
        ):
            return "character_name"
        if contains_any(lower_question, "television", "series", "sitcom", "comedy", "drama", "mockumentary"):
            return "tv_title"
        if contains_any(lower_question, " film", "film ", "movie", "thriller", "blockbuster"):
            return "film_title"
        if contains_any(lower_question, "game franchise", "manga adaptation", "manga series"):
            return "game_title"
        if contains_any(lower_question, "gold statuette", "awards ceremony"):
            return "award_name"
        if is_definition_like(answer):
            return "music_definition"
        if is_person_like(answer):
            return "person"
        return "named_entity"

    if category == "General Knowledge":
        if re.search(r"^which .*\b(countr(?:y|ies)|nation)\b.*capital", lower_question):
            return "country"
        if "planet" in lower_question:
            return "planet"
        if "capital" in lower_question:
            return "capital_city"
        if "currency" in lower_question:
            return "currency"
        if re.search(r"\bcountr(?:y|ies)\b|\bnation\b", lower_question):
            return "country"
        if "continent" in lower_question:
            return "continent"
        if re.search(r"\bstate\b|\bterritory\b", lower_question):
            return "state_or_region"
        if lower_question.startswith("which city") or contains_any(lower_question, "city hosts", "city is home", "headquarters city"):
            return "city"
        if contains_any(lower_question, "which animal", "what animal"):
            return "animal_species"
        if "which river" in lower_question or "river flows" in lower_question or re.search(r"\brivers\b", lower_question):
            return "river"
        if "strait" in lower_question:
            return "strait"
        if "sea" in lower_question:
            return "sea"
        if "ocean" in lower_question:
            return "ocean"
        if "lake" in lower_question:
            return "lake"
        if "canal" in lower_question:
            return "canal"
        if "current" in lower_question:
            return "current"
        if contains_any(lower_question, "river", "ocean", "strait", "canal"):
            return "water_body"
        if re.search(r"\b(which|what) desert\b", lower_question):
            return "desert"
        if "mountain range" in lower_question:
            return "mountain_range"
        if contains_any(lower_question, "line of longitude", "line of latitude"):
            return "map_or_geo_term"
        if lower_question.startswith("what does") or lower_question.startswith("what do the initials"):
            return "acronym_expansion"
        if "which scientist" in lower_question:
            return "scientist"
        if "which philosopher" in lower_question:
            return "philosopher"
        if "which composer" in lower_question:
            return "composer"
        if contains_any(lower_question, "which poet", "which novelist", "who wrote", "who painted"):
            return "who"
        if "shape" in lower_question or "polygon" in lower_question or re.search(r"\b\d+\s*-\s*sided\b", lower_question):
            return "shape"
        if "legal principle" in lower_question:
            return "legal_principle"
        if "branch of philosophy" in lower_question:
            return "philosophy_branch"
        if "instrument" in lower_question:
            return "musical_instrument"
        if contains_any(lower_question, "prints paper documents", "what machine"):
            return "office_device"
        if contains_any(lower_question, "baby dog", "which animal", "what animal"):
            return "animal_species"
        if "organ" in lower_question:
            return "body_part_or_organ"
        if contains_any(lower_question, "device", "machine"):
            return "device_or_instrument"
        if contains_any(lower_question, "metal", "chemical symbol"):
            return "element_or_metal" if "metal" in lower_question else "chemical_symbol"
        if "gas" in lower_question:
            return "gas"
        if contains_any(lower_question, "novel opens", "political tract", "opens with the line", "opens with the words"):
            return "book_title"
        if contains_any(lower_question, "term for", "what is it called when", "lower house", "upper house", "head of government", "branch of government"):
            return "term"
        if contains_any(lower_question, "main language", "language spoken"):
            return "language"
        if contains_any(lower_question, "awards ceremony", "recorded music"):
            return "award_name"
        if contains_any(lower_question, "treaty", "document", "begins with"):
            return "treaty_or_document"
        if is_person_like(answer):
            return "who"
        return "term"

    if category == "History":
        if re.search(r"^(which|what) (?:of these )?countr(?:y|ies)\b", lower_question) or "in which country" in lower_question:
            return "country"
        if lower_question.startswith("who") or contains_any(lower_question, "which famous nurse", "which emperor", "which ruler", "which leader", "which queen", "which king"):
            return "historical_figure"
        if lower_question.startswith("what event"):
            return "event_or_conflict"
        if contains_any(lower_question, "which empire", "what empire", "which civilization", "ancient civilization", "which dynasty"):
            return "empire_or_civilization"
        if contains_any(lower_question, "treaty", "document", "constitution", "proclamation", "declaration", "code of law", "act ", "amendment", "agreement signed", "series of treaties"):
            return "treaty_or_document"
        if contains_any(lower_question, "alliance", "organization"):
            return "organization"
        if contains_any(lower_question, "which ship", "what ship", "ocean liner"):
            return "historical_ship"
        if contains_any(lower_question, "invention", "device was used"):
            return "invention"
        if contains_any(lower_question, "city-states"):
            return "historical_place_pair"
        if contains_any(lower_question, "which city", "what city", "european city", "which ancient roman town", "legendary ancient city", "pre-columbian city"):
            return "historical_place"
        if contains_any(lower_question, "forced removal", "what is the name of the forced removal"):
            return "event_or_conflict"
        if contains_any(lower_question, "term for", "what name is given"):
            return "history_term"
        if contains_any(lower_question, "war", "battle", "conflict", "rebellion", "revolution", "trials", "pogrom", "conference", "scandal", "project", "holiday", "famine"):
            return "event_or_conflict"
        if contains_any(lower_question, "period", "era", "movement", "system", "philosophical system", "what name is given", "economic philosophy", "forced labor"):
            return "history_term"
        if contains_any(lower_question, "ship", "device", "invention"):
            return "device_or_instrument"
        if "metal" in lower_question:
            return "element_or_metal"
        if re.search(r"\bstate\b", lower_question):
            return "state_or_region"
        if is_person_like(answer):
            return "historical_figure"
        return "history_term"

    if category == "Science":
        if contains_any(lower_question, "colors", "colours", "color", "colour"):
            return "color_combo" if "colors" in lower_question or "colours" in lower_question else "color"
        if "planet" in lower_question:
            return "planet"
        if contains_any(lower_question, "type of star", "which star"):
            return "astronomical_object"
        if contains_any(lower_question, "what particle", "which particle", "particle mediates"):
            return "particle"
        if contains_any(lower_question, "part of a plant cell", "part of the cell", "cell organelle", "site of protein synthesis"):
            return "cell_part"
        if "body system" in lower_question:
            return "body_system"
        if "part of a plant" in lower_question and "cell" not in lower_question:
            return "plant_part"
        if "part of the brain" in lower_question:
            return "brain_part"
        if "part of the eye" in lower_question or "amount of light entering" in lower_question:
            return "eye_part"
        if "connects sister chromatids" in lower_question:
            return "genetics_structure"
        if contains_any(lower_question, "what gas", "which gas"):
            return "gas"
        if "measure force" in lower_question:
            return "force_unit"
        if "fundamental unit of length" in lower_question or "unit of length" in lower_question:
            return "metric_length_unit"
        if "metric unit" in lower_question:
            return "unit"
        if "force" in lower_question or "pulls" in lower_question:
            return "force"
        if "chemical symbol" in lower_question:
            return "chemical_symbol"
        if "chemical formula" in lower_question:
            return "chemical_formula"
        if "term for the amount of heat required" in lower_question:
            return "energy_unit"
        if "physical constant" in lower_question:
            return "scientific_law"
        if "simple machine" in lower_question:
            return "term"
        if "scientist who studies" in lower_question:
            return "scientist_role"
        if "caterpillar" in lower_question or "changing phase" in lower_question:
            return "life_stage"
        if "primary function" in lower_question:
            return "function_phrase"
        if contains_any(lower_question, "what process", "biological process", "phase of cell division", "type of chemical reaction"):
            return "process"
        if contains_any(lower_question, "law", "principle", "theory", "effect", "rule", "paradox"):
            return "scientific_law"
        if "scale" in lower_question:
            return "scale"
        if "acid" in lower_question:
            return "acid"
        if "equation" in lower_question:
            return "equation"
        if "phylum" in lower_question:
            return "phylum"
        if contains_any(lower_question, "kind of animal", "what do we call an animal", "baby dog", "blood cell", "animal that eats", "animal that is active"):
            return "animal_term"
        if contains_any(lower_question, "part of the", "part of a", "organ", "body system", "structure", "organelle", "largest organ", "part of the eye", "part of the brain", "inside the skull"):
            return "body_part_or_organ"
        if contains_any(lower_question, "instrument", "tool"):
            return "device_or_instrument"
        if contains_any(lower_question, "center of an atom", "molten rock beneath", "material that does not conduct", "building blocks of proteins", "closest star to earth", "season comes after winter", "frozen water", "highest mountain", "layer of the atmosphere", "molten rock that erupts", "speed of light"):
            return "term"
        if contains_any(lower_question, "hardest natural substance", "igneous rock"):
            return "rock_or_mineral"
        if contains_any(lower_question, "element", "metal", "mineral"):
            return "element_or_metal"
        if contains_any(lower_question, "which scientist", "who discovered", "who proposed"):
            return "scientist"
        if "what quantity is measured" in lower_question:
            return "measure_quantity"
        if "study of" in lower_question:
            return "field_of_study"
        if is_definition_like(answer):
            return "definition"
        return "term"

    if category == "Geography":
        if "what two colors" in lower_question or "what two colours" in lower_question:
            return "color_combo"
        if contains_any(lower_question, "color", "colour"):
            return "color"
        if re.search(r"^which .*\b(countr(?:y|ies)|nation)\b.*capital", lower_question):
            return "country"
        if lower_question.startswith("which us state") or lower_question.startswith("which state"):
            return "state_or_region"
        if contains_any(lower_question, "what term", "term is used", "wind system", "drainage basin"):
            return "map_or_geo_term"
        if "contour lines" in lower_question:
            return "map_attribute"
        if "peak" in lower_question:
            return "peak"
        if "waterfall" in lower_question:
            return "waterfall"
        if "mountain range" in lower_question:
            return "mountain_range"
        if "which river" in lower_question or "river flows" in lower_question or re.search(r"\brivers\b", lower_question):
            return "river"
        if "strait" in lower_question:
            return "strait"
        if "current" in lower_question:
            return "current"
        if "sea" in lower_question:
            return "sea"
        if "which ocean" in lower_question or "ocean lies" in lower_question or "ocean borders" in lower_question:
            return "ocean"
        if "lake" in lower_question:
            return "lake"
        if "canal" in lower_question:
            return "canal"
        if contains_any(lower_question, "body of water", "ocean", "sea", "strait", "river", "lake", "canal", "current", "deepest known point"):
            return "water_body"
        if "desert" in lower_question:
            return "desert"
        if contains_any(lower_question, "mountain", "peak", "desert", "plateau", "volcano", "waterfall", "reef", "mountain range"):
            return "mountain_or_desert"
        if "capital" in lower_question:
            return "capital_city"
        if "currency" in lower_question:
            return "currency"
        if re.search(r"\bcountr(?:y|ies)\b|\bnation\b", lower_question):
            return "country"
        if "continent" in lower_question:
            return "continent"
        if re.search(r"\bstate\b|\bterritory\b", lower_question):
            return "state_or_region"
        if "monument" in lower_question:
            return "monument"
        if contains_any(lower_question, "archipelago", "fjord", "watershed", "balkanization", "monsoon", "legend", "compass rose", "line of longitude", "line of latitude", "tributary", "peninsula", "basin", "oasis", "mesa", "caldera", "tundra", "rainforest", "valley"):
            return "map_or_geo_term"
        if contains_any(lower_question, "describe", "explain", "what determines", "what does a compass rose", "what do contour lines", "what is the difference between", "what specifically is", "what is a "):
            return "definition"
        if contains_any(lower_question, "monument", "legendary ancient city"):
            return "named_entity"
        if is_definition_like(answer):
            return "definition"
        return "location"

    if is_definition_like(answer):
        return "definition"
    if is_person_like(answer):
        return "who"
    return "named_entity"


def build_records():
    records = []
    for path in sorted(APP_QUIZ_DIR.glob("*.json")):
        records.append(("app", path))
    daily_schedule = json.loads((WEBSITE_QUIZ_DIR / "daily_schedule.json").read_text(encoding="utf-8"))
    for entry in daily_schedule["entries"]:
        records.append(("website", WEBSITE_QUIZ_DIR / entry["file"]))
    return records


def collect_pools(records):
    subtype_pool = {}
    category_subtype_pool = {}
    supertype_pool = {}
    category_supertype_pool = {}
    category_term_pool = {}

    def add(pool, key, value):
        pool.setdefault(key, [])
        if value not in pool[key]:
            pool[key].append(value)

    for _source, path in records:
        data = json.loads(path.read_text(encoding="utf-8"))
        category = data["sections"][0]["title"]
        for item in data["sections"][0]["items"]:
            if item["type"] != "multiple-choice":
                continue
            answer = item["a"]
            subtype = infer_subtype(item["q"], answer, category)
            supertype = SUBTYPE_SUPERTYPE.get(subtype, subtype)
            add(subtype_pool, subtype, answer)
            add(category_subtype_pool, (category, subtype), answer)
            add(supertype_pool, supertype, answer)
            add(category_supertype_pool, (category, supertype), answer)
            add(category_term_pool, category, answer)

    return {
        "subtype": subtype_pool,
        "category_subtype": category_subtype_pool,
        "supertype": supertype_pool,
        "category_supertype": category_supertype_pool,
        "category": category_term_pool,
    }


def number_distractors(answer: str) -> list[str]:
    lowered = normalize(answer).rstrip(".").lower()
    if lowered in NUMBER_WORD_VALUES:
        value = NUMBER_WORD_VALUES[lowered]
        reverse_lookup = {value: word.title() for word, value in NUMBER_WORD_VALUES.items()}
        results = []
        seen = {normalize(answer)}
        for offset in [1, 2, 3, 4]:
            for candidate in [value - offset, value + offset]:
                if candidate < 0:
                    continue
                rendered = reverse_lookup.get(candidate, str(candidate))
                key = normalize(rendered)
                if key in seen:
                    continue
                seen.add(key)
                results.append(rendered)
                if len(results) == 3:
                    return results
        return results

    if "{{number|" in answer:
        parts = answer.strip("{}").split("|")
        value = float(parts[1])
        precision = int(parts[2].rstrip("}"))
        delta = 1 if value >= 10 else max(0.1, round(value * 0.1, precision))
        results = []
        seen = {normalize(answer)}
        for multiplier in [1, 2, 3]:
            for candidate in [value - (delta * multiplier), value + (delta * multiplier)]:
                if candidate < 0:
                    continue
                rendered = f"{{{{number|{candidate:.{precision}f}|{precision}}}}}"
                key = normalize(rendered)
                if key in seen:
                    continue
                seen.add(key)
                results.append(rendered)
                if len(results) == 3:
                    return results
        return results

    match = re.fullmatch(r"([-+]?\d+(?:,\d{3})*(?:\.\d+)?)(.*)", normalize(answer))
    if not match:
        return []

    raw_number, suffix = match.groups()
    suffix = suffix.strip()
    numeric = float(raw_number.replace(",", ""))
    decimals = len(raw_number.split(".")[1]) if "." in raw_number else 0
    results = []
    seen = {normalize(answer)}
    delta = 1 if decimals == 0 else 1 if numeric >= 10 else 0.5 if numeric >= 5 else 0.1
    candidate_values = [
        numeric - delta,
        numeric + delta,
        numeric + (delta * 2),
        numeric - (delta * 2),
        numeric + (delta * 3),
    ]
    for candidate in candidate_values:
        if candidate < 0:
            continue
        if decimals == 0:
            rendered = f"{int(round(candidate))}"
        else:
            rendered = f"{candidate:.{decimals}f}"
        if suffix:
            rendered = f"{rendered} {suffix}"
        key = normalize(rendered)
        if key in seen:
            continue
        seen.add(key)
        results.append(rendered)
        if len(results) == 3:
            break
    return results


def year_distractors(answer: str) -> list[str]:
    year = int(normalize(answer))
    return [str(year - 1), str(year + 1), str(year + 3)]


def decade_distractors(answer: str) -> list[str]:
    decade = int(normalize(answer)[:4])
    return [f"{decade - 10}s", f"{decade + 10}s", f"{decade + 20}s"]


def is_title_like(value: str) -> bool:
    normalized = normalize(value).rstrip(".")
    lowered = normalized.lower()
    color_literals = {
        "red", "blue", "green", "yellow", "orange", "purple", "black", "white",
        "gold", "silver", "pink", "brown",
    }
    if lowered in color_literals or lowered in {planet.lower() for planet in CURATED_OPTIONS["planet"]}:
        return False
    if is_person_like(normalized):
        return False
    if re.search(r"\b(river|ocean|sea|strait|desert|mountain|canal|lake)\b", lowered):
        return False
    return normalized[:1].isupper() and not is_sentence_like(normalized)


def is_ship_like(value: str) -> bool:
    normalized = normalize(value).rstrip(".")
    lowered = normalized.lower()
    if is_person_like(normalized):
        return False
    if lowered in {"red", "blue", "green", "yellow", "orange", "purple", "black", "white"}:
        return False
    return normalized[:1].isupper() and not is_sentence_like(normalized)


def existing_option_is_compatible(option: str, subtype: str, category: str) -> bool:
    lowered = normalize(option).rstrip(".").lower()
    if subtype in {"color", "color_combo"}:
        return bool(re.search(r"\b(red|blue|green|yellow|orange|purple|black|white|gold|silver|pink|brown)\b", option, re.I))
    if subtype == "year":
        return bool(re.fullmatch(r"\d{4}", normalize(option)))
    if subtype == "decade":
        return bool(re.fullmatch(r"\d{4}s", normalize(option), re.I))
    if subtype == "number":
        return is_number_like(option)
    if subtype == "planet":
        return option in CURATED_OPTIONS["planet"]
    if subtype == "country":
        return option[:1].isupper() and not re.search(r"\b(ocean|sea|river|strait|desert|mountain|lake|canal|current|falls)\b", lowered)
    if subtype == "state_or_region":
        return option[:1].isupper() and not re.search(r"\b(ocean|sea|river|strait|desert|mountain|lake|canal|current|falls)\b", lowered)
    if subtype == "river":
        known_rivers = {normalize(item).rstrip(".").lower() for item in CURATED_OPTIONS["river"]} | {"the niger", "the congo", "the yangtze", "the zambezi"}
        return "river" in lowered or lowered in known_rivers
    if subtype == "water_body":
        known_water_bodies = (
            {normalize(item).rstrip(".").lower() for item in CURATED_OPTIONS["river"]}
            | {normalize(item).rstrip(".").lower() for item in CURATED_OPTIONS["strait"]}
            | {normalize(item).rstrip(".").lower() for item in CURATED_OPTIONS["sea"]}
            | {normalize(item).rstrip(".").lower() for item in CURATED_OPTIONS["ocean"]}
            | {normalize(item).rstrip(".").lower() for item in CURATED_OPTIONS["lake"]}
            | {normalize(item).rstrip(".").lower() for item in CURATED_OPTIONS["canal"]}
            | {normalize(item).rstrip(".").lower() for item in CURATED_OPTIONS["current"]}
            | {"the niger", "the congo", "the yangtze", "the zambezi"}
        )
        return (
            "river" in lowered
            or "strait" in lowered
            or "sea" in lowered
            or "ocean" in lowered
            or "lake" in lowered
            or "canal" in lowered
            or "current" in lowered
            or lowered in known_water_bodies
        )
    if subtype == "waterfall":
        return "falls" in lowered or lowered in {"angel falls", "victoria falls", "niagara falls", "iguazu falls"}
    if subtype == "animal_term":
        return 1 <= len(option.split()) <= 4 and not is_sentence_like(option) and not is_number_like(option) and not is_person_like(option)
    if subtype == "chemical_symbol":
        return bool(re.fullmatch(r"[A-Z][a-z]?", normalize(option)))
    if subtype == "chemical_formula":
        return bool(re.fullmatch(r"[A-Z][A-Za-z0-9]+", normalize(option)))
    if subtype in {"who", "scientist", "philosopher", "historical_figure", "singer", "rapper", "actor", "director", "composer", "writer_creator", "person"}:
        return is_person_like(option)
    if subtype == "historical_ruler":
        return is_historical_ruler_like(option)
    if subtype == "amendment":
        return is_amendment_like(option)
    if subtype == "character_name":
        return option in CURATED_OPTIONS["character_name"] or (option[:1].isupper() and not is_person_like(option))
    if subtype in {"definition", "music_definition"}:
        return is_definition_like(option)
    if subtype in {"scientist_role", "life_stage", "body_part_or_organ", "legal_principle", "philosophy_branch", "map_attribute"}:
        return len(option.split()) <= 5 and not is_sentence_like(option)
    if subtype == "map_or_geo_term":
        return is_sentence_like(option) or len(option.split()) <= 4
    if subtype == "genre":
        return len(option.split()) <= 4 and not is_person_like(option)
    if subtype in CURATED_OPTIONS:
        return option in CURATED_OPTIONS[subtype]
    if subtype == "book_title":
        return is_title_like(option)
    if subtype == "historical_ship":
        return is_ship_like(option)
    if subtype in {"capital_city", "city", "continent", "mountain_or_desert", "location", "named_entity", "history_term", "empire_or_civilization", "historical_place", "historical_place_pair"}:
        return option[:1].isupper() and not is_sentence_like(option)
    return len(option) <= max(80, len(category) * 20)


def candidate_pool(subtype: str, category: str, pools: dict) -> list[str]:
    ordered = []
    supertype = SUBTYPE_SUPERTYPE.get(subtype)
    curated_first_subtypes = {
        "scientist_role",
        "life_stage",
        "body_part_or_organ",
        "legal_principle",
        "philosophy_branch",
        "genre",
        "musical_instrument",
        "office_device",
        "animal_species",
        "metric_length_unit",
        "energy_unit",
        "force_unit",
        "rock_or_mineral",
        "map_attribute",
    }
    supertype_fallback_subtypes = {
        "who",
        "scientist",
        "philosopher",
        "historical_figure",
        "city",
        "capital_city",
        "country",
        "state_or_region",
        "water_body",
        "mountain_or_desert",
        "organization",
        "empire_or_civilization",
        "historical_place",
        "historical_ship",
        "historical_place_pair",
    }

    def extend(items):
        for item in items:
            if item not in ordered:
                ordered.append(item)

    if subtype in curated_first_subtypes:
        extend(CURATED_OPTIONS.get(subtype, []))
    extend(pools["category_subtype"].get((category, subtype), []))
    if subtype not in {"definition", "term", "map_or_geo_term", "history_term", "measure_quantity", "function_phrase"}:
        extend(pools["subtype"].get(subtype, []))
    if subtype not in curated_first_subtypes:
        extend(CURATED_OPTIONS.get(subtype, []))
    if supertype and subtype in supertype_fallback_subtypes:
        extend(pools["category_supertype"].get((category, supertype), []))
        extend(pools["supertype"].get(supertype, []))
    return ordered


def repair_question_options(question: str, answer: str, category: str, existing_options: list[str], pools: dict) -> list[str]:
    override_distractors = QUESTION_DISTRACTOR_OVERRIDES.get(normalized_key(question))
    if override_distractors:
        options = [answer] + [option for option in override_distractors if option != answer][:3]
        rng = random.Random(hashlib.sha256(f"{category}|{question}|{answer}".encode("utf-8")).hexdigest())
        rng.shuffle(options)
        return options

    subtype = infer_subtype(question, answer, category)
    candidates = []

    if subtype == "year":
        candidates.extend(year_distractors(answer))
    elif subtype == "decade":
        candidates.extend(decade_distractors(answer))
    elif subtype == "number":
        candidates.extend(number_distractors(answer))

    for option in candidate_pool(subtype, category, pools):
        if option == answer or option in candidates:
            continue
        if existing_option_is_compatible(option, subtype, category):
            candidates.append(option)

    distractors = candidates[:3]
    if len(distractors) < 3:
        raise ValueError(f"Not enough distractors for '{question}' [{subtype}]")

    options = [answer] + distractors
    rng = random.Random(hashlib.sha256(f"{category}|{question}|{answer}".encode("utf-8")).hexdigest())
    rng.shuffle(options)
    return options


def repair_file(path: Path, pools: dict) -> int:
    data = json.loads(path.read_text(encoding="utf-8"))
    category = data["sections"][0]["title"]
    changed = 0
    for item in data["sections"][0]["items"]:
        if item["type"] != "multiple-choice":
            continue
        new_options = repair_question_options(
            question=item["q"],
            answer=item["a"],
            category=category,
            existing_options=item.get("options", []),
            pools=pools,
        )
        if item.get("options") != new_options:
            item["options"] = new_options
            changed += 1

    if changed:
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return changed


def main():
    records = build_records()
    pools = collect_pools(records)
    total_changes = 0
    for _source, path in records:
        total_changes += repair_file(path, pools)
    print(f"Updated {total_changes} multiple-choice questions.")


if __name__ == "__main__":
    main()

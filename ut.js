// ---------- Spelers, kaarten en Ultimate Team ----------

function hashOf(s) {
  let h = 2166136261;
  for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

// Elk cijfer met één decimaal (1,0 t/m 10,0) heeft een eigen speler: echte voetballers en bekende
// Nederlanders, van lager naar hoger. Een lage kaart zegt niets over de persoon; het is jouw cijfer.
// Formaat: 'naam|positie|tekst|m/v|huid,kapsel,haarkleur,baard[,o = oranje shirt]'
const PLAYER_LIST = [
  // 1,0 – 1,9: artiesten en presentatoren
  'André Hazes|ST|Zanger die het hele stadion laat meezingen.|m|0,kort,1,baard',
  'Jan Smit|CM|Volendamse zanger met een groot hart.|m|5,kort,3,',
  'Gordon|CB|Presentator met een gouden stem.|m|0,kort,1,',
  'Gerard Joling|RW|Showman met een glimlach van oor tot oor.|m|0,kuif,5,',
  'Linda de Mol|LW|Presentatrice die elk programma tot een succes maakt.|v|5,lang,3,',
  'Snelle|ST|Rapper met een eigen geluid.|m|5,kort,3,',
  'Davina Michelle|CM|Zangeres met een enorme stem.|v|0,lang,1,',
  'Duncan Laurence|CAM|Won het Songfestival voor Nederland.|m|5,kort,1,',
  'Emma Heesters|RW|Zangeres met miljoenen views.|v|5,lang,1,',
  'Ronnie Flex|ST|Rapper die altijd de sfeer erin brengt.|m|3,kort,4,',
  // 2,0 – 2,9: influencers en YouTubers
  'Kwebbelkop|ST|Gamer met miljoenen volgers.|m|0,kort,3,',
  'Monica Geuze|LB|Influencer die alles met een glimlach doet.|v|5,lang,3,',
  'Bram Krikke|CM|Maakt van elke rust een show.|m|0,kuif,1,baard',
  'Joost Klein|LW|Rent het veld op met zijn eigen muziekje.|m|0,medium,3,',
  'NikkieTutorials|CAM|Make-upartiest met een wereldwijd publiek.|v|5,lang,3,',
  'Kalvijn|RW|Rent sneller dan zijn video’s laden.|m|0,krul,0,stoppels',
  'Dylan Haegens|LW|Maakt van elke wedstrijd een sketch.|m|0,kuif,0,baard',
  'Milan Knol|RB|Overal bij en altijd in beeld.|m|5,kort,3,',
  'Enzo Knol|ST|Maakt na elke goal meteen een vlog.|m|5,kuif,3,',
  'Martin Garrix|CAM|DJ op de grootste festivals.|m|5,kort,1,',
  // 3,0 – 3,9: DJ’s en topsporters
  'Tiësto|CM|DJ-legende uit Breda.|m|0,kort,1,stoppels',
  'Armin van Buuren|CB|Draait al jaren aan de top.|m|5,kort,3,',
  'Hardwell|RW|DJ met een stadion vol fans.|m|0,kort,0,baard',
  'Max Verstappen|ST|Wereldkampioen Formule 1. Snel is een understatement.|m|5,kort,1,stoppels',
  'Femke Bol|RB|Topatlete op de 400 meter horden.|v|5,staart,3,',
  'Sifan Hassan|LW|Loopt de ene medaille na de andere.|v|3,knot,4,',
  'Dafne Schippers|RW|Sprintster met wereldtitels.|v|5,staart,3,',
  'Sven Kramer|LB|Schaatslegende met een kast vol goud.|m|5,kort,3,',
  'Ireen Wüst|CM|Een van de beste schaatsers ooit.|v|5,staart,1,',
  'Mathieu van der Poel|RW|Wielrenner die overal kan winnen.|m|5,kort,1,',
  // 4,0 – 4,9: topsporters
  'Epke Zonderland|CAM|Vliegende Hollander aan de rekstok.|m|5,kort,1,',
  'Jutta Leerdam|LW|Schaatsster met topsnelheid.|v|5,lang,1,',
  'Kjeld Nuis|CB|Schaatskampioen op de 1000 en 1500 meter.|m|5,kort,3,',
  'Tom Dumoulin|CM|Won de Giro d’Italia.|m|5,kort,1,',
  'Anna van der Breggen|RB|Wereldkampioene wielrennen.|v|5,staart,3,',
  'Ranomi Kromowidjojo|LB|Zwemkampioene op de sprint.|v|2,lang,4,',
  'Pieter van den Hoogenband|ST|Zwemlegende met olympisch goud.|m|5,kort,3,',
  'Lieke Klaver|RW|Sprintster op de 400 meter.|v|5,staart,3,',
  'Raymond van Barneveld|CB|Darter met vijf wereldtitels.|m|0,kort,1,',
  'Michael van Gerwen|ST|Darter die altijd voor de 180 gaat.|m|0,kaal,1,',
  // 5,0 – 5,4: Oranje-spelers
  'Wout Weghorst|ST|Lang, sterk en altijd strijdbaar.|m|0,kort,1,baard,o',
  'Luuk de Jong|ST|Sterk in de lucht.|m|0,kort,1,baard,o',
  'Davy Klaassen|CAM|Duikt op in de zestien.|m|0,kort,1,baard,o',
  'Marten de Roon|CM|Harde werker op het middenveld.|m|0,kort,1,baard,o',
  'Jasper Cillessen|GK|Keeper met rust aan de bal.|m|5,kort,3,stoppels,o',
  // 5,5 – 10,0
  'Bart Verbruggen|GK|Rustig aan de bal, zelfs onder druk.|m|5,kort,1,,o',
  'Noa Lang|LW|Dribbelaar die durft.|m|1,fade,4,,o',
  'Mats Wieffer|CM|Sterk in de duels.|m|5,kort,3,,o',
  'Jerdy Schouten|CM|Rustig aan de bal op het middenveld.|m|0,kort,1,,o',
  'Teun Koopmeiners|CM|Een linkervoet van goud.|m|5,kort,3,,o',
  'Steven Bergwijn|RW|Snel en altijd op zoek naar de goal.|m|3,kort,4,,o',
  'Daley Blind|LB|Slim aan de bal en altijd rustig.|m|5,kort,3,,o',
  'Jackie Groenen|CM|Loopt en draait als een tol.|v|5,staart,3,,o',
  'Donyell Malen|ST|Rent achter elke verdediging langs.|m|3,fade,4,,o',
  'Brian Brobbey|ST|Kracht en snelheid in één.|m|3,kort,4,,o',
  'Jeremie Frimpong|RB|Vliegt over de rechterflank.|m|3,kort,4,,o',
  'Jill Roord|CAM|Duikt op als niemand haar verwacht.|v|5,staart,2,,o',
  'Denzel Dumfries|RB|Een sneltrein langs de rechterkant.|m|3,fade,4,baard,o',
  'Nathan Aké|CB|Rustig, slim en veelzijdig.|m|3,kort,4,,o',
  'Lieke Martens|LW|Dribbelt elke verdediger duizelig.|v|5,staart,3,,o',
  'Micky van de Ven|CB|Een van de snelste verdedigers.|m|5,kort,3,,o',
  'Tijjani Reijnders|CM|Loopt elke wedstrijd kilometers.|m|1,kort,4,baard,o',
  'Daphne van Domselaar|GK|Reflexen als een kat.|v|5,staart,3,,o',
  'Cody Gakpo|LW|Snijdt naar binnen en krult hem erin.|m|3,kort,4,stoppels,o',
  'Matthijs de Ligt|CB|Stevig en sterk in de lucht.|m|5,kort,3,,o',
  'Xavi Simons|CAM|Creatief, snel en altijd gevaarlijk.|m|1,krullang,0,,o',
  'Ryan Gravenberch|CM|Lange benen, korte balcontrole.|m|3,kort,4,,o',
  'Memphis Depay|ST|Vrije trappen met een handtekening.|m|3,fade,4,baard,o',
  'Jurriën Timber|RB|Klein van stuk, groot in duels.|m|3,fade,4,,o',
  'Vivianne Miedema|ST|Scoort aan de lopende band.|v|5,knot,2,,o',
  'Stefan de Vrij|CB|Koel en betrouwbaar achterin.|m|0,kort,1,,o',
  'Frenkie de Jong|CM|Draait weg alsof er niemand staat.|m|0,medium,1,stoppels,o',
  'Danielle van de Donk|CM|Vechtlust en techniek.|v|5,knot,3,,o',
  'Edwin van der Sar|GK|Legendarische keeper met ijskoude rust.|m|0,kaal,5,,o',
  'Georginio Wijnaldum|CM|Duikt op in de zestien als niemand oplet.|m|3,fade,4,baard,o',
  'Wesley Sneijder|CAM|Passes op de millimeter.|m|0,kort,0,stoppels,o',
  'Dirk Kuyt|RW|Werkt voor drie en geeft nooit op.|m|5,kort,2,,o',
  'Arjen Robben|RW|Iedereen weet wat hij gaat doen. Niemand houdt hem tegen.|m|0,kaal,1,,o',
  'Sherida Spitse|CM|Leidt het team met precieze passes.|v|0,staart,1,,o',
  'Robin van Persie|ST|Die volley… die volley.|m|0,kort,0,stoppels,o',
  'Rafael van der Vaart|CAM|Een linkervoet vol magie.|m|0,kort,1,,o',
  'Ruud Gullit|CM|Kracht, techniek en klasse.|m|3,dreads,4,snor,o',
  'Klaas-Jan Huntelaar|ST|Staat altijd op de goede plek.|m|0,kort,1,,o',
  'Dennis Bergkamp|CAM|Een balaanname uit een andere wereld.|m|0,kort,3,,o',
  'Clarence Seedorf|CM|Kampioen met elke club.|m|3,kaal,4,,o',
  'Marco van Basten|ST|Scoorde een van de mooiste goals ooit.|m|0,kuif,1,,o',
  'Frank Rijkaard|CB|Elegant, sterk en slim.|m|3,krul,4,,o',
  'Virgil van Dijk|CB|Rust, kracht en overzicht. De baas achterin.|m|3,fade,4,baard,o',
  'Ruud van Nistelrooy|ST|Een goaltjesdief van wereldklasse.|m|0,kort,0,,o',
  'Lionel Messi|RW|Een van de beste voetballers ooit.|m|0,kort,0,baard',
  'Johan Cruijff|CAM|De grootste Nederlandse voetballer ooit. Totaalvoetbal.|m|0,medium,1,,o',
];

// Uiterlijk wordt vast afgeleid van de naam, zodat een speler er altijd hetzelfde uitziet.
const STYLES_M = ['kort', 'fade', 'kuif', 'krul', 'kaal', 'afro', 'kort', 'fade', 'kuif', 'dreads'];
const STYLES_V = ['lang', 'knot', 'staart', 'krul', 'afro', 'vlecht', 'lang', 'staart'];
function parsePlayer(line) {
  const [naam, pos, bio, sekse, looks] = line.split('|');
  const h = hashOf(naam);
  const man = sekse === 'm';
  const styles = man ? STYLES_M : STYLES_V;
  const p = {
    naam, pos, bio, man,
    skin: h % 6,
    hair: styles[(h >>> 3) % styles.length],
    hc: (h >>> 7) % 6,
    eyes: (h >>> 10) % 3,
    beard: man ? ['', '', 'stoppels', 'baard', ''][(h >>> 13) % 5] : '',
  };
  // Bekende mensen: hun eigen uiterlijk (getekend), voetballers in het oranje.
  if (looks) {
    const [skin, hair, hc, beard, oranje] = looks.split(',');
    Object.assign(p, { skin: +skin, hair, hc: +hc, beard: beard || '', eyes: 0, bekend: true, oranje: oranje === 'o' });
  }
  return Object.assign(p, LOOKS[naam]);
}

// Kenmerken waardoor een portret meer op de echte persoon lijkt: shirt van hun land/team (kit:
// [shirt, accent], stripes = verticale strepen), rugnummer, ogen en accessoires.
const OR = '#f36c21';
const LOOKS = {
  'Lionel Messi': { kit: ['#75aadb', '#ffffff'], stripes: true, nr: 10, hair: 'medium', hc: 1 },
  'Cristiano Ronaldo': { kit: ['#c8102e', '#0b6e3b'], nr: 7, hair: 'gel', hc: 4 },
  'Kylian Mbappé': { kit: ['#1e3a8a', '#ffffff'], nr: 10, hair: 'buzz', hc: 4 },
  'Erling Haaland': { kit: ['#c8102e', '#ffffff'], nr: 9, hair: 'knotm', hc: 3, eyes: 1 },
  'Lamine Yamal': { kit: ['#c8102e', '#f1bf00'], nr: 19, hair: 'krul', hc: 4 },
  'Jude Bellingham': { kit: ['#f4f4f4', '#1e3a8a'], nr: 10, hair: 'buzz', hc: 4 },
  'Max Verstappen': { kit: ['#1b2a4a', '#e10600'], nr: 1, eyes: 1, extra: 'pet' },
  'Michael van Gerwen': { kit: ['#3fae2a', '#111111'], eyes: 0 },
  'Raymond van Barneveld': { kit: ['#1a1a1a', '#e10600'] },
  'Tiësto': { kit: ['#1a1a1a', '#ffffff'] }, 'Armin van Buuren': { kit: ['#1a1a1a', '#ffffff'], eyes: 1 },
  'Hardwell': { kit: ['#1a1a1a', '#ffffff'] }, 'Martin Garrix': { kit: ['#1a1a1a', '#ffffff'] },
  'Snelle': { hc: 2 }, 'Joost Klein': { hair: 'medium', hc: 3, beard: 'snor', eyes: 1 },
  'Edgar Davids': { nr: 8, extra: 'sportbril' }, 'Memphis Depay': { nr: 10, extra: 'band' },
  'Johan Cruijff': { nr: 14 }, 'Marco van Basten': { nr: 9, eyes: 1 }, 'Dennis Bergkamp': { nr: 10 },
  'Virgil van Dijk': { nr: 4 }, 'Arjen Robben': { nr: 11, eyes: 1 }, 'Edwin van der Sar': { nr: 1, kit: ['#1f2937', OR] },
  'Robin van Persie': { nr: 9 }, 'Wesley Sneijder': { nr: 10 }, 'Ruud Gullit': { nr: 10 }, 'Frank Rijkaard': { nr: 3 },
  'Ronald Koeman': { nr: 4, eyes: 1 }, 'Patrick Kluivert': { nr: 9 }, 'Frenkie de Jong': { nr: 21 }, 'Cody Gakpo': { nr: 11 },
  'Xavi Simons': { nr: 7 }, 'Georginio Wijnaldum': { nr: 8 }, 'Denzel Dumfries': { nr: 22 }, 'Vivianne Miedema': { nr: 9, eyes: 1 },
  'Matthijs de Ligt': { nr: 3, eyes: 1 }, 'Bart Verbruggen': { nr: 1, kit: ['#1f2937', OR] }, 'Ruud van Nistelrooy': { nr: 10 },
  'Daphne van Domselaar': { nr: 1, kit: ['#1f2937', OR] }, 'Jasper Cillessen': { nr: 1, kit: ['#1f2937', OR] },
  'Justin Bijlow': { nr: 1, kit: ['#1f2937', OR] }, 'Mark Flekken': { nr: 1, kit: ['#1f2937', OR] },
  'Johan Neeskens': { nr: 13, beard: 'snor' }, 'Jaap Stam': { nr: 3 }, 'Marc Overmars': { nr: 11 },
};
// Sporters die in Nederlandse kleuren uitkomen.
for (const n of ['Femke Bol', 'Sifan Hassan', 'Dafne Schippers', 'Sven Kramer', 'Ireen Wüst', 'Epke Zonderland', 'Jutta Leerdam', 'Kjeld Nuis',
  'Ranomi Kromowidjojo', 'Pieter van den Hoogenband', 'Lieke Klaver', 'Femke Heemskerk', 'Jorien ter Mors', 'Sjinkie Knegt']) LOOKS[n] = { oranje: true, ...LOOKS[n] };
// base = de vaste rating van de speler (voor de transfermarkt): 1,0 → 10 … 10,0 → 100.
const PLAYERS = PLAYER_LIST.map((line, i) => ({ ...parsePlayer(line), base: 10 + i }));

// Extra spelers per niveau. Heb je hetzelfde cijfer bij meerdere vakken, dan krijgt het tweede
// (en derde…) vak een speler uit deze lijsten, zodat elke speler maar bij één vak hoort.
// Niet elke bekende speler is even goed: de besten staan in de hoogste groepen.
const EXTRA_LIST = {
  // 1,0 – 2,9
  f1: [
    'Chantal Janzen|CM|Presentatrice met een aanstekelijke lach.|v|5,lang,3,',
    'Humberto Tan|RB|Presentator met een groot sporthart.|m|3,kort,4,stoppels',
    'Johnny de Mol|ST|Presentator en acteur.|m|0,kort,1,baard',
    'Frans Bauer|CB|Zanger met een vrolijk repertoire.|m|0,kort,1,',
    'Glennis Grace|LW|Zangeres met een krachtige stem.|v|2,lang,4,',
    'Rob Kemps|CAM|Zanger van de Snollebollekes.|m|0,kort,1,baard',
  ],
  // 3,0 – 4,4
  f2: [
    'Annemiek van Vleuten|RB|Wielrenster met een kast vol titels.|v|5,staart,3,',
    'Dylan Groenewegen|RW|Snelle sprinter op de fiets.|m|5,kort,1,',
    'Femke Heemskerk|LB|Zwemster op de vrije slag.|v|5,staart,3,',
    'Jorien ter Mors|LW|Schaatsster op de lange en korte baan.|v|5,staart,3,',
    'Bauke Mollema|CM|Wielrenner die nooit opgeeft.|m|5,kort,1,',
    'Sjinkie Knegt|CB|Shorttracker met lef.|m|5,kort,1,baard',
  ],
  // 4,5 – 5,4
  f3: [
    'Kenny Tete|RB|Betrouwbare rechtsback.|m|3,kort,4,,o',
    'Lutsharel Geertruida|CB|Veelzijdige verdediger.|m|3,kort,4,,o',
    'Joey Veerman|CM|Passes met een fluwelen voetje.|m|5,kort,3,,o',
    'Quinten Timber|CM|Energiek op het middenveld.|m|3,fade,4,,o',
    'Justin Bijlow|GK|Snelle reflexen onder de lat.|m|5,kort,1,,o',
    'Steven Berghuis|RW|Een lekkere linkerpoot.|m|0,kort,1,baard,o',
  ],
  // 5,5 – 6,4
  p55: [
    'Calvin Stengs|CAM|Creatieve linkspoot.|m|3,kort,4,,o',
    'Ian Maatsen|LB|Snel langs de linkerkant.|m|3,fade,4,,o',
    'Jorrel Hato|LB|Jong, rustig en volwassen aan de bal.|m|3,kort,4,,o',
    'Joshua Zirkzee|ST|Technische spits met overzicht.|m|3,dreads,4,,o',
    'Sven Botman|CB|Lange, sterke verdediger.|m|5,kort,3,,o',
    'Mark Flekken|GK|Keeper die goed meevoetbalt.|m|0,kort,1,,o',
    'Kenneth Taylor|CM|Box-to-box middenvelder.|m|3,kort,4,,o',
    'Victoria Pelova|CAM|Speelt met lef en techniek.|v|5,staart,3,,o',
    'Esmee Brugts|LW|Snel en gevaarlijk langs de lijn.|v|5,staart,3,,o',
    'Lineth Beerensteyn|ST|Razendsnelle spits.|v|3,staart,4,,o',
  ],
  // 6,5 – 7,4
  p65: [
    'Daley Sinkgraven|LB|Technisch sterke back.|m|5,kort,3,,o',
    'Kevin Strootman|CM|Leider op het middenveld.|m|0,kort,1,baard,o',
    'Bas Dost|ST|Scoort met beide voeten en zijn hoofd.|m|5,kort,3,,o',
    'Tim Krul|GK|Penaltykiller.|m|0,kort,1,stoppels,o',
    'Joël Veltman|RB|Betrouwbaar en strijdbaar.|m|0,kort,1,,o',
    'Jordy Clasie|CM|Klein, slim en balvast.|m|0,kort,1,,o',
    'Sari van Veenendaal|GK|Keepster met wereldklasse-reddingen.|v|5,staart,3,,o',
    'Shanice van de Sanden|RW|Supersnel langs de lijn.|v|3,staart,4,,o',
    'Dominique Janssen|CB|Sterk in de duels.|v|5,staart,3,,o',
    'Stefanie van der Gragt|CB|Kopsterk en betrouwbaar.|v|5,staart,3,,o',
  ],
  // 7,5 – 8,4
  p75: [
    'Ibrahim Afellay|CAM|Elegante dribbelaar.|m|1,kort,4,stoppels,o',
    'Nigel de Jong|CM|Wint elk duel op het middenveld.|m|3,kaal,4,,o',
    'Gregory van der Wiel|RB|Aanvallende rechtsback.|m|3,kuif,4,,o',
    'John Heitinga|CB|Vechter in de verdediging.|m|0,kort,1,,o',
    'Eljero Elia|LW|Snelle vleugelspits.|m|3,kort,4,,o',
    'Joris Mathijsen|CB|Rustige linkspoot achterin.|m|5,kort,3,,o',
    'Maarten Stekelenburg|GK|Ervaren keeper.|m|0,kort,1,,o',
    'Ron Vlaar|CB|Muur in de verdediging.|m|0,kort,1,,o',
    'Kenneth Vermeer|GK|Keeper met lef.|m|3,kaal,4,,o',
    'Merel van Dongen|LB|Slimme en sterke verdedigster.|v|5,staart,1,,o',
  ],
  // 8,5 – 9,4
  p85: [
    'Mark van Bommel|CM|Hard maar eerlijk op het middenveld.|m|0,kort,1,,o',
    'Phillip Cocu|CM|Speelt overal, altijd goed.|m|0,kort,1,,o',
    'Giovanni van Bronckhorst|LB|Scoorde een wereldgoal op een WK.|m|1,kort,4,,o',
    'Jaap Stam|CB|Een muur van een verdediger.|m|0,kaal,1,,o',
    'Edgar Davids|CM|De pitbull van het middenveld.|m|3,dreads,4,,o',
    'Patrick Kluivert|ST|Scoort met gemak en stijl.|m|3,kort,4,,o',
    'Roy Makaay|ST|Snelle en koele afmaker.|m|0,kort,1,,o',
    'Marc Overmars|LW|Een van de snelste buitenspelers.|m|0,kort,1,,o',
    'Frank de Boer|LB|Lange passes op de millimeter.|m|5,kort,3,,o',
    'Ronald de Boer|CM|Veelzijdig en slim.|m|5,kort,3,,o',
  ],
  // 9,5 – 10,0
  p95: [
    'Ronald Koeman|CB|Een vrije trap als een kanonskogel.|m|5,kuif,3,,o',
    'Johan Neeskens|CM|Onvermoeibaar in het totaalvoetbal.|m|5,medium,3,,o',
    'Ruud Krol|LB|Een van de beste backs ooit.|m|5,medium,3,,o',
    'Cristiano Ronaldo|ST|Doelpuntenmachine met een ijzeren wil.|m|1,fade,0,',
    'Kylian Mbappé|ST|Supersnel en dodelijk voor de goal.|m|3,kort,4,',
    'Erling Haaland|ST|Scoort aan de lopende band.|m|5,staart,3,',
    'Lamine Yamal|RW|Jong toptalent met magie in zijn linkervoet.|m|2,kort,4,',
    'Jude Bellingham|CAM|Complete middenvelder van wereldklasse.|m|3,kort,4,',
  ],
};
const BAND_RANGE = { f1: [10, 29], f2: [30, 44], f3: [45, 54], p55: [55, 64], p65: [65, 74], p75: [75, 84], p85: [85, 94], p95: [95, 99] };
const EXTRA = Object.fromEntries(Object.entries(EXTRA_LIST).map(([band, list]) => [band, list.map((line) => {
  const p = parsePlayer(line);
  const [lo, hi] = BAND_RANGE[band];
  return { ...p, base: lo + (hashOf(p.naam) % (hi - lo + 1)) };
})]));
// Alle spelers samen (voor de transfermarkt).
const ALL_PLAYERS = [...PLAYERS, ...Object.values(EXTRA).flat()];

function bandOf(tenth) {
  if (tenth < 30) return 'f1';
  if (tenth < 45) return 'f2';
  if (tenth < 55) return 'f3';
  if (tenth < 65) return 'p55';
  if (tenth < 75) return 'p65';
  if (tenth < 85) return 'p75';
  if (tenth < 95) return 'p85';
  return 'p95';
}

// Welke speler bij welk cijfer + vak hoort. Per cijfer krijgt het vak met het oudste cijfer de
// hoofdspeler; andere vakken met datzelfde cijfer krijgen (op volgorde van datum) een extra speler
// van hetzelfde niveau die nog nergens anders gebruikt wordt. Zo blijven bestaande kaarten gelijk.
let assignFor = null;
let assigned = new Map();
function assignments() {
  if (assignFor === grades) return assigned;
  assignFor = grades;
  assigned = new Map();
  const used = new Set();
  const sorted = grades.filter((g) => g.cijfer != null).sort((a, b) => new Date(a.datum) - new Date(b.datum));
  const primaryOwner = new Map(); // tiende → vak
  for (const g of sorted) {
    const tenth = Math.round(g.cijfer * 10);
    const key = `${tenth}|${g.vak}`;
    if (assigned.has(key)) continue;
    if (!primaryOwner.has(tenth)) {
      primaryOwner.set(tenth, g.vak);
      assigned.set(key, PLAYERS[Math.min(PLAYERS.length - 1, Math.max(0, tenth - 10))]);
      continue;
    }
    const pool = EXTRA[bandOf(tenth)];
    const start = hashOf(key) % pool.length;
    let pick = null;
    for (let i = 0; i < pool.length && !pick; i++) {
      const cand = pool[(start + i) % pool.length];
      if (!used.has(cand.naam)) pick = cand;
    }
    if (pick) used.add(pick.naam);
    assigned.set(key, pick || PLAYERS[Math.min(PLAYERS.length - 1, Math.max(0, tenth - 10))]);
  }
  return assigned;
}
const MYSTERY = { naam: 'Onbekende Belofte', pos: 'CM', bio: 'Een cijfer zonder getal: wie weet wat hij kan.', man: true, skin: 1, hair: 'kort', hc: 1, eyes: 0, beard: '' };

// [licht, schaduw] per huidskleur
const SKINS = [['#f6d2b0', '#d9a77f'], ['#e0ac78', '#b8804f'], ['#c68642', '#9a6230'], ['#8d5524', '#6a3c16'], ['#5c3a1e', '#422712'], ['#ffe0c4', '#e8b896']];
const HAIRS = ['#2b1b10', '#5a3a22', '#a8642a', '#e6c15a', '#141414', '#9a9a9a'];
const EYES = ['#5b3a1e', '#2f6db3', '#3d7a3d'];

const POS_NAMES = { GK: 'Keeper', CB: 'Centrale verdediger', LB: 'Linksback', RB: 'Rechtsback', CM: 'Centrale middenvelder', CAM: 'Aanvallende middenvelder', LW: 'Linksbuiten', RW: 'Rechtsbuiten', ST: 'Spits' };

function tierOf(g) {
  const c = g.cijfer;
  if (c == null) return { id: 'silver', name: 'Zilver' };
  if (c >= 9) return { id: 'toty', name: 'Team of the Year' };
  if (c >= 8) return { id: 'rare', name: 'Zeldzaam goud' };
  if (c >= 7) return { id: 'gold', name: 'Goud' };
  if (c >= 6) return { id: 'silver', name: 'Zilver' };
  if (c >= 5.5) return { id: 'bronze', name: 'Brons' };
  return { id: 'red', name: 'Rode kaart' };
}

function playerFor(g) {
  if (g.cijfer == null) return MYSTERY;
  // 1,0 → eerste speler, … 10,0 → laatste; bij hetzelfde cijfer in een ander vak een extra speler.
  const tenth = Math.round(g.cijfer * 10);
  return assignments().get(`${tenth}|${g.vak}`) || PLAYERS[Math.min(PLAYERS.length - 1, Math.max(0, tenth - 10))];
}

// Korte vaknaam voor op de kaart.
function vakKort(vak) {
  const v = vak.toLowerCase();
  const map = [
    [/nederlands/, 'Nederlands'], [/engels/, 'Engels'], [/duits/, 'Duits'], [/frans/, 'Frans'], [/spaans/, 'Spaans'],
    [/culturele|ckv/, 'CKV'], [/lichamelijke/, 'Gym (LO)'], [/bedrijfseconomie/, 'Bedrijfseconomie'],
    [/maatschappijwetenschappen/, 'Maatschappijwet.'], [/levensbeschouwing/, 'Levensbeschouwing'],
  ];
  return (map.find(([re]) => re.test(v)) || [null, vak.charAt(0).toUpperCase() + vak.slice(1)])[1];
}

// Elk vak een eigen clubkleur (shirt en vakbalk).
const CLUB_COLORS = ['#d62828', '#1d4ed8', '#059669', '#7c3aed', '#ea580c', '#0891b2', '#be185d', '#4d7c0f', '#b45309', '#334155', '#0f766e', '#9333ea'];
const vakColor = (vak) => CLUB_COLORS[hashOf(vakKort(vak)) % CLUB_COLORS.length];

// Statistieken rond de rating, met een eigen "profiel" per positie.
const POS_BIAS = {
  GK: [-10, -20, 0, -10, 10, 8], CB: [-4, -14, -2, -8, 12, 10], LB: [6, -10, 2, 0, 6, 2], RB: [6, -10, 2, 0, 6, 2],
  CM: [0, -2, 8, 4, 0, 2], CAM: [2, 4, 8, 8, -12, -4], LW: [10, 2, 0, 8, -14, -4], RW: [10, 2, 0, 8, -14, -4], ST: [6, 10, -4, 4, -16, 4],
};
const STAT_LABELS = ['SNE', 'SCH', 'PAS', 'DRI', 'VER', 'FYS'];

function cardOf(g) {
  // Een kaart van de transfermarkt draagt zijn speler zelf mee; een cijferkaart krijgt er een bij het cijfer.
  const player = g.player || playerFor(g);
  const ovr = g.cijfer == null ? 60 : Math.round(g.cijfer * 10);
  const h = hashOf(player.naam + g.id);
  const stats = POS_BIAS[player.pos].map((b, i) => Math.max(1, Math.min(99, ovr + b + (((h >> (i * 4)) & 15) - 7))));
  return { g, player, ovr, tier: tierOf(g), stats };
}

// ---------- Spelersportret ----------
// Een getekend portret als SVG (alleen attributen, geen style: dat mag van de beveiliging).
// De gezichtsuitdrukking past bij het cijfer.
let avatarSeq = 0;
function avatarSVG(p, shirt, mood, nummer) {
  const id = `av${++avatarSeq}`;
  const [skin, shade] = SKINS[p.skin];
  const hair = HAIRS[p.hc];
  const eye = EYES[p.eyes];
  const accent = p.kit?.[1];
  const rgb = parseInt(shirt.slice(1), 16);
  const light = 0.299 * (rgb >> 16) + 0.587 * ((rgb >> 8) & 255) + 0.114 * (rgb & 255) > 200; // wit shirt: donker rugnummer
  const body = 'M12 120 C14 102 28 95 46 92 L60 101 L74 92 C92 95 106 102 108 120 Z';

  const back = {
    afro: `<circle cx="60" cy="44" r="34" fill="${hair}"/>`,
    lang: `<path d="M27 58 C22 24 44 12 60 12 C76 12 98 24 93 58 L95 100 C88 104 80 101 80 101 L80 62 C78 44 70 36 60 36 C50 36 42 44 40 62 L40 101 C40 101 32 104 25 100 Z" fill="${hair}"/>`,
    staart: `<path d="M84 40 C100 48 102 74 92 92 C90 80 88 66 80 56 Z" fill="${hair}"/>`,
    vlecht: `<g fill="${hair}"><rect x="27" y="50" width="7" height="46" rx="3.5"/><rect x="86" y="50" width="7" height="46" rx="3.5"/></g>`,
    dreads: `<g fill="${hair}"><rect x="29" y="44" width="6" height="34" rx="3"/><rect x="36" y="48" width="6" height="30" rx="3"/><rect x="78" y="48" width="6" height="30" rx="3"/><rect x="85" y="44" width="6" height="34" rx="3"/></g>`,
    knot: `<circle cx="60" cy="13" r="10" fill="${hair}"/>`,
    medium: `<path d="M28 60 C24 28 44 15 60 15 C76 15 96 28 92 60 L91 80 C86 82 84 78 84 78 L83 58 C80 42 72 35 60 35 C48 35 40 42 37 58 L36 78 C36 78 34 82 29 80 Z" fill="${hair}"/>`,
    krullang: `<g fill="${hair}"><circle cx="31" cy="56" r="9"/><circle cx="29" cy="70" r="8"/><circle cx="89" cy="56" r="9"/><circle cx="91" cy="70" r="8"/><circle cx="34" cy="80" r="6"/><circle cx="86" cy="80" r="6"/></g>`,
    knotm: `<ellipse cx="60" cy="15" rx="9" ry="7.5" fill="${hair}"/>`,
  };
  const top = 'M31 56 C29 30 44 19 61 19 C78 19 92 30 89 56 C86 44 80 37 68 36 C58 39 46 39 38 41 C34 45 32 50 31 56 Z';
  const front = {
    kaal: `<path d="M44 30 C50 26 60 25 66 27" stroke="#fff" stroke-opacity=".35" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    kort: `<path d="${top}" fill="${hair}"/>`,
    fade: `<path d="M34 50 C34 30 46 21 60 21 C74 21 86 30 86 50 C83 41 76 35 60 35 C46 35 37 41 34 50 Z" fill="${hair}"/><path d="M31 56 C31 48 33 44 35 42 L35 58 Z M89 56 C89 48 87 44 85 42 L85 58 Z" fill="${hair}" opacity=".45"/>`,
    kuif: `<path d="${top}" fill="${hair}"/><path d="M38 38 C40 16 66 8 84 22 C74 22 64 27 58 37 Z" fill="${hair}"/>`,
    krul: `<g fill="${hair}"><circle cx="36" cy="40" r="8"/><circle cx="44" cy="30" r="9"/><circle cx="55" cy="24" r="9"/><circle cx="67" cy="24" r="9"/><circle cx="78" cy="30" r="9"/><circle cx="85" cy="41" r="8"/><circle cx="60" cy="31" r="8"/></g>`,
    afro: `<path d="M34 46 C40 34 50 30 60 30 C70 30 80 34 86 46 C82 34 72 26 60 26 C48 26 38 34 34 46 Z" fill="${hair}"/>`,
    lang: `<path d="${top}" fill="${hair}"/>`,
    knot: `<path d="${top}" fill="${hair}"/>`,
    staart: `<path d="${top}" fill="${hair}"/>`,
    vlecht: `<path d="M31 56 C29 30 44 19 61 19 C78 19 92 30 89 56 C84 40 72 34 60 34 C48 34 36 40 31 56 Z" fill="${hair}"/><path d="M60 20 L60 34" stroke="${shade}" stroke-width="1.5" opacity=".6"/>`,
    dreads: `<path d="${top}" fill="${hair}"/><g stroke="${shade}" stroke-opacity=".5" stroke-width="1.4"><path d="M44 24 L42 40"/><path d="M54 21 L52 37"/><path d="M66 21 L67 37"/><path d="M77 25 L80 40"/></g>`,
    medium: `<path d="M30 58 C28 30 44 18 61 18 C80 18 93 30 90 58 C86 44 78 36 64 34 C54 40 42 42 34 46 C32 50 31 54 30 58 Z" fill="${hair}"/><path d="M64 34 C70 40 76 42 84 42" stroke="${shade}" stroke-opacity=".5" stroke-width="1.5" fill="none"/>`,
    krullang: `<g fill="${hair}"><circle cx="35" cy="42" r="9"/><circle cx="42" cy="30" r="10"/><circle cx="54" cy="23" r="10"/><circle cx="67" cy="23" r="10"/><circle cx="79" cy="30" r="10"/><circle cx="86" cy="42" r="9"/><circle cx="48" cy="36" r="7"/><circle cx="72" cy="36" r="7"/></g>`,
    // Strak naar achteren gegeld, met een scherpe haarlijn.
    gel: `<path d="M32 54 C30 30 44 20 61 20 C78 20 91 30 88 54 C86 42 80 34 72 32 C64 30 54 31 46 33 C38 36 34 44 32 54 Z" fill="${hair}"/><path d="M44 27 C54 23 68 23 80 29 M42 31 C54 27 70 27 82 34" stroke="#fff" stroke-opacity=".18" stroke-width="1.2" fill="none"/>`,
    // Heel kort opgeschoren: de huid schemert erdoorheen.
    buzz: `<path d="M32 52 C31 32 44 23 60 23 C76 23 89 32 88 52 C84 42 76 36 60 36 C44 36 36 42 32 52 Z" fill="${hair}" opacity=".8"/>`,
    // Lang haar strak naar achteren in een knotje.
    knotm: `<path d="M32 54 C30 30 44 20 61 20 C78 20 91 30 88 54 C85 40 76 33 60 33 C44 33 35 40 32 54 Z" fill="${hair}"/><path d="M46 24 C52 28 54 32 54 34 M74 24 C68 28 66 32 66 34" stroke="${shade}" stroke-opacity=".35" stroke-width="1.2" fill="none"/>`,
  };
  // Accessoires.
  const extras = {
    pet: `<path d="M30 46 C30 24 46 16 60 16 C74 16 90 24 90 46 Z" fill="${shirt}"/><path d="M30 46 C46 40 74 40 90 46 L92 50 C74 44 46 44 28 50 Z" fill="${accent || '#e10600'}"/><path d="M60 16 L60 40" stroke="#fff" stroke-opacity=".25" stroke-width="1.5"/>`,
    sportbril: `<g><path d="M36 53 C36 49 46 48 60 50 C74 48 84 49 84 53 L84 62 C84 66 74 66 66 62 L60 59 L54 62 C46 66 36 66 36 62 Z" fill="#ff8a00" fill-opacity=".55" stroke="#222" stroke-width="2"/><path d="M36 56 L29 58 M84 56 L91 58" stroke="#222" stroke-width="2.4"/></g>`,
    band: `<path d="M32 44 C44 38 76 38 88 44 L88 50 C76 44 44 44 32 50 Z" fill="#fff"/>`,
    bril: `<g fill="none" stroke="#222" stroke-width="2"><rect x="40" y="52" width="16" height="12" rx="4"/><rect x="64" y="52" width="16" height="12" rx="4"/><path d="M56 57 L64 57 M40 56 L32 54 M80 56 L88 54"/></g>`,
  };

  // Mond en wenkbrauwen per stemming.
  const mouths = {
    blij: `<path d="M48 74 Q60 86 72 74 Z" fill="#6d2a2a"/><path d="M50 75 L70 75 L68 78 L52 78 Z" fill="#fff"/>`,
    lach: `<path d="M50 75 Q60 82 70 75" stroke="#7a3b2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    neutraal: `<path d="M52 77 Q60 79 68 77" stroke="#7a3b2e" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    sip: `<path d="M51 80 Q60 73 69 80" stroke="#7a3b2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  };
  const brows = mood === 'sip'
    ? `<path d="M42 49 L54 46" /><path d="M66 46 L78 49" />`
    : mood === 'blij'
      ? `<path d="M42 47 Q48 42 54 46" /><path d="M66 46 Q72 42 78 47" />`
      : `<path d="M42 48 Q48 45 54 47" /><path d="M66 47 Q72 45 78 48" />`;
  const beard = {
    stoppels: `<path d="M35 64 C37 80 47 89 60 89 C73 89 83 80 85 64 C81 73 73 76 60 76 C47 76 39 73 35 64 Z" fill="${hair}" opacity=".28"/>`,
    baard: `<path d="M35 62 C36 82 47 92 60 92 C73 92 84 82 85 62 C82 72 76 74 68 72 C64 71 56 71 52 72 C44 74 38 72 35 62 Z" fill="${hair}"/>`,
    snor: `<path d="M47 73 C51 69 57 69 60 71 C63 69 69 69 73 73 C68 72 64 73 60 74 C56 73 52 72 47 73 Z" fill="${hair}"/>`,
    sik: `<path d="M50 82 C52 90 56 93 60 93 C64 93 68 90 70 82 C66 85 54 85 50 82 Z" fill="${hair}"/>`,
  }[p.beard] || '';

  const svg = `<svg viewBox="0 0 120 120" class="pc-avatar" aria-hidden="true">
    <defs>
      <radialGradient id="${id}f" cx="45%" cy="38%" r="68%"><stop offset="0" stop-color="${skin}"/><stop offset=".75" stop-color="${skin}"/><stop offset="1" stop-color="${shade}"/></radialGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
      <linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lighten(hair, .35)}"/><stop offset=".45" stop-color="${hair}"/><stop offset="1" stop-color="${lighten(hair, -.25)}"/></linearGradient>
    </defs>
    ${back[p.hair] || ''}
    <path d="${body}" fill="${shirt}"/>
    ${p.stripes ? `<clipPath id="${id}c"><path d="${body}"/></clipPath><g clip-path="url(#${id}c)" fill="${accent}">${[20, 40, 60, 80, 100].map((x) => `<rect x="${x - 5}" y="88" width="10" height="34"/>`).join('')}</g>` : ''}
    ${accent && !p.stripes ? `<path d="M12 120 C13 113 15 108 18 105 L22 107 C19 110 17 115 16 120 Z M108 120 C107 113 105 108 102 105 L98 107 C101 110 103 115 104 120 Z" fill="${accent}"/>` : ''}
    <path d="${body}" fill="url(#${id}s)"/>
    <path d="M30 120 C30 110 32 103 35 98 M90 120 C90 110 88 103 85 98" stroke="#000" stroke-opacity=".18" stroke-width="1.4" fill="none"/>
    <path d="M44 92 L60 105 L76 92 L72 90 L60 99 L48 90 Z" fill="#fff" opacity=".92"/>
    <path d="M46 93.5 L60 104 L74 93.5" stroke="${shirt}" stroke-width="1.2" fill="none" opacity=".8"/>
    <g transform="translate(38 106)"><path d="M0 -5 L5 -3 L5 2 Q5 5 0 7 Q-5 5 -5 2 L-5 -3 Z" fill="#fff" opacity=".9"/><text x="0" y="3" font-size="5" font-weight="900" text-anchor="middle" fill="${shirt}" font-family="Segoe UI, sans-serif">FC</text></g>
    ${nummer ? `<text x="86" y="114" font-size="11" font-weight="900" fill="${light ? (accent || '#1e3a8a') : '#fff'}" fill-opacity=".9" text-anchor="middle" font-family="Segoe UI, sans-serif">${nummer}</text>` : ''}
    <path d="M50 80 L50 94 Q60 100 70 94 L70 80 Z" fill="${shade}"/>
    <path d="M50 86 Q60 92 70 86 L70 80 L50 80 Z" fill="#000" opacity=".12"/>
    <ellipse cx="32" cy="60" rx="5.5" ry="8" fill="${shade}"/><ellipse cx="88" cy="60" rx="5.5" ry="8" fill="${shade}"/>
    <path d="M31 57 Q33 60 32 64 M89 57 Q87 60 88 64" stroke="#000" stroke-opacity=".15" stroke-width="1.2" fill="none"/>
    <path d="M60 26 C80 26 88 41 88 57 C88 76 76 89 60 89 C44 89 32 76 32 57 C32 41 40 26 60 26 Z" fill="url(#${id}f)"/>
    <path d="M40 78 Q60 94 80 78 Q72 88 60 89 Q48 88 40 78 Z" fill="#000" opacity=".07"/>
    <circle cx="44" cy="70" r="5" fill="#ff6b6b" opacity=".15"/><circle cx="76" cy="70" r="5" fill="#ff6b6b" opacity=".15"/>
    <g fill="#fff"><ellipse cx="48" cy="58" rx="5.2" ry="${mood === 'blij' ? 3 : 3.8}"/><ellipse cx="72" cy="58" rx="5.2" ry="${mood === 'blij' ? 3 : 3.8}"/></g>
    <g fill="${eye}"><circle cx="48.5" cy="58.3" r="2.8"/><circle cx="72.5" cy="58.3" r="2.8"/></g>
    <g fill="#111"><circle cx="48.5" cy="58.3" r="1.3"/><circle cx="72.5" cy="58.3" r="1.3"/></g>
    <g fill="#fff"><circle cx="49.6" cy="57.2" r=".8"/><circle cx="73.6" cy="57.2" r=".8"/></g>
    <path d="M42.8 55.6 Q48 53 53.2 55.6 M66.8 55.6 Q72 53 77.2 55.6" stroke="${shade}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <g stroke="${p.hair === 'kaal' ? shade : hair}" stroke-width="2.8" fill="none" stroke-linecap="round">${brows}</g>
    <path d="M60 60 Q57 68 59 70 Q61 71.5 64 69.5" stroke="${shade}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M57 69 Q60 71 63 69" stroke="#fff" stroke-opacity=".25" stroke-width="1" fill="none"/>
    ${p.beard === 'snor' ? '' : beard}
    ${mouths[mood] || mouths.lach}
    ${p.beard === 'snor' ? beard : ''}
    ${p.extra === 'pet' ? '' : front[p.hair] || ''}
    ${extras[p.extra] || ''}
  </svg>`;
  // Haar (en baard) met een verloop, zodat het glanst.
  return svg.split(`fill="${hair}"`).join(`fill="url(#${id}h)"`);
}

// Kleur lichter (amt > 0) of donkerder (amt < 0) maken.
function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((c) => Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt)));
  return '#' + ch.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}

const MOODS = { toty: 'blij', rare: 'blij', gold: 'lach', silver: 'lach', bronze: 'neutraal', red: 'sip' };

// De kaart. size: 'lg' (pack), 'md' (club), 'sm' (veld).
function cardHTML(c, size = 'md') {
  const p = c.player;
  const g = c.g;
  const color = vakColor(g.vak);
  const shirt = p.kit?.[0] || (p.oranje ? OR : color); // eigen land/team, anders oranje of de vakkleur
  // Naam altijd helemaal zichtbaar: lettergrootte past zich aan de lengte aan, anders 2 regels.
  const room = size === 'sm' ? 10.3 : 13.2;
  const nameSize = Math.max(0.62, Math.min(1.15, room / (p.naam.length * 0.7))).toFixed(2);
  return `<div class="fc-card fc-${size}" data-tier="${c.tier.id}">
    <div class="fc-bg"></div>
    <div class="fc-shine"></div>
    <div class="fc-inner">
      <div class="fc-left">
        <div class="fc-ovr">${c.ovr}</div>
        <div class="fc-pos">${p.pos}</div>
        <div class="fc-flag">${vakIcon(g.vak)}</div>
      </div>
      <div class="fc-photo">${avatarSVG(p, shirt, MOODS[c.tier.id], p.nr || c.ovr)}</div>
      <div class="fc-name"><span data-size="${nameSize}">${esc(p.naam)}</span></div>
      <div class="fc-vakbar" data-color="${color}"><span class="fc-vakicon">${vakIcon(g.vak)}</span><span>${esc(vakKort(g.vak))}</span></div>
      <div class="fc-stats">
        ${c.stats.map((v, i) => `<div><b>${v}</b><span>${STAT_LABELS[i]}</span></div>`).join('')}
      </div>
      <div class="fc-foot">${g.transfer ? '🔄 Transfermarkt' : `${g.vorigJaar ? 'Vorig jaar' : 'Cijfer'} <span class="fc-grade">${esc(g.resultaat)}</span>`}</div>
    </div>
  </div>`;
}

// De vakbalk krijgt de clubkleur via JS (inline style-attributen zijn geblokkeerd door de beveiliging).
function paintCards(root = document) {
  root.querySelectorAll('.fc-vakbar[data-color]').forEach((el) => {
    if (el.style.background !== el.dataset.color) el.style.background = el.dataset.color;
  });
  root.querySelectorAll('.fc-name span[data-size]').forEach((el) => {
    el.style.fontSize = el.dataset.size + 'em';
  });
}
new MutationObserver(() => paintCards()).observe(document.body, { childList: true, subtree: true });

// ---------- Ultimate Team ----------
const SLOTS = [
  { id: 'LW', x: 18, y: 15 }, { id: 'ST', x: 50, y: 11 }, { id: 'RW', x: 82, y: 15 },
  { id: 'CM1', pos: 'CM', x: 22, y: 38 }, { id: 'CM2', pos: 'CM', x: 50, y: 42 }, { id: 'CM3', pos: 'CM', x: 78, y: 38 },
  { id: 'LB', x: 12, y: 62 }, { id: 'CB1', pos: 'CB', x: 36, y: 65 }, { id: 'CB2', pos: 'CB', x: 64, y: 65 }, { id: 'RB', x: 88, y: 62 },
  { id: 'GK', x: 50, y: 86 },
];
const slotPos = (s) => s.pos || s.id;
const FITS = {
  GK: ['GK'], LB: ['LB', 'RB', 'CB'], RB: ['RB', 'LB', 'CB'], CB: ['CB', 'LB', 'RB'],
  CM: ['CM', 'CAM'], LW: ['LW', 'RW', 'ST'], RW: ['RW', 'LW', 'ST'], ST: ['ST', 'LW', 'RW', 'CAM'],
};

let team = {};
let selectedSlot = null;
let clubFilter = '';

function loadTeam() {
  try { team = JSON.parse(localStorage.getItem('ut-team') || '{}'); } catch { team = {}; }
}
function saveTeam() {
  try { localStorage.setItem('ut-team', JSON.stringify(team)); } catch {}
}

// Je club = alle cijfers die je als pack hebt geopend (min wat je verkocht hebt)
// plus de spelers die je op de transfermarkt hebt gekocht.
function ownedCards() {
  const opened = window.packOpened?.() || new Set();
  const sold = new Set(window.tmSold?.() || []);
  const fromGrades = grades.filter((g) => opened.has(g.id) && !sold.has(g.id)).map(cardOf);
  const bought = (window.tmBoughtCards?.() || []).map(cardOf);
  return [...fromGrades, ...bought].sort((a, b) => b.ovr - a.ovr);
}

function chemistry(cards) {
  const result = {};
  for (const s of SLOTS) {
    const c = cards[s.id];
    if (!c) continue;
    let chem = 0;
    if (FITS[slotPos(s)].includes(c.player.pos)) chem++;
    if (c.player.pos === slotPos(s)) chem++;
    if (SLOTS.some((o) => o.id !== s.id && cards[o.id]?.g.vak === c.g.vak)) chem++;
    result[s.id] = chem;
  }
  return result;
}

function renderTeam() {
  loadTeam();
  const owned = ownedCards();
  const byId = new Map(owned.map((c) => [c.g.id, c]));
  // Kaarten die niet meer bestaan uit het team halen.
  for (const k of Object.keys(team)) if (!byId.has(team[k])) delete team[k];
  const cards = Object.fromEntries(Object.entries(team).map(([k, id]) => [k, byId.get(id)]));
  const chem = chemistry(cards);
  const placed = Object.values(cards);
  const ovr = placed.length ? Math.round(placed.reduce((t, c) => t + c.ovr, 0) / 11) : 0;
  const chemTotal = Object.values(chem).reduce((a, b) => a + b, 0);

  $('#ut-ovr').textContent = ovr;
  $('#ut-chem').textContent = `${chemTotal}/33`;
  $('#ut-count').textContent = `${placed.length}/11`;
  $('#ut-chem-bar').style.width = `${(chemTotal / 33) * 100}%`;

  $('#ut-pitch-slots').innerHTML = SLOTS.map((s) => {
    const c = cards[s.id];
    const dots = c ? `<div class="ut-chem">${'◆'.repeat(chem[s.id])}${'◇'.repeat(3 - chem[s.id])}</div>` : '';
    return `<div class="ut-slot ${c ? 'filled' : 'empty'} ${selectedSlot === s.id ? 'selected' : ''}" data-slot="${s.id}" data-x="${s.x}" data-y="${s.y}">
      ${c ? cardHTML(c, 'sm') + `<button class="ut-remove" data-remove="${s.id}" aria-label="Haal uit team">×</button>` : `<div class="ut-empty-card"><b>${slotPos(s)}</b><span>+</span></div>`}
      ${dots}
    </div>`;
  }).join('');
  document.querySelectorAll('#ut-pitch-slots .ut-slot').forEach((el) => {
    el.style.left = el.dataset.x + '%';
    el.style.top = el.dataset.y + '%';
  });

  // Club
  const vakken = [...new Set(owned.map((c) => c.g.vak))].sort();
  const sel = $('#ut-filter');
  sel.innerHTML = '<option value="">Alle vakken</option>' + vakken.map((v) => `<option>${esc(v)}</option>`).join('');
  sel.value = vakken.includes(clubFilter) ? clubFilter : '';
  const inTeam = new Set(Object.values(team));
  const want = selectedSlot ? slotPos(SLOTS.find((s) => s.id === selectedSlot)) : null;
  const list = owned.filter((c) => !sel.value || c.g.vak === sel.value);
  $('#ut-club-count').textContent = `${owned.length} ${owned.length === 1 ? 'kaart' : 'kaarten'}`;
  $('#ut-hint').textContent = selectedSlot
    ? `Kies een kaart voor ${POS_NAMES[want] || want}. Kaarten met een groen randje passen het best.`
    : 'Klik op een plek in het veld en kies dan een kaart. Of laat het team automatisch maken.';
  $('#ut-club').innerHTML = list.map((c) => `
    <button class="ut-club-card ${inTeam.has(c.g.id) ? 'in-team' : ''} ${want && FITS[want].includes(c.player.pos) ? 'fits' : ''}" data-card="${esc(c.g.id)}">
      ${cardHTML(c, 'md')}
      ${inTeam.has(c.g.id) ? '<span class="ut-badge">In team</span>' : ''}
    </button>`).join('') ||
    `<p class="hint">Nog geen kaarten. Open eerst je packs bij <b>Cijfers</b> → <b>Nieuwe cijfers bekijken</b>.</p>`;
}

function placeCard(cardId) {
  let slot = selectedSlot;
  if (!slot) {
    const c = ownedCards().find((x) => x.g.id === cardId);
    if (!c) return;
    const free = SLOTS.filter((s) => !team[s.id]);
    slot = (free.find((s) => slotPos(s) === c.player.pos) || free.find((s) => FITS[slotPos(s)].includes(c.player.pos)) || free[0])?.id;
    if (!slot) return;
  }
  for (const k of Object.keys(team)) if (team[k] === cardId) delete team[k];
  team[slot] = cardId;
  selectedSlot = null;
  saveTeam();
  renderTeam();
}

// Beste elftal: eerst exacte posities, dan passende, dan wat over is.
function autoTeam() {
  const pool = ownedCards();
  const used = new Set();
  team = {};
  for (const pass of ['exact', 'fit', 'any']) {
    for (const s of SLOTS) {
      if (team[s.id]) continue;
      const pick = pool.find((c) => !used.has(c.g.id) && (
        pass === 'any' || (pass === 'exact' ? c.player.pos === slotPos(s) : FITS[slotPos(s)].includes(c.player.pos))));
      if (pick) { team[s.id] = pick.g.id; used.add(pick.g.id); }
    }
  }
  selectedSlot = null;
  saveTeam();
  renderTeam();
}

$('#ut-pitch-slots').addEventListener('click', (e) => {
  const rm = e.target.closest('[data-remove]');
  if (rm) { delete team[rm.dataset.remove]; saveTeam(); return renderTeam(); }
  const slot = e.target.closest('[data-slot]');
  if (!slot) return;
  selectedSlot = selectedSlot === slot.dataset.slot ? null : slot.dataset.slot;
  renderTeam();
});
$('#ut-club').addEventListener('click', (e) => {
  const card = e.target.closest('[data-card]');
  if (card) placeCard(card.dataset.card);
});
$('#ut-filter').addEventListener('change', (e) => { clubFilter = e.target.value; renderTeam(); });
$('#ut-auto').addEventListener('click', autoTeam);

// ---------- Foto van je team ----------
// We bouwen even een nette "teamfoto" (kop + veld + voet) bovenop de pagina; de app maakt daar
// een screenshot van en zet die als PNG in je Downloads-map.
async function teamPhoto() {
  const btn = $('#ut-photo-btn');
  const msg = $('#ut-photo-msg');
  btn.disabled = true;
  msg.textContent = 'Foto maken…';
  const naam = ($('#hello').textContent.match(/Hoi (.+?)!/) || [])[1];
  const photo = document.createElement('div');
  photo.id = 'ut-photo';
  photo.innerHTML = `
    <div class="utp-head">
      <span class="fc-logo">FC</span>
      <div class="utp-title"><b>${naam ? `Ultimate Team van ${esc(naam)}` : 'Mijn Ultimate Team'}</b>
        <span>${new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
      <div class="utp-stats">
        <div><span>Rating</span><b>${esc($('#ut-ovr').textContent)}</b></div>
        <div><span>Chemie</span><b>${esc($('#ut-chem').textContent)}</b></div>
        <div><span>Spelers</span><b>${esc($('#ut-count').textContent)}</b></div>
      </div>
    </div>
    <div class="utp-foot">Gemaakt met Mijn Somtoday</div>`;
  const pitch = $('#ut .ut-pitch').cloneNode(true);
  pitch.querySelectorAll('.ut-remove').forEach((el) => el.remove());
  pitch.querySelectorAll('.selected').forEach((el) => el.classList.remove('selected'));
  photo.insertBefore(pitch, photo.querySelector('.utp-foot'));
  photo.style.top = `${window.scrollY}px`;
  document.body.appendChild(photo);
  // Posities en kleuren opnieuw zetten in de kopie (inline styles mogen niet via HTML).
  photo.querySelectorAll('.ut-slot').forEach((el) => {
    el.style.left = el.dataset.x + '%';
    el.style.top = el.dataset.y + '%';
  });
  paintCards(photo);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 150));
  const rect = photo.getBoundingClientRect();
  try {
    const res = await api('/api/team-photo', {
      x: rect.left + window.scrollX, y: rect.top + window.scrollY, width: rect.width, height: rect.height,
    });
    msg.textContent = `Opgeslagen in je Downloads-map: ${res.naam}`;
    document.body.classList.add('flash');
    setTimeout(() => document.body.classList.remove('flash'), 400);
  } catch (err) {
    msg.textContent = err.message;
  } finally {
    photo.remove();
    btn.disabled = false;
  }
}
$('#ut-photo-btn').addEventListener('click', teamPhoto);
$('#ut-clear').addEventListener('click', () => { team = {}; selectedSlot = null; saveTeam(); renderTeam(); });

window.renderTeam = renderTeam;

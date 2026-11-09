// ---------- Spelersdatabase voor Somtoday Ultimate Team ----------
// Echte voetballers met (ongeveer) hun FC-rating, club, land en competitie. BN'ers staan onder de voetballers:
// zij horen bij lage cijfers. Formaat: 'naam|positie|rating|land|club' en optioneel '|huid,kapsel,haarkleur,baard'.
// Huid 0-5 (licht → donker: 5, 0, 1, 2, 3, 4), haarkleur 0 bruin, 1 donkerbruin, 2 rood/koper, 3 blond, 4 zwart, 5 grijs.

function hashOf(s) {
  let h = 2166136261;
  for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

const CLUBS = {
  MCI: ['Manchester City', 'ENG', '#6cabdd', '#1c2c5b'], LIV: ['Liverpool', 'ENG', '#c8102e', '#00b2a9'], ARS: ['Arsenal', 'ENG', '#ef0107', '#ffffff'],
  CHE: ['Chelsea', 'ENG', '#034694', '#ffffff'], MUN: ['Manchester United', 'ENG', '#da291c', '#fbe122'], TOT: ['Tottenham', 'ENG', '#f4f4f4', '#132257'],
  NEW: ['Newcastle', 'ENG', '#241f20', '#ffffff'], AVL: ['Aston Villa', 'ENG', '#670e36', '#95bfe5'], BHA: ['Brighton', 'ENG', '#0057b8', '#ffffff'],
  WHU: ['West Ham', 'ENG', '#7a263a', '#1bb1e7'], BOU: ['Bournemouth', 'ENG', '#da291c', '#000000'], NFO: ['Nottingham Forest', 'ENG', '#dd0000', '#ffffff'],
  RMA: ['Real Madrid', 'ESP', '#f4f4f4', '#febe10'], BAR: ['FC Barcelona', 'ESP', '#a50044', '#004d98'], ATM: ['Atlético Madrid', 'ESP', '#cb3524', '#ffffff'],
  GIR: ['Girona', 'ESP', '#e30613', '#ffffff'], RSO: ['Real Sociedad', 'ESP', '#0067b1', '#ffffff'], ATH: ['Athletic Club', 'ESP', '#ee2523', '#ffffff'],
  BAY: ['Bayern München', 'GER', '#dc052d', '#ffffff'], BVB: ['Borussia Dortmund', 'GER', '#fde100', '#000000'], B04: ['Bayer Leverkusen', 'GER', '#e32221', '#000000'],
  RBL: ['RB Leipzig', 'GER', '#f4f4f4', '#dd0741'], VFB: ['VfB Stuttgart', 'GER', '#f4f4f4', '#e32219'], WOB: ['VfL Wolfsburg', 'GER', '#65b32e', '#ffffff'],
  PSG: ['Paris Saint-Germain', 'FRA', '#004170', '#da291c'], OM: ['Olympique Marseille', 'FRA', '#2faee0', '#ffffff'], OL: ['Olympique Lyon', 'FRA', '#f4f4f4', '#14387f'],
  MON: ['AS Monaco', 'FRA', '#e51b22', '#ffffff'], LIL: ['Lille', 'FRA', '#e01e13', '#20325f'],
  INT: ['Inter', 'ITA', '#0068a8', '#000000'], MIL: ['AC Milan', 'ITA', '#fb090b', '#000000'], JUV: ['Juventus', 'ITA', '#f4f4f4', '#000000'],
  NAP: ['Napoli', 'ITA', '#12a0d7', '#ffffff'], ATA: ['Atalanta', 'ITA', '#1e71b8', '#000000'], ROM: ['AS Roma', 'ITA', '#8e1f2f', '#f0bc42'], BOL: ['Bologna', 'ITA', '#a21c26', '#1a2f48'],
  AJA: ['Ajax', 'NED', '#d2122e', '#ffffff'], PSV: ['PSV', 'NED', '#ed1c24', '#ffffff'], FEY: ['Feyenoord', 'NED', '#e3000b', '#ffffff'],
  AZ: ['AZ', 'NED', '#e30613', '#ffffff'], TWE: ['FC Twente', 'NED', '#e2001a', '#ffffff'], UTR: ['FC Utrecht', 'NED', '#e30613', '#ffffff'],
  BEN: ['Benfica', 'POR', '#e83030', '#ffffff'], SCP: ['Sporting', 'POR', '#008057', '#ffffff'], POR: ['FC Porto', 'POR', '#1c3f94', '#ffffff'],
  GAL: ['Galatasaray', 'TUR', '#a32638', '#fdb912'], FEN: ['Fenerbahçe', 'TUR', '#001d6c', '#ffed00'],
  NEC: ['NEC', 'NED', '#e3001b', '#00953b'], COR: ['Corinthians', 'BRA', '#f4f4f4', '#111111'], ETT: ['Al Ettifaq', 'KSA', '#00843d', '#e30613'],
  NAS: ['Al Nassr', 'KSA', '#fbe122', '#1e3a8a'], HIL: ['Al Hilal', 'KSA', '#0047ab', '#ffffff'], ITT: ['Al Ittihad', 'KSA', '#f6d10a', '#000000'],
  MIA: ['Inter Miami', 'USA', '#f7b5cd', '#231f20'], LAG: ['LA Galaxy', 'USA', '#00245d', '#ffd200'],
  ICON: ['Iconen', 'ICN', '#e9e4d6', '#b08d3c'], BN: ['Bekende Nederlanders', 'BNL', '#f36c21', '#1e3a8a'],
};
const LEAGUES = { ENG: 'Premier League', ESP: 'LALIGA', GER: 'Bundesliga', FRA: 'Ligue 1', ITA: 'Serie A', NED: 'Eredivisie', POR: 'Liga Portugal', TUR: 'Süper Lig', KSA: 'Saudi Pro League', USA: 'MLS', BRA: 'Brasileirão', ICN: 'Iconen', BNL: "BN'ers" };
const NATIONS = {
  NED: 'Nederland', BEL: 'België', FRA: 'Frankrijk', ENG: 'Engeland', ESP: 'Spanje', GER: 'Duitsland', POR: 'Portugal', ITA: 'Italië', BRA: 'Brazilië',
  ARG: 'Argentinië', NOR: 'Noorwegen', EGY: 'Egypte', POL: 'Polen', CRO: 'Kroatië', URU: 'Uruguay', KOR: 'Zuid-Korea', JPN: 'Japan', MAR: 'Marokko',
  SEN: 'Senegal', NGA: 'Nigeria', GEO: 'Georgië', SWE: 'Zweden', DEN: 'Denemarken', SUI: 'Zwitserland', AUT: 'Oostenrijk', USA: 'Verenigde Staten',
  CAN: 'Canada', COL: 'Colombia', TUR: 'Turkije', SVN: 'Slovenië', SCO: 'Schotland', GHA: 'Ghana', CIV: 'Ivoorkust', SRB: 'Servië', HUN: 'Hongarije', ECU: 'Ecuador',
};

const PLAYER_DB = [
  // ---- Wereldsterren ----
  'Kylian Mbappé|ST|91|FRA|RMA|3,buzz,4,', 'Erling Haaland|ST|91|NOR|MCI|5,knotm,3,', 'Mohamed Salah|RW|91|EGY|LIV|2,krul,4,baard',
  'Rodri|CM|90|ESP|MCI|0,kort,1,stoppels', 'Jude Bellingham|CAM|90|ENG|RMA|3,buzz,4,', 'Virgil van Dijk|CB|90|NED|LIV|3,fade,4,baard',
  'Vinícius Júnior|LW|90|BRA|RMA|3,krul,4,', 'Ousmane Dembélé|RW|90|FRA|PSG|3,kort,4,baard', 'Harry Kane|ST|89|ENG|BAY|5,kort,0,',
  'Kevin De Bruyne|CAM|89|BEL|NAP|5,kort,2,', 'Lamine Yamal|RW|89|ESP|BAR|2,krul,4,', 'Raphinha|LW|89|BRA|BAR|1,fade,4,',
  'Thibaut Courtois|GK|89|BEL|RMA|5,kort,0,', 'Federico Valverde|CM|89|URU|RMA|0,kort,1,baard', 'Achraf Hakimi|RB|89|MAR|PSG|2,kort,4,',
  'Pedri|CM|88|ESP|BAR|0,kort,4,', 'Alisson|GK|89|BRA|LIV|0,kort,1,baard', 'Gianluigi Donnarumma|GK|89|ITA|PSG|0,kort,4,stoppels',
  'Bukayo Saka|RW|88|ENG|ARS|3,kort,4,', 'Martin Ødegaard|CAM|87|NOR|ARS|5,kort,0,', 'Lautaro Martínez|ST|88|ARG|INT|1,kort,4,baard',
  'Jamal Musiala|CAM|87|GER|BAY|2,kort,4,', 'Florian Wirtz|CAM|87|GER|LIV|5,kort,0,', 'Declan Rice|CM|87|ENG|ARS|0,kort,1,',
  'Joshua Kimmich|CM|87|GER|BAY|5,kort,0,', 'Robert Lewandowski|ST|87|POL|BAR|0,kort,1,', 'William Saliba|CB|87|FRA|ARS|3,kort,4,',
  'Rúben Dias|CB|87|POR|MCI|0,kort,4,baard', 'Marquinhos|CB|86|BRA|PSG|0,kort,4,stoppels', 'Antonio Rüdiger|CB|87|GER|RMA|3,kaal,4,baard',
  'Bernardo Silva|CM|87|POR|MCI|0,kort,4,baard', 'Bruno Fernandes|CAM|87|POR|MUN|0,kort,4,stoppels', 'Phil Foden|CAM|86|ENG|MCI|5,kort,0,',
  'Cristiano Ronaldo|ST|86|POR|NAS|1,gel,4,', 'Lionel Messi|RW|86|ARG|MIA|0,medium,1,baard', 'Son Heung-min|LW|86|KOR|LAG|0,kort,4,',
  'Khvicha Kvaratskhelia|LW|87|GEO|PSG|5,krul,0,', 'Victor Osimhen|ST|87|NGA|GAL|3,kort,3,', 'Alexander Isak|ST|87|SWE|LIV|3,fade,4,',
  'Nicolò Barella|CM|86|ITA|INT|0,kort,4,baard', 'Alessandro Bastoni|CB|86|ITA|INT|0,kort,1,', 'Mike Maignan|GK|87|FRA|MIL|3,kaal,4,baard',
  'Marc-André ter Stegen|GK|86|GER|BAR|5,kort,0,', 'Jan Oblak|GK|87|SVN|ATM|0,kort,1,baard', 'Antoine Griezmann|ST|86|FRA|ATM|5,kort,3,',
  'Cole Palmer|CAM|87|ENG|CHE|5,kort,2,', 'Vitinha|CM|87|POR|PSG|0,kort,4,stoppels', 'Ederson|GK|86|BRA|FEN|1,kaal,4,baard',
  'Luka Modrić|CM|85|CRO|MIL|5,lang,3,', 'Kai Havertz|ST|84|GER|ARS|5,kort,0,', 'Gabriel Magalhães|CB|86|BRA|ARS|0,kort,4,baard',
  'Alexis Mac Allister|CM|86|ARG|LIV|5,kort,2,', 'Dominik Szoboszlai|CAM|84|HUN|LIV|5,kort,3,', 'Trent Alexander-Arnold|RB|86|ENG|RMA|1,kort,4,',
  'Theo Hernández|LB|85|FRA|HIL|0,kort,1,baard', 'Alphonso Davies|LB|84|CAN|BAY|3,kort,4,', 'João Neves|CM|86|POR|PSG|0,krul,1,',
  'Nuno Mendes|LB|86|POR|PSG|3,kort,4,', 'Michael Olise|RW|86|FRA|BAY|3,kort,4,', 'Désiré Doué|RW|83|FRA|PSG|3,kort,4,',
  'Viktor Gyökeres|ST|85|SWE|ARS|0,kort,1,baard', 'Julián Álvarez|ST|86|ARG|ATM|5,kort,1,', 'Nico Williams|LW|84|ESP|ATH|3,kort,4,',
  'Dani Olmo|CAM|84|ESP|BAR|0,kort,1,', 'Frenkie de Jong|CM|86|NED|BAR|0,medium,1,stoppels', 'Rafael Leão|LW|85|POR|MIL|3,kort,4,',
  'Kenan Yıldız|LW|83|TUR|JUV|0,kort,4,', 'Dušan Vlahović|ST|82|SRB|JUV|0,kort,4,', 'Paulo Dybala|CAM|83|ARG|ROM|0,kort,1,baard',
  'Karim Benzema|ST|85|FRA|ITT|1,kaal,4,baard', 'Neymar Jr|LW|84|BRA|HIL|1,fade,3,baard', 'Ivan Toney|ST|83|ENG|ITT|3,fade,4,baard',
  'Jeremie Frimpong|RB|84|NED|LIV|3,kort,4,', 'Granit Xhaka|CM|84|SUI|NEW|0,kort,4,baard', 'Bruno Guimarães|CM|85|BRA|NEW|1,kort,4,baard',
  'Ollie Watkins|ST|84|ENG|AVL|3,kort,4,', 'Emiliano Martínez|GK|86|ARG|AVL|0,kort,4,baard', 'Morgan Rogers|CAM|80|ENG|AVL|3,kort,4,',
  'Anthony Gordon|LW|83|ENG|NEW|5,kort,0,', 'Marcus Rashford|LW|82|ENG|BAR|3,kort,4,', 'Jack Grealish|LW|81|ENG|MUN|5,medium,1,baard',
  'Rasmus Højlund|ST|79|DEN|NAP|5,kort,3,', 'Benjamin Šeško|ST|80|SVN|MUN|5,kort,0,', 'Kaoru Mitoma|LW|82|JPN|BHA|0,kort,4,',
  'Takefusa Kubo|RW|81|JPN|RSO|0,kort,4,', 'Ademola Lookman|LW|84|NGA|ATA|3,kort,4,', 'Hakan Çalhanoğlu|CM|86|TUR|INT|0,kort,4,baard',
  'Marcus Thuram|ST|85|FRA|INT|3,kort,4,', 'Bradley Barcola|LW|83|FRA|PSG|3,kort,4,', 'Warren Zaïre-Emery|CM|81|FRA|PSG|3,kort,4,',
  'Mason Greenwood|RW|82|ENG|OM|3,kort,4,baard', 'Rayan Cherki|CAM|81|FRA|MCI|1,krul,4,', 'Joško Gvardiol|CB|86|CRO|MCI|5,kort,0,',
  'Moisés Caicedo|CM|86|ECU|CHE|3,kort,4,', 'Enzo Fernández|CM|84|ARG|CHE|0,kort,1,', 'Reece James|RB|83|ENG|CHE|3,kort,4,',
  'Noni Madueke|RW|79|ENG|ARS|3,kort,4,', 'Eberechi Eze|CAM|83|ENG|ARS|3,kort,4,', 'Gabriel Martinelli|LW|82|BRA|ARS|1,kort,4,',
  'Leroy Sané|RW|84|GER|GAL|3,kort,4,baard', 'Serhou Guirassy|ST|84|GUI|BVB|3,kaal,4,baard', 'Gregor Kobel|GK|85|SUI|BVB|5,kort,3,',
  'Xabi Simons|CAM|82|NED|TOT|1,krullang,0,', 'Micky van de Ven|CB|84|NED|TOT|5,kort,3,', 'James Maddison|CAM|82|ENG|TOT|0,kort,1,',
  'Bryan Mbeumo|RW|83|CMR|MUN|3,kort,4,', 'Matheus Cunha|CAM|82|BRA|MUN|1,krul,4,', 'Amad Diallo|RW|80|CIV|MUN|3,kort,4,',
  'Kenneth Taylor|CM|78|NED|AJA|3,kort,4,', 'Jorrel Hato|LB|80|NED|CHE|3,kort,4,', 'Jobe Bellingham|CM|78|ENG|BVB|5,kort,1,',
  'Arda Güler|CAM|81|TUR|RMA|0,kort,4,', 'Endrick|ST|78|BRA|RMA|3,kort,4,', 'Aurélien Tchouaméni|CM|85|FRA|RMA|3,kaal,4,',
  'Eduardo Camavinga|CM|83|FRA|RMA|3,dreads,4,', 'Dean Huijsen|CB|82|ESP|RMA|5,kort,1,', 'Pau Cubarsí|CB|83|ESP|BAR|0,kort,4,',
  'Gavi|CM|82|ESP|BAR|0,kort,4,', 'Ronald Araújo|CB|84|URU|BAR|1,kort,4,', 'Fermín López|CAM|80|ESP|BAR|0,kort,1,',
  'Mikel Merino|CM|83|ESP|ARS|0,kort,1,baard', 'Martín Zubimendi|CM|84|ESP|ARS|0,kort,4,', 'David Raya|GK|86|ESP|ARS|0,kort,4,baard',
  'Riccardo Calafiori|LB|81|ITA|ARS|0,kort,1,baard', 'Ibrahima Konaté|CB|84|FRA|LIV|3,kort,4,', 'Ryan Gravenberch|CM|84|NED|LIV|3,kort,4,',
  'Cody Gakpo|LW|84|NED|LIV|3,kort,4,stoppels', 'Hugo Ekitiké|ST|82|FRA|LIV|3,kort,4,', 'Andrew Robertson|LB|83|SCO|LIV|5,kort,2,',
  // ---- Oranje en Eredivisie ----
  'Tijjani Reijnders|CM|84|NED|MCI|1,kort,4,baard', 'Matthijs de Ligt|CB|82|NED|MUN|5,kort,3,', 'Nathan Aké|CB|82|NED|MCI|3,kort,4,',
  'Denzel Dumfries|RB|84|NED|INT|3,fade,4,baard', 'Stefan de Vrij|CB|82|NED|INT|0,kort,1,', 'Memphis Depay|ST|80|NED|COR|3,fade,4,baard',
  'Bart Verbruggen|GK|80|NED|BHA|5,kort,1,', 'Donyell Malen|ST|80|NED|AVL|3,fade,4,', 'Teun Koopmeiners|CM|81|NED|JUV|5,kort,3,',
  'Jurriën Timber|RB|83|NED|ARS|3,fade,4,', 'Brian Brobbey|ST|78|NED|AJA|3,kort,4,', 'Joshua Zirkzee|ST|77|NED|MUN|3,dreads,4,',
  'Wout Weghorst|ST|74|NED|AJA|0,kort,1,baard', 'Lutsharel Geertruida|CB|76|NED|RBL|3,kort,4,', 'Quinten Timber|CM|80|NED|OM|3,fade,4,',
  'Mats Wieffer|CM|77|NED|BHA|5,kort,3,', 'Jerdy Schouten|CM|79|NED|PSV|0,kort,1,', 'Ian Maatsen|LB|78|NED|AVL|3,fade,4,',
  'Noa Lang|LW|79|NED|NAP|1,fade,4,', 'Steven Bergwijn|RW|76|NED|ITT|3,kort,4,', 'Sven Botman|CB|79|NED|NEW|5,kort,3,',
  'Justin Kluivert|LW|79|NED|BOU|3,kort,4,', 'Crysencio Summerville|LW|77|NED|WHU|3,kort,4,', 'Emmanuel Emegha|ST|73|NED|NEW|3,kort,4,',
  'Luuk de Jong|ST|76|NED|PSV|0,kort,1,baard', 'Ivan Perišić|LW|78|CRO|PSV|5,kort,1,', 'Guus Til|CAM|76|NED|PSV|5,kort,3,',
  'Ricardo Pepi|ST|74|USA|PSV|3,kort,4,', 'Ismael Saibari|CAM|78|MAR|PSV|1,kort,4,', 'Mauro Júnior|LB|74|BRA|PSV|1,kort,4,',
  'Sem Steijn|CAM|75|NED|FEY|5,kort,3,', 'Anis Hadj Moussa|RW|76|ALG|FEY|1,kort,4,', 'Ayase Ueda|ST|75|JPN|FEY|0,kort,4,',
  'Timon Wellenreuther|GK|75|GER|FEY|5,kort,1,', 'Gernot Trauner|CB|76|AUT|FEY|5,kort,1,baard', 'Davy Klaassen|CAM|73|NED|AJA|0,kort,1,baard', 'Youri Baas|CB|75|NED|AJA|5,kort,1,', 'Mika Godts|LW|76|BEL|AJA|5,kort,3,',
  'Josip Šutalo|CB|76|CRO|AJA|0,kort,1,', 'Remko Pasveer|GK|73|NED|AJA|5,kaal,3,', 'Steven Berghuis|RW|75|NED|AJA|0,kort,1,baard',
  'Troy Parrott|ST|74|IRL|AZ|5,kort,1,', 'Sven Mijnans|CAM|74|NED|AZ|5,kort,3,', 'Peer Koopmeiners|CM|72|NED|AZ|5,kort,3,',
  'Rome-Jayden Owusu-Oduro|GK|72|NED|AZ|3,kort,4,', 'Michel Vlap|CAM|71|NED|TWE|5,kort,3,', 'Ricky van Wolfswinkel|ST|69|NED|TWE|5,kort,3,baard', 'Victor Jensen|CAM|70|DEN|UTR|5,kort,3,', 'Mike van der Hoorn|CB|70|NED|UTR|5,kort,3,',
  'Jasper Cillessen|GK|72|NED|NEC|5,kort,3,stoppels', 'Marten de Roon|CM|78|NED|ATA|0,kort,1,baard', 'Daley Blind|LB|75|NED|GIR|5,kort,3,',
  'Georginio Wijnaldum|CM|74|NED|ETT|3,fade,4,baard', 'Calvin Stengs|CAM|74|NED|FEY|3,kort,4,',
  'Mark Flekken|GK|78|NED|B04|0,kort,1,', 'Justin Bijlow|GK|74|NED|FEY|5,kort,1,', 'Kenny Tete|RB|74|NED|NFO|3,kort,4,',
  'Joey Veerman|CM|77|NED|PSV|5,kort,3,', 'Thom van Bergen|LW|66|NED|TWE|5,kort,3,',
  'Kees Smit|CM|72|NED|AZ|5,kort,3,', 'Wouter Goes|CB|71|NED|AZ|5,kort,3,', 'Mexx Meerdink|ST|67|NED|AZ|5,kort,3,',
  'Ernest Poku|LW|72|NED|AZ|3,kort,4,', 'Jordy Clasie|CM|69|NED|AZ|0,kort,1,', 'Mees Hilgers|CB|74|NED|TWE|5,kort,3,',
  'Sam Lammers|ST|69|NED|TWE|5,kort,3,', 'Bart van Rooij|RB|68|NED|TWE|5,kort,3,', 'Lars Unnerstall|GK|70|GER|TWE|5,kort,3,',
  'Koki Ogawa|ST|70|JPN|NEC|0,kort,4,', 'Dirk Proper|CM|70|NED|NEC|5,kort,3,', 'Bryan Linssen|LW|66|NED|NEC|0,kort,1,baard',
  'Lasse Schöne|CM|63|DEN|NEC|5,kort,3,', 'Philippe Sandler|CB|65|NED|NEC|5,kort,1,', 'Tygo Land|CM|64|NED|PSV|5,kort,3,',
  'Ruben van Bommel|LW|72|NED|PSV|5,kort,3,', 'Couhaib Driouech|RW|74|NED|PSV|1,kort,4,', 'Paul Wanner|CAM|73|GER|PSV|5,kort,3,',
  'Givairo Read|RB|72|NED|FEY|3,kort,4,', 'Hugo Bueno|LB|72|ESP|FEY|0,kort,4,', 'Oussama Targhalline|CM|73|MAR|FEY|1,kort,4,',
  'Gjivai Zechiël|CM|68|NED|UTR|3,kort,4,', 'Paxten Aaronson|CAM|70|USA|UTR|5,kort,0,', 'Sébastien Haller|ST|72|CIV|UTR|3,kort,4,baard',
  'Yoann Cathline|LW|70|FRA|UTR|3,kort,4,', 'Vasilios Barkas|GK|72|GRE|UTR|0,kort,4,baard', 'Siebe Horemans|RB|67|BEL|UTR|5,kort,3,',
  'Jeffrey Bruma|CB|62|NED|NEC|3,kort,4,', 'Kenneth Paal|LB|63|SUR|NEC|3,kort,4,', 'Nick Olij|GK|64|NED|NEC|5,kort,3,',
  'Jizz Hornkamp|ST|64|NED|UTR|5,kort,3,', 'Anass Salah-Eddine|LB|70|NED|PSV|1,kort,4,', 'Silvano Vos|CM|66|NED|AJA|3,kort,4,',
  // ---- Vrouwen (Oranje en wereld) ----
  'Vivianne Miedema|ST|85|NED|MCI|5,knot,2,', 'Lieke Martens|LW|83|NED|AJA|5,staart,3,', 'Jill Roord|CAM|81|NED|MCI|5,staart,2,',
  'Daphne van Domselaar|GK|81|NED|ARS|5,staart,3,', 'Danielle van de Donk|CM|83|NED|OL|5,knot,3,', 'Victoria Pelova|CAM|79|NED|ARS|5,staart,3,',
  'Esmee Brugts|LW|79|NED|BAR|5,staart,3,', 'Lineth Beerensteyn|ST|80|NED|WOB|3,staart,4,', 'Dominique Janssen|CB|80|NED|MUN|5,staart,3,',
  'Sherida Spitse|CM|78|NED|AJA|0,staart,1,', 'Aitana Bonmatí|CM|91|ESP|BAR|0,staart,1,', 'Alexia Putellas|CAM|88|ESP|BAR|0,staart,1,',
  'Sam Kerr|ST|86|AUS|CHE|0,staart,1,', 'Lauren James|RW|85|ENG|CHE|3,staart,4,', 'Alessia Russo|ST|86|ENG|ARS|5,staart,0,',
  // ---- Iconen (legendes) ----
  'Johan Cruijff|CAM|94|NED|ICON|0,medium,1,', 'Marco van Basten|ST|93|NED|ICON|0,kuif,1,', 'Ruud Gullit|CM|92|NED|ICON|3,dreads,4,snor',
  'Dennis Bergkamp|CAM|91|NED|ICON|0,kort,3,', 'Frank Rijkaard|CB|90|NED|ICON|3,krul,4,', 'Edwin van der Sar|GK|89|NED|ICON|0,kaal,5,',
  'Arjen Robben|RW|90|NED|ICON|0,kaal,1,', 'Robin van Persie|ST|89|NED|ICON|0,kort,0,stoppels', 'Clarence Seedorf|CM|89|NED|ICON|3,kaal,4,',
  'Patrick Kluivert|ST|88|NED|ICON|3,kort,4,', 'Edgar Davids|CM|88|NED|ICON|3,dreads,4,', 'Ruud van Nistelrooy|ST|88|NED|ICON|0,kort,0,',
  'Wesley Sneijder|CAM|88|NED|ICON|0,kort,0,stoppels', 'Ronald Koeman|CB|88|NED|ICON|5,kuif,3,', 'Jaap Stam|CB|88|NED|ICON|0,kaal,1,',
  'Zinédine Zidane|CAM|94|FRA|ICON|1,kaal,4,', 'Ronaldinho|CAM|93|BRA|ICON|3,lang,4,', 'Thierry Henry|ST|93|FRA|ICON|3,kaal,4,',
  'Ronaldo Nazário|ST|95|BRA|ICON|1,kaal,4,', 'Paolo Maldini|CB|93|ITA|ICON|0,medium,1,', 'David Beckham|RM|88|ENG|ICON|5,kort,3,',
  'Kaká|CAM|91|BRA|ICON|0,kort,1,', 'Andrea Pirlo|CM|91|ITA|ICON|0,lang,1,baard', 'Wayne Rooney|ST|89|ENG|ICON|5,kort,1,',
  // ---- BN'ers (lage cijfers): altijd lager dan de voetballers ----
  'André Hazes|ST|58|NED|BN|0,kort,1,baard', 'Jan Smit|CM|55|NED|BN|5,kort,3,', 'Gordon|CB|44|NED|BN|0,kort,1,',
  'Gerard Joling|RW|46|NED|BN|0,kuif,5,', 'Linda de Mol|LW|47|NED|BN|5,lang,3,', 'Snelle|ST|57|NED|BN|5,kort,2,',
  'Davina Michelle|CM|52|NED|BN|0,lang,1,', 'Duncan Laurence|CAM|48|NED|BN|5,kort,1,', 'Emma Heesters|RW|50|NED|BN|5,lang,1,',
  'Ronnie Flex|ST|53|NED|BN|3,kort,4,', 'Kwebbelkop|ST|49|NED|BN|0,kort,3,', 'Monica Geuze|LB|45|NED|BN|5,lang,3,',
  'Bram Krikke|CM|51|NED|BN|0,kuif,1,baard', 'Joost Klein|LW|54|NED|BN|0,medium,3,snor', 'NikkieTutorials|CAM|43|NED|BN|5,lang,3,',
  'Kalvijn|RW|59|NED|BN|0,krul,0,stoppels', 'Dylan Haegens|LW|52|NED|BN|0,kuif,0,baard', 'Milan Knol|RB|47|NED|BN|5,kort,3,',
  'Enzo Knol|ST|50|NED|BN|5,kuif,3,', 'Martin Garrix|CAM|56|NED|BN|5,kort,1,', 'Tiësto|CM|53|NED|BN|0,kort,1,stoppels',
  'Armin van Buuren|CB|49|NED|BN|5,kort,3,', 'Hardwell|RW|51|NED|BN|0,kort,0,baard', 'Max Verstappen|ST|64|NED|BN|5,kort,1,stoppels',
  'Femke Bol|RB|63|NED|BN|5,staart,3,', 'Sifan Hassan|LW|63|NED|BN|3,knot,4,', 'Dafne Schippers|RW|61|NED|BN|5,staart,3,',
  'Sven Kramer|LB|60|NED|BN|5,kort,3,', 'Ireen Wüst|CM|60|NED|BN|5,staart,1,', 'Mathieu van der Poel|RW|62|NED|BN|5,kort,1,',
  'Jutta Leerdam|LW|58|NED|BN|5,lang,1,', 'Pieter van den Hoogenband|ST|57|NED|BN|5,kort,3,', 'Michael van Gerwen|ST|55|NED|BN|0,kaal,1,',
  'Raymond van Barneveld|CB|50|NED|BN|0,kort,1,', 'Chantal Janzen|CM|46|NED|BN|5,lang,3,', 'Humberto Tan|RB|48|NED|BN|3,kort,4,stoppels',
  'Johnny de Mol|ST|52|NED|BN|0,kort,1,baard', 'Frans Bauer|CB|42|NED|BN|0,kort,1,', 'Rob Kemps|CAM|47|NED|BN|0,kort,1,baard',
  'Epke Zonderland|CAM|59|NED|BN|5,kort,1,', 'Kjeld Nuis|CB|58|NED|BN|5,kort,3,', 'Tom Dumoulin|CM|57|NED|BN|5,kort,1,',
];

// Een paar spelers krijgen hun echte shirt in plaats van dat van hun club (bijv. landenteam bij iconen).
const KIT_OVERRIDE = { ICON: { NED: ['#f36c21', '#ffffff'], FRA: ['#1e3a8a', '#ffffff'], BRA: ['#f7d417', '#0b8a3e'], ITA: ['#1f5fbf', '#ffffff'], ENG: ['#f4f4f4', '#1e3a8a'] } };

function parseDbPlayer(line) {
  const [naam, pos0, r, nat, club, looks] = line.split('|');
  const pos = pos0 === 'RM' ? 'RW' : pos0;
  const h = hashOf(naam);
  const vrouw = /,(staart|knot|lang)\b/.test(looks || '') && !/^(Pedri|Luka Modrić|Ronaldinho|Andrea Pirlo)$/.test(naam);
  const p = {
    naam: naam.replace(/ II$/, ''), key: naam, pos, base: +r, nat, club, liga: CLUBS[club]?.[1] || 'ICN', man: !vrouw,
    skin: h % 6, hair: ['kort', 'fade', 'kuif', 'krul', 'kaal'][(h >>> 3) % 5], hc: (h >>> 7) % 5, eyes: (h >>> 10) % 3, beard: '',
  };
  if (looks) {
    const [skin, hair, hc, beard] = looks.split(',');
    Object.assign(p, { skin: +skin, hair, hc: +hc, beard: beard || '' });
  }
  const c = CLUBS[club] || CLUBS.ICON;
  p.kit = KIT_OVERRIDE[club]?.[nat] || (club === 'BN' ? ['#f36c21', '#1e3a8a'] : [c[2], c[3]]);
  return p;
}
const DB = PLAYER_DB.map(parseDbPlayer);
const BY_NAME = new Map(DB.map((p) => [p.key, p]));
const FOOTBALLERS = DB.filter((p) => p.club !== 'BN').sort((a, b) => a.base - b.base);
const CELEBS = DB.filter((p) => p.club === 'BN').sort((a, b) => a.base - b.base);

// Cijfer → rating waar we een speler bij zoeken. Onder de 4: BN'ers (40-58); vanaf 4: voetballers (62 → 91).
function targetRating(cijfer) {
  if (cijfer < 4) return Math.round(40 + (cijfer - 1) * 6);
  return Math.round(62 + (cijfer - 4) * 4.85);
}

// Kleine vlaggen als SVG (emoji-vlaggen werken niet op Windows).
const FLAG = {
  NED: ['h', '#ae1c28', '#ffffff', '#21468b'], BEL: ['v', '#000000', '#fdda24', '#ef3340'], FRA: ['v', '#0055a4', '#ffffff', '#ef4135'],
  GER: ['h', '#000000', '#dd0000', '#ffce00'], ITA: ['v', '#009246', '#ffffff', '#ce2b37'], ESP: ['h3', '#aa151b', '#f1bf00', '#aa151b'],
  ARG: ['h', '#74acdf', '#ffffff', '#74acdf'], NGA: ['v', '#008751', '#ffffff', '#008751'], CIV: ['v', '#f77f00', '#ffffff', '#009e60'],
  AUT: ['h', '#ed2939', '#ffffff', '#ed2939'], HUN: ['h', '#ce2939', '#ffffff', '#477050'], COL: ['h3', '#fcd116', '#003893', '#ce1126'],
  IRL: ['v', '#169b62', '#ffffff', '#ff883e'], GUI: ['v', '#ce1126', '#fcd116', '#009460'], CMR: ['v', '#007a5e', '#ce1126', '#fcd116'],
  EGY: ['h', '#ce1126', '#ffffff', '#000000'], POL: ['h2', '#ffffff', '#dc143c'], UKR: ['h2', '#0057b7', '#ffd700'],
  SRB: ['h', '#c6363c', '#0c4076', '#ffffff'], SVN: ['h', '#ffffff', '#005da4', '#ed1c24'], CRO: ['h', '#ff0000', '#ffffff', '#171796'],
  ECU: ['h3', '#ffdd00', '#034ea2', '#ed1c24'], GEO: ['cross', '#ffffff', '#ff0000'], ENG: ['cross', '#ffffff', '#ce1124'],
  SUI: ['plus', '#d52b1e', '#ffffff'], DEN: ['nordic', '#c8102e', '#ffffff'], SWE: ['nordic', '#006aa7', '#fecc00'], NOR: ['nordic', '#ba0c2f', '#ffffff', '#00205b'],
  POR: ['vv', '#046a38', '#da291c'], TUR: ['moon', '#e30a17', '#ffffff'], ALG: ['vv', '#006233', '#ffffff'],
  BRA: ['diamond', '#009c3b', '#ffdf00', '#002776'], JPN: ['dot', '#ffffff', '#bc002d'], KOR: ['dot', '#ffffff', '#cd2e3a'],
  MAR: ['dot', '#c1272d', '#006233'], SEN: ['v', '#00853f', '#fdef42', '#e31b23'], URU: ['h3', '#ffffff', '#0038a8', '#ffffff'],
  GRE: ['h3', '#0d5eaf', '#ffffff', '#0d5eaf'], SUR: ['h3', '#377e3f', '#b40a2d', '#377e3f'],
  USA: ['h3', '#b22234', '#ffffff', '#3c3b6e'], CAN: ['v', '#d80621', '#ffffff', '#d80621'], AUS: ['h2', '#012169', '#012169'], SCO: ['saltire', '#005eb8', '#ffffff'],
};
function flagSVG(nat) {
  const f = FLAG[nat] || ['h', '#888', '#bbb', '#888'];
  const [t, a, b, c] = f;
  const box = (inner) => `<svg viewBox="0 0 30 20" class="fc-flagsvg" aria-hidden="true">${inner}<rect width="30" height="20" fill="none" stroke="#000" stroke-opacity=".25"/></svg>`;
  if (t === 'h') return box(`<rect width="30" height="7" fill="${a}"/><rect y="6.6" width="30" height="7" fill="${b}"/><rect y="13.3" width="30" height="6.7" fill="${c}"/>`);
  if (t === 'h3') return box(`<rect width="30" height="20" fill="${a}"/><rect y="5" width="30" height="10" fill="${b}"/><rect y="15" width="30" height="5" fill="${c}"/>`);
  if (t === 'h2') return box(`<rect width="30" height="10" fill="${a}"/><rect y="10" width="30" height="10" fill="${b}"/>`);
  if (t === 'v') return box(`<rect width="10" height="20" fill="${a}"/><rect x="10" width="10" height="20" fill="${b}"/><rect x="20" width="10" height="20" fill="${c}"/>`);
  if (t === 'vv') return box(`<rect width="12" height="20" fill="${a}"/><rect x="12" width="18" height="20" fill="${b}"/>`);
  if (t === 'cross') return box(`<rect width="30" height="20" fill="${a}"/><rect x="12.5" width="5" height="20" fill="${b}"/><rect y="7.5" width="30" height="5" fill="${b}"/>`);
  if (t === 'plus') return box(`<rect width="30" height="20" fill="${a}"/><rect x="13" y="4" width="4" height="12" fill="${b}"/><rect x="9" y="8" width="12" height="4" fill="${b}"/>`);
  if (t === 'nordic') return box(`<rect width="30" height="20" fill="${a}"/><rect x="8" width="5" height="20" fill="${b}"/><rect y="7.5" width="30" height="5" fill="${b}"/>${c ? `<rect x="9.4" width="2.2" height="20" fill="${c}"/><rect y="8.9" width="30" height="2.2" fill="${c}"/>` : ''}`);
  if (t === 'moon') return box(`<rect width="30" height="20" fill="${a}"/><circle cx="12" cy="10" r="5" fill="${b}"/><circle cx="13.4" cy="10" r="4" fill="${a}"/>`);
  if (t === 'diamond') return box(`<rect width="30" height="20" fill="${a}"/><path d="M15 2 L28 10 L15 18 L2 10 Z" fill="${b}"/><circle cx="15" cy="10" r="4.2" fill="${c}"/>`);
  if (t === 'dot') return box(`<rect width="30" height="20" fill="${a}"/><circle cx="15" cy="10" r="5" fill="${b}"/>`);
  if (t === 'saltire') return box(`<rect width="30" height="20" fill="${a}"/><path d="M0 0 L30 20 M30 0 L0 20" stroke="${b}" stroke-width="3.5"/>`);
  return box(`<rect width="30" height="20" fill="${a}"/>`);
}
// Clublogo: een schildje in de clubkleuren met de afkorting.
function crestSVG(club) {
  const c = CLUBS[club] || CLUBS.ICON;
  const short = club === 'ICON' ? '★' : club === 'BN' ? 'BN' : club.slice(0, 3);
  return `<svg viewBox="0 0 24 28" class="fc-crest" aria-hidden="true"><path d="M12 1 L22 4 L22 13 C22 20 17 24.5 12 27 C7 24.5 2 20 2 13 L2 4 Z" fill="${c[2]}" stroke="${c[3]}" stroke-width="2"/><text x="12" y="17" font-size="${short.length > 2 ? 6.6 : 8}" font-weight="900" text-anchor="middle" fill="${c[3]}" font-family="Segoe UI, Arial, sans-serif">${short}</text></svg>`;
}

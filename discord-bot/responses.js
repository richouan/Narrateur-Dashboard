/**
 * responses.js — Authentic, balanced Moroccan Darija responses for Glorya
 *
 * Designed for a female target from her "soulmate/bestie" (Glorya).
 * The tone is *mostly normal* Best Friend energy (chill, conversational),
 * with *occasional* sweet pet names dropped in naturally (katkouta, my fav witch, bb, titiza, zyonat),
 * so it doesn't sound overwhelming or make her shy.
 *
 * Usage:
 *   import { pick, R } from './responses.js'
 *   await typingReply(message, pick(R.wech).replace('{ms}', ping))
 */

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const R = {
  // ─── AI Translation Fallback ───────────────────────────────────────────────
  aiUnknown: [
    'mafhmtch 3lik , 3awd lia bchwiya',
    'tlakhbatat lia lhdra shwiya, chno bghiti tgol bdebt?',
    'ana lost daba hhh, شرحها ليا بطريقة اخرى',
    'wa goultiha b tari9a khlatni 7ayara',
    'mafhemtch mzyan wach katswel wla gha katgol chi haja',
    '3awd lia b wa7d tari9a ashal bash nfhm',
    'brain dyali w9f hhh chno 9sdti?',
    'wa sra7a d3t f lhdra dyalk',
    '7ssit rassi fhmt w mn b3d la hhh',
    'chno bghiti twsel lia b had lhdra?',
    'wa 3awdha bchwiya rak tlkhabtni',
    'mafhemtch lfekra daba mzyan',
    'wach t9dr t9oliha b tari9a okhra?',
    'ana khassni restart bash nfhm hhh',
    'lhdra dkhlat w khrjat bla mafhm walo',
    'yemken ana li mafhemtch, 3awd lia',
    'w9fti lia system b had jumla hhh',
    'chno 9sdti bdebt daba?',
    'wach ghi ana li d3t hna?',
    '3afak goulha b tari9a basita chwya'
  ],

  aiError: [
    'wa chwya t9t3at lia lkhadma daba, jarrab mn b3d',
    'kayban lia connexion d3fat 3andi chwya',
    'sbr lia chwya, system dyali lag daba',
    'wa tfat lia rassi moment hhh, 3awd mn b3d',
    'kayna chwya d mochkil daba, ghadi trja3',
    'wa9fat lkhadma 3andi second bark',
    'connexion katl3b بيا daba',
    'brain dyali freeze chwya 😭',
    'sbr lia nfi9 rassi chwya',
    'wa daba t9t3at lhdra, jarrab tani',
    'kayban chi bug sghir w safi',
    'ghadi ntrja3 daba matkhafch',
    'system dyali t3ya chwya',
    'lag sghir bark w ghadi ydouz',
    'wa9fa 3andi chwya daba',
    'ma rdatch tkhddem daba, jarrab mn b3d',
    'kayna chwya d stress 3and system hhh',
    'ghadi nfi9 daba w nrja3',
    'connection makat3awnch daba',
    'second w nrja3 normal'
  ],

  // ─── Ping / alive check ──────────────────────────────────────────────────
  wech: [
    'hani hna daba, chno kayn? {ms}ms',
    'cc hani m3ak, kolchi labas {ms}ms',
    'wa ana online aslan hh, {ms}ms',
    'kat3ayet katl9ani hna 😌 {ms}ms',
    'hani tsennitk tgol chi haja {ms}ms',
    'yes yes ana hna, gol chno bghiti {ms}ms',
    'wa jit daba, wach gha tchekini? hh {ms}ms',
    'hani wakfa hdaak daba {ms}ms',
    'presence dyali khdama mzyan {ms}ms',
    'hani kansm3 lik, chno واقع؟ {ms}ms',

    'ma ghbitch 3lik btw {ms}ms',
    'ra ana hna mn 9bel mat3ayet {ms}ms',
    'hani daba w daba, gol {ms}ms',
    'wach kayn chi mochkil wla gha ping? {ms}ms',
    'hani m3ak zin, kolchi ok {ms}ms',
    'cc jit نشوف شنو بغيتي {ms}ms',
    'still alive hh {ms}ms',
    'hani 9riba lik daba {ms}ms',
    'ana hna gha 3la حسابك {ms}ms',
    'gol chno kayn rani ready {ms}ms',

    'wa matkhafch، ana hna {ms}ms',
    'hani kantb3k aslan {ms}ms',
    'kayban lia bghiti t2kdi belli hna hh {ms}ms',
    'finma t3ayet kanban {ms}ms',

    'ra ma kanmchich b3id 3lik 😌 {ms}ms',
    'hani daba m3ak، khlli 3lia {ms}ms',
    'dima hna ila 7tajti chi haja {ms}ms',
    'hani... ma nkhllikch t3ayet bla jawab {ms}ms'
  ],

  // ─── Status command ───────────────────────────────────────────────────────
  statusPrefix: [
    'hani mazal fay9a m3ak mn hadi {uptime} hh',
    'ra ba9a khdama hna mn hadi {uptime}, kolchi دايز مزيان',
    'daba ana online hadi {uptime} w mazal صابرة 😂',
    'mazal hna kansm3 lik mn hadi {uptime}',
    'ra ma t3yitch mn hadi {uptime} 😌',

    'sahrana hna m3ak hadi {uptime}',
    'ba9a wakfa 3la رجليها mn hadi {uptime}',
    'hani m3ak nonstop hadi {uptime}',
    'mazal ma طحتش الحمدلله، hadi {uptime}',
    'ana hna daba mn hadi {uptime} w jawi mzyan',

    'ra ba9a kanste7mel hadi {uptime} hh',
    'hani dayza waqt m3ak hadi {uptime}',
    'mazal khdama bla wa9fa hadi {uptime}',
    'ana w ntiya hna mn hadi {uptime}',
    'kolchi دايز hani hna hadi {uptime}',

    'mazal ma نعستش، hadi {uptime}',
    'ra ba9a m3ak daba w daba mn hadi {uptime}',
    'hani 9ada biha rassi hadi {uptime}',
    'uptime twel shwiya w mazal hna 😂',
    'ba9a mconcentrya m3ak hadi {uptime}'
  ],

  statusVcIn: [
    ' w mwansek f vocal {vc}',
    ' w rani mjm3a m3akoum f {vc}',
    ' w mkellssa f {vc}',
    ' w taba3k l vocal {vc}',
  ],
  statusVcOut: [
    ' walakin makhalyak trta7i mn les vocaux',
    ' w rani brra les vocaux daba',
    ' w manich f hta vocal bb',
  ],
  statusDbOk: [
    ' w koulchi mriguel f mongo',
    ' w database wa9fa 3la rejliha',
    ' w db dyalna chadda mzyan',
  ],
  statusDbNo: [
    ' w db mkhassra chwiya, kheddama gha b local',
    ' w mongo ta7, mais ghadyin b local files',
  ],
  statusPing: [
    ' w ping dyali {ms}ms.',
    ', m3a {ms}ms d ping a zyonat.',
  ],

  // ─── Settings show ────────────────────────────────────────────────────────
  settingsShow: [
    'hanta, choufi les options dyalek:',
    'ha kifash rani mrigla l bot:',
    'choufi chnou mtgad hna:',
    'ha settings li kheddama bihoum my fav witch:',
  ],

  // ─── Self React toggle ────────────────────────────────────────────────────
  selfReactOn: [
    'safi gha nbda nreagilek 3la hna w lhih',
    'ok bb, gha nbdaw ntfarjou f les reactions',
    'rani m3ak, gha n7lelik les emojis',
    'wa hani ch3elt les réactions a katkouta',
    'safi, 7llit les reactions bash nrwnou',
  ],
  selfReactOff: [
    'safi hani habbestha daba',
    'ok, tfit les reactions',
    'habbast les réactions',
    'safi gha nskt chwiya, bach trta7i my fav witch',
    'tfit les reactions',
  ],
  selfReactModeRandom: [
    'safi bb, gha nreagi bchi wa7d random mn pile d emotions dyalnna',
    'ok, rje3na l random reactions',
    'random mode mch3oul, khellini nkhyar 3la rahti',
  ],
  selfReactModeFixed: [
    'safi gha nb9a ndiir ghi {e} a katkouta',
    'ok bb, tlss9tlik {e} bwa7dha',
    'fixed mode ch3al, gha ntfarrj fik b {e}',
  ],
  selfReactModeFixedMissingEmoji: [
    'wa nsiti emoji a bb! 3tyni l emoji lli bghiti ntbba3 biwha',
    'khassk t3tini l emoji lli ntbbt, bhal: "selfreact mode fixed 🥺"',
  ],
  selfReactQuery: [
    'wa rani kanreagi bb',
    'la habbastha, mkhalyek trta7i',
    'reacs ch3lin 3la hsabk a katkouta',
    'hadi tfitha',
  ],

  // ─── Defend mode (Soulmate but chill) ───────────────────────────────────
  defend1: [
    'safi, ay wahed 9assk (b mention) gha nrd 3lih',
    'hani mdbbza m3ahoum, gha ytmentionnawki nhjjem',
    'ok bb, defend ch3al 3la weddek, nta9ol l mentions',
    'ta wahd ma ygoul smiytek bla idnek hani hna',
  ],
  defend2: [
    'safi, ay wahed jbdek (mention wla reply) gha nw9eflo f l9rjouTa',
    'rani 7ddiyatkoum full power, ta wahd may9ssebek a zyonat',
    'ok a ro7i, gha nrd 3lihom kamlin 3la hsabk',
    'hani mgablak f koulchi my fav witch, li dsser ghaylqani',
  ],
  defendOff: [
    'habbast ldfi3 psk kanchoufk 9adda bihom rassak',
    'safi tfit mode dfi3 a bb',
    'ok, rani habsa defense, tkelfi bihom ntiya',
    'defend mode off, walakin hani hdaak dima',
  ],
  defendQuery: [
    'defend on — mentions w replies (mode 2)',
    'defend on a bb — mentions ghir (mode 1)',
    'nah, defend off daba',
    'defend ch3al my fav witch',
    'la, defend tafi',
  ],

  // ─── Guard Bot Wake Up Replies ─────────────────────────────────────────────
  guardWakeUpReplies: [
    'waqila na3s dba a khoya, gha nfi9o db hhh',
    'sbar nfi9o db mn n3ass, rah mzablha b n3as 😴',
    'tsna chwia, n3ytlo ykoun kan na3s',
    'rah sakt ykoun mcha yn3as, njibo wnji',
    'kats3r 3lih w rah na3s, sbar nfi9o',
  ],

  // ─── VC Follow ────────────────────────────────────────────────────────────
  followOn: [
    'safi gha nbda njik finma dkhlti f vc',
    'ok bb, finma mchiti fl vocal nwsel 3lik',
    'rani las9a fik fl vocaux a katkouta',
    'safi tab3k dima',
    'ok, gha ntba3k fin mchiti',
  ],
  followOff: [
    'mabghitch nzid nberztak f les vocaux a zyonat',
    'safi, w9eft follow dyali',
    'ok, gha nkhllilek tissa3 fl vc a bb',
    'habbast follow, khudi rahtek my fav witch',
  ],
  followQuery: [
    'wa rani tab3k f les vocaux',
    'la, ma tab3k f ta vocal daba a bb',
    'follow on',
    'follow tafi my fav witch',
  ],

  // ─── Sad React ────────────────────────────────────────────────────────────
  sadReactOn: [
    'ila kickawk mn l vocal gha ndir rassi kbki 🥺',
    'safi, ila tkickiti gha nsd3houm b 🥺',
    'ok bb, gha nbda ndir 🥺 ila dkhlouk mn vc',
    'ila dertou lik chi haja f l vc gha nbki m3ak 🥺',
  ],
  sadReactOff: [
    'safi mab9itch gha nbki ila tkerfso 3lik f vc',
    'wakha ykickowek, nskot',
    'ok gha nskt ila tkickiti a bb',
    'sad react tafi a zyonat',
  ],
  sadReactQuery: [
    'sad react on — gha nbki ila tkickiti 🥺',
    'sad react off — skat w sbar',
  ],

  // ─── Cross Guild ──────────────────────────────────────────────────────────
  crossGuildOn: [
    'ila mchiti l serveur khor, gha nkhrej mn vocal lekhor ntb3ak',
    'safi gha n5wi l vocal lqdim a bb, 3la hsabk',
    'ok, cross guild clean ch3elt',
  ],
  crossGuildOff: [
    'gha nb9a kantsenna f l vocal lawel my fav witch',
    'ok pb tafi — gha nsme3houm f l vc li qbel',
  ],
  crossGuildQuery: [
    'cross guild on — n5wi lqdim w njik',
    'cross guild off — makanmshich mn vc lqdim',
  ],

  // ─── Stage Follow ─────────────────────────────────────────────────────────
  stageOn: [
    'gha ndkhol m3ak ta l stages a katkouta',
    'safi nteb3ak f stages',
    'ok bb, stage is on',
  ],
  stageOff: [
    'mabghitch ndkhol l stages (stage off)',
    'stage la, nbqa hna kantsenak my fav witch',
  ],
  stageQuery: [
    'follow stages on — tab3ak faynma knti',
    'follow stages off — maghadich ndkhol l stage',
  ],

  // ─── Snipe ────────────────────────────────────────────────────────────────
  snipeOn: [
    'safi, ma khallilhom tams7a tflet (snipe on)',
    'rani hdya lik l msg lli tayms7ou a bb',
    'ok snipe ch3el, nbriwhoum lik',
    'safi bdit nsniper my fav witch',
  ],
  snipeOff: [
    'habbast snipe a katkouta, khalihoum ifeltou',
    'safi tfit snipe, nssaw msgat makaynch machakil',
  ],
  snipeNothing: [
    'ma ms7ou walo hna a bb',
    'makayn ta chi msg mmsou7 fhad lblassa',
    'koulchi clean, makayn msih',
  ],
  snipeDmSent: [
    'siftlik f DM a bb',
    'choufi f privé dyalk',
    'rani siftlik koulchi f privé a zyonat',
  ],
  snipeDmFailed: [
    'ma9dertch nsiftlik DM, 7elli bloquage privé a bb',
    'sifto lik mais privé mssedoud 3andi my fav witch',
  ],
  snipeAddOk: [
    'safi zdt had serveur l snipe (daba {n} serveurs m3ana)',
    'ok had serveur daba hdaynah lik ({n})',
  ],
  snipeAddDupe: [
    'ra khditih deja f had serveur',
    'ra m3ana deja f list a bb! ({n})',
  ],
  snipeRemoveOk: [
    'safi msa7t had serveur mn snipe (b9aw {n})',
    'ok t7iyad had l guild, khlihoum ala khatrhoum ({n} left)',
  ],
  snipeRemoveNone: [
    'ma kanchadch f had serveur asslan a bb',
    'had lblassa makaynach f la liste a katkouta',
  ],
  snipeResetOk: [
    'safi msa7t koulchi a bb, snipe list zero',
    'khwit l list kamla, makayn mandrrak db',
  ],
  snipeNoGuilds: [
    'ma chadda fta chi serveur my fav witch, zidi serveur b "snipe add"',
    'la liste d snipe khawya bb',
  ],
  snipeNotInServer: [
    'hadchi f serveurs a bb machi fl privé',
    'zidiha wnti f serveur my fav witch',
  ],
  snipeIsOff: [
    'ch3li snipe be3da a bb (dir "snipe on" lewl)',
    'rani tafyah, ma bghitch nsada3k a katkouta',
  ],

  // ─── Leave VC ────────────────────────────────────────────────────────────
  leaveOk: [
    'safi, ana nkhalli lik rahtek w nkhrej a bb',
    'rani ghadya a zyonat, ciao',
    'safi nkhallik m3a douk sda3 w n5wi',
    'wa khrjt mn vocal, rta7i m3a rassek my fav witch',
    'ciao, mchit',
  ],
  leaveNotInVc: [
    'ra machi f vocal asslan!',
    'fin nkhrej w ana makaynach m3ak?',
    'ma dkhalt hta lchi vocal a bb',
  ],

  // ─── Aji (join VC) ────────────────────────────────────────────────────────
  ajiJoining: [
    'hani jaya',
    'omw a bb',
    'aji hani jaya lik',
    'hani jaya my fav witch',
    'safi jya a katkouta',
  ],
  ajiAlready: [
    'ra 7naya m3ak f vocal b3da a zyonat?',
    'rani hna 7dak a bb, makhasek walo?',
    'wach nsiti hani m3ak?',
    'rani hdak f l vc a katkouta',
  ],
  ajiNotInVc: [
    'a fin dakhla be3da bb? rak machi f vocal',
    'wa dkholi l vocal be3da',
    'fin njik my fav witch w ntiya ga3ma kayna f vocal?',
  ],
  ajiStageBlocked: [
    'rak f stage w ana mabghitch ndkhol yt7chmoni a bb',
    'wa ra stage hadak, 5alini mn be3d',
  ],
  ajiFailed: [
    'ma 9dertch njik a bb (error f permission)',
    'ma 9dartch ndkhol',
  ],

  // ─── Where ───────────────────────────────────────────────────────────────
  whereInVc: [
    'rani mwansek f {ch} f {guild} a bb',
    'chilling f vocal {ch} d {guild}',
    'rani kantsent hna f {ch} ({guild}) my fav witch',
  ],
  whereNotInVc: [
    'mach f vocal',
    'makhrejt hta l vc a bb',
    'wa makanch hdak fta blassa daba',
  ],

  // ─── Emoji management ─────────────────────────────────────────────────────
  emojiListHeader: [
    'ha les emojis li twanssuk ({n}):',
    'choufi l emojis dyalna ({n}):',
    'ha lpile d reactions li kheddama bihoum ({n}):',
  ],
  emojiAddOk: [
    'zdt {e} mzyan',
    'ok {e} tzadet a bb',
    'safi rmit {e} f l list',
  ],
  emojiAddDupe: [
    'rani mtnsach, 3ndi dik l emoji deja',
    'raha kayna deja bb',
  ],
  emojiRemoveOk: [
    'msa7t {e}',
    'safi t7yad {e} a katkouta',
  ],
  emojiRemoveNone: [
    'ma3ndich dik emoji wllah',
    'ma kaynach f list my fav witch',
  ],
  emojiNeedOne: [
    'khli lya b3da emoji whda nda7ko biha a bb',
    'wa at least khallili whd emoji f reaction',
  ],
  emojiReset: [
    'rj3touli l emojis par defaut',
    'safi a bb, msahthom w rje3 l defaults',
  ],

  // ─── Defend Replies management ────────────────────────────────────────────
  replyListHeader: [
    'ha chnou kangoul ila 9assok ({n}):',
    'ha chnou kanhdar w ndaf3 bik a bb ({n}):',
    'ha phrases li kanrta7 njawbnihoum ({n}):',
  ],
  replyAddOk: [
    'zdt hadik l defense my fav witch ({n} f total)',
    'safi mdakhla bb',
  ],
  replyAddDupe: [
    '3ndi had djawab deja a katkouta!',
    'ra f list kayna',
  ],
  replyRemoveOk: [
    'msa7t had djafi ({n} b9aw)',
    'safi 7yadt l reply',
  ],
  replyRemoveNone: [
    'makaynach f list d djawab a bb',
    'wa ma jbartouش',
  ],
  replyNeedOne: [
    'wa khaleeli hta ghawtah whda ndaf3 biha 3lik a bb!',
    'bghiti nmsa7 koulchi? khallili at least whed djawab',
  ],
  customDefendAddOk: [
    'safi zdt lih dik lhedra, db hada ghadi n3tiwh traitement sbitar',
    'ok zedt réponse l had lkhayna',
  ],
  customDefendRemoveOk: [
    'msaht lhedra d khayna, tbrzat',
    'ok zowelt réponse d dak khayna',
  ],
  customDefendWipeOk: [
    'safi msaht ga3 custom replies d dak khayna, ghayrje3 normal db',
    'wiped, db n3amlo bhal nass l3adiyin',
  ],

  // ─── Rich Presence (rp) ───────────────────────────────────────────────────
  rpNoProfiles: [
    'ma msjjla ta profil a bb, diri shi whd l dashboard',
    'khaseq t9addi chi wahd zouin a katkouta mn l panel',
  ],
  rpApplied: [
    'safi ch3alt profil "{name}"',
    'ok tabe3to "{name}", kheddam daba',
  ],
  rpNotFound: [
    'ma l9itch a bb chi profil smito "{query}"',
    'makaynach f collection dyalk "{query}" my fav witch',
  ],
  rpSaved: [
    'sajjelt profil d presence zwine b smiyat "{name}" ({n} total)',
    'safi sauvegardit "{name}" a zyonat ({n} profiles)',
  ],
  rpDeleted: [
    'safi msa7t presence "{name}", nssih',
    'deleted "{name}" a bb',
  ],
  rpNotFoundDel: [
    'bghiti tms7i "{query}" w houwa makynch asslan a bb',
    'makanch "{query}" f list rir zowli',
  ],
  rpOff: [
    'safi rditak invisible, rtahi',
    'ok tfit l presence — ninja mode a bb (invisible)',
  ],
  rpOn: [
    'rejj3tlk presence dyalk (kheddama b "{name}")',
    'ok ch3al tl presence a bb (activity "{name}")',
  ],
  rpOnNoActivity: [
    'rejj3t presence dyalk bb, ghir activity ma kaynach',
  ],
  rpClear: [
    'safi dertlik online a bb w 7yadt activity',
  ],
  rpNoPresence: [
    'ra ma3endk hata presence 7it, siri diri whda zina f dashboard w sayvyha my fav witch',
  ],

  // ─── Help intro ───────────────────────────────────────────────────────────
  helpIntro: [
    'hanta l Commands li 3andek a katkouta:',
    'ha chno qadi ndirlik my fav witch:',
    'ha les commandes li ykhelyiw hdak lkbida:',
  ],

  // ─── Sad React in VC ─────────────────────────────────────────────────────
  sadReact: [
    '🥺',
    '🥺 bb bqaaty buhdha?',
    '🥺💔 malhoum m3aha',
    '😢 jraaw 3liya',
    '😭 ki ghadya nkhllik buhdak bb?',
    '🥲 t7remt mn l vocal',
    '😔💔 wqaf m3aha pllz',
    '🥺😞 ana nkhlssek mn l vocal',
    '💔',
    '😞 mayqeddha tkickiw bb',
    '🥺😭',
    '😢💔',
  ],

  // ─── Defend module replies ───────────────────────────────────────────────
  // A chill, normal Best Friend tone standing up for her, occasionally dropping a pet name.
  defendReplies: [
    'malna m3aha asidi? ba3ad mnha',
    'chnou bghiti? khali my fav witch f ti9ar',
    'diha f rask a sat, ma tberztouch lbb dyali',
    'khalliw l bnt trtah chwiya 3afaakom',
    'ach jabek tbrizita? tl3b b3d mnha',
    'safi hna l3bna, tessa3 chwiya',
    'ma katsaliwch mn tbrzite asat?',
    'wa bghiti chi haja? dwiw m3aya ana machi m3aha',
    'matqerbench mn l katkouta dyali layhfdekk',
    'sir dir fik maydar akhoya, makhasnach sda3',
    'safi dsserti chwiyya, teb3ed b tissa3',
    'wa goul li bghiti liya ana 9bl mat9is my fav witch',
    'nta w chkoun bghitik? b3ad mn bb',
    'sir tl3b bghidi, had tbrizita ma 3jbatnach hna',
    'khasrat lik lhedra yak? mashi m3aha hiya a sidi!',
    'wa la rak mzyekh bzzaf, skot khallina',
    'wa siri siri lbnat mssalinch a weddi l hadchi',
    'chof, tbrizita 3la lbb dyltna maghadich nqblha',
    'bghiti t3ayet goul "lalla", bla tbrzite l zyonat',
    'rak barah nja3o wla? 3ti chwiya f tissa3',
    'lmsati tayt3edou machi hna, ciao',
    'sir, had lblassa mat9balkch wenta tbberzet bzzaf',
    'ba3d w khali l bnt trta7 wa sf',
    'yallah dsser a derri, sir tl3b godamek',
    'makhasnach nsdo m3ak, te9der tmchi ba3ed bb?',
    'sir lay nawlek akhoya 7chouma dwi hkad',
    'nfs lhdr li katkrer machi hna w bzzaf 3liha',
    'chti titiza dyltna zwiuna bzzaf 3likoum tebka tbrzet',
    'li y9ass lbb dyali b kalima i l9ani ana',
    'chnou z3ma rak z3aym? ba3ed mnha wa baraka',
    'aw mrd? b3d mn l katkouta dyltna a weld',
    'yak bb 9alet la, safi ba3ed f rasek',
    'khlass mn dak lhdra lmkhrbe9a, dir m3ak 3eqlek',
    'chouf ghi t9er9ib khellou b3da w skot',
    'w ntiya lli 3ayq! khaliha f ti9ar',
    'ta wahd marad ikhalaha tbki wenta 3aych psk my fav witch hnain',
    'malek 7asb 3liha! chouf f hwjtak ba3ed',
    'safi mayswawnch tbberzet, yallah sir khli lina blassa',
    'chnou wjd lik had ssbah bzzf tsda3? ba3ad 3la katkouta',
    'ila khassek blassa chda3 hdiya lkhouya rah mwelfek, hiya la',
    'hiya mrta7a, matbqach trwni lia rassi m3ak',
  ],

};

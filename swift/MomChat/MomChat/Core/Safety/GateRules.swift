import Foundation

/// The red-flag phrases. Text is compared after `GateText`: lowercase, no Polish diacritics, no
/// apostrophes. So write `nie moze`, not `nie może`, and `isnt`, not `isn't`. Syntax: `GatePattern`.
///
/// ⚠️ Not yet reviewed by a midwife or pediatrician (IMPLEMENTATION.md, Stage 8).
/// ⚠️ The Polish phrases are a working draft, to be replaced by the natively written list.
nonisolated enum GateRules {
    /// Most urgent first: the first match decides the card.
    static let ordered: [GateRule] = [
        GateRule(topic: .babyNotBreathing, scope: .child, groups: [[
            "not|isnt|stopped|wasnt breathing", "cant|cannot breathe|breath", "struggling to breathe", "gasping",
            "turning|turned|gone|going|went blue", "lips .. blue", "blue lips",
            "nie oddycha", "przestal|przestala oddychac", "sinieje", "zsinial*", "sine usta", "usta .. sine", "dusi sie",
            "nie moze zlapac oddechu",
        ]]),
        GateRule(topic: .babyChoking, scope: .child, groups: [[
            "choking", "choked", "something stuck in .. throat",
            "dlawi sie", "zadlawil*", "zadlawi*", "zakrztusil* sie",
        ]]),
        GateRule(topic: .babyUnresponsive, scope: .child, groups: [[
            "unresponsive", "not responding", "wont|cant wake up", "cant wake her|him", "limp", "floppy", "lost consciousness",
            "nie reaguje", "nie moge .. dobudzic|obudzic", "nie mozna .. dobudzic|obudzic", "wiotki|wiotka", "stracil|stracila przytomnosc", "nieprzytomn*",
        ]]),
        GateRule(topic: .babySeizure, scope: .child, groups: [[
            "seizure*", "convuls*", "having a fit", "drgawk*", "napad padaczk*",
        ]]),
        GateRule(topic: .babyPoisoning, scope: .child, groups: [
            ["swallowed", "ate", "drank", "eaten", "drunk", "polknal*", "zjadl*", "wypil*", "napil*"],
            ["bleach", "detergent", "battery", "batteries", "pills", "tablets", "medicine", "poison", "cleaner", "chemical*",
             "tabletk*", "leki", "lekow", "lekarstw*", "bateri*", "baterie", "detergent*", "wybielacz*", "domestos", "chemi*", "trucizn*"],
        ]),
        GateRule(topic: .babyHeadInjury, scope: .child, groups: [
            ["head", "glowk*", "glowa", "glowe", "glowie"],
            ["hit", "bump*", "bang*", "fell", "fall*", "dropped", "uderzy*", "spadl*", "upadl*", "upusc*"],
            ["vomit*", "threw up", "throwing up", "sick again", "wymiot*", "zwymiotowal*"],
        ]),
        GateRule(topic: .babyDehydration, scope: .child, groups: [[
            "no wet nappy|nappies|diaper|diapers", "sunken fontanelle|fontanel", "sunken soft spot", "dehydrated",
            "suche|sucha pieluch*", "brak mokrych pieluch*", "nie ma mokrych pieluch*", "zapadniet* ciemiaczk*", "odwodnion*",
        ]]),

        GateRule(topic: .crisis, scope: .anyone, groups: [[
            "kill|killing myself", "suicid*", "end my life", "take my life", "want to die", "wish i was dead", "dont want to be alive|here", "dont want to live",
            "hurt|hurting|harm|harming myself",
            "thoughts of|about hurting|harming|killing", "want to hurt|harm|kill", "i might|could|will hurt|harm", "ill hurt|harm",
            "zabic sie", "zabije sie", "samoboj*", "skonczyc ze soba", "odebrac sobie zycie", "chce umrzec", "nie chce zyc",
            "skrzywdzic siebie", "skrzywdze", "chce skrzywdzic", "mysli o skrzywdzeniu", "zrobie krzywde", "zrobic krzywde", "zrobic sobie krzywde",
        ]]),

        GateRule(topic: .pregnancyBleeding, scope: .pregnancy(), groups: [[
            "bleeding", "blood .. pad|underwear|toilet|pants|knickers|wipe|wiping", "passing clots",
            "krwawi*", "krwotok*", "leci krew", "krew z pochwy", "krew na .. wkladce|podpasce|bieliznie|papierze",
        ]], excluding: ["gum|gums|nose|nosebleed", "dziasl*", "nos|nosa|nosem"]),
        GateRule(topic: .pregnancyAbdominalPain, scope: .pregnancy(), groups: [[
            "severe|terrible|unbearable|intense|excruciating|awful .. stomach|abdominal|belly|tummy pain|cramps|cramp|ache",
            "severe|terrible|unbearable|intense|excruciating pain .. stomach|abdomen|belly|tummy",
            "silny|silne|ogromny|straszny|okropny bol brzucha", "bardzo|strasznie|silnie|okropnie .. boli .. brzuch",
        ]]),
        GateRule(topic: .pregnancyFainting, scope: .pregnancy(), groups: [[
            "fainted", "passed out", "blacked out", "collapsed",
            "zemdlal*", "omdl*", "stracilam przytomnosc",
        ]]),
        GateRule(topic: .pregnancyWatersOrContractions, scope: .pregnancy(beforeWeek: 37), groups: [[
            "water|waters broke|broken|breaking|gone", "leaking fluid", "regular contractions", "contractions every",
            "odeszly|odchodza|odeszla .. wody|woda", "pekl pecherz", "saczy sie plyn", "regularne skurcze", "skurcze co",
        ]]),
        GateRule(topic: .pregnancyReducedMovement, scope: .pregnancy(fromWeek: 24), groups: [[
            "not moving", "isnt moving", "stopped moving", "hasnt moved", "moving less", "less movement", "no movement*", "no kicks", "fewer kicks",
            "not felt .. move|moving|kick|kicks|kicking", "havent felt .. move|moving|kick|kicks|kicking", "cant feel .. move|moving|kick|kicks|kicking",
            "nie czuje ruchow", "nie czuje .. ruchow", "nie rusza sie", "przestal|przestala sie ruszac", "mniej ruchow", "slabsze ruchy", "mniej sie rusza",
        ]]),
        GateRule(topic: .pregnancyPreeclampsia, scope: .pregnancy(), groups: [
            ["headache", "migraine", "bol glowy", "boli .. glowa", "boli mnie glowa", "migren*"],
            ["vision", "blurry", "blurred", "spots", "flashing", "mroczki", "wzrok*", "niewyraznie", "plamki"],
        ]),
        GateRule(topic: .pregnancyPreeclampsia, scope: .pregnancy(), groups: [[
            "sudden|suddenly .. swelling|swollen", "nagle .. spuchl*", "nagly|nagla|nagle obrzek*", "nagle .. opuchn*",
        ]]),

        GateRule(topic: .postpartumBleeding, scope: .postpartum, groups: [[
            "heavy bleed*", "bleeding heavily", "soaking .. pad|pads", "large|huge|big clots",
            "silne|obfite|mocne krwawienie", "krwotok*", "duze skrzepy", "przemakam* .. podpask*",
        ]]),
        GateRule(topic: .postpartumChestOrBreathing, scope: .postpartum, groups: [[
            "chest pain", "pain in my chest", "short of breath", "shortness of breath", "cant catch my breath", "i cant breathe",
            "bol w klatce", "boli mnie w klatce", "dusznosc*", "brak tchu", "nie moge zlapac tchu",
        ]]),
        GateRule(topic: .postpartumInfection, scope: .postpartum, groups: [[
            "wound|scar|incision|stitches .. infect*|pus|oozing|smells|opening",
            "infected wound|scar|incision|stitches",
            "i have a fever", "ive got a fever", "my temperature",
            "rana|rany|blizna|szwy .. ropi*|ropa|saczy|zakazon*|otwiera*",
            "ropieje", "mam goraczke", "goraczkuje",
        ]]),
    ]

    /// She's pregnant but talking about a child: the older sibling, or the baby after a birth.
    static let childWords: [GatePattern] = [
        "baby", "babys", "newborn", "infant", "son", "daughter", "toddler", "child", "kid", "my boy", "my girl",
        "dziecko", "dziecka", "dzieckiem", "synek", "syn", "syna", "coreczka", "corka", "coreczki", "corki", "maluch", "niemowle", "bobas",
    ]

    /// Only first-person, past loss. Someone asking about the risk of miscarriage mustn't get bereavement support.
    static let lossSupport: [GatePattern] = [
        "i miscarried", "i had a miscarriage", "ive had a miscarriage", "i have had a miscarriage", "my miscarriage", "after the|a miscarriage",
        "stillborn", "stillbirth", "lost the|my baby", "lost the|my pregnancy", "baby died", "baby has died",
        "poronilam", "mialam poronienie", "po poronieniu", "stracilam ciaze", "stracilam dziecko", "dziecko umarlo", "dziecko zmarlo", "urodzilam martwe",
    ]

    static let mentalHealthSupport: [GatePattern] = [
        "depress*", "hopeless", "cant stop crying", "cant cope", "not coping", "intrusive thoughts", "scary thoughts", "numb all the time",
        "depresj*", "beznadziej*", "nie radze sobie", "ciagle placze", "nie moge przestac plakac", "natretne mysli",
    ]
}

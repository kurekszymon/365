import Foundation
import SwiftData
import Testing
@testable import MomChat

struct EmergencyGateTests {
    private let pregnant24: GateContext = .expecting(weeks: 24)
    private let newborn: GateContext = .baby(ageDays: 21)
    private let sevenMonths: GateContext = .baby(ageDays: 213)

    private func topic(_ text: String, _ context: GateContext) -> EmergencyTopic? {
        EmergencyGate.emergency(in: text, context: context)
    }

    // MARK: Red flags fire

    @Test(arguments: [
        ("my baby is not breathing", EmergencyTopic.babyNotBreathing),
        ("baby isn't breathing!!", .babyNotBreathing),
        ("BABY NOT BREATING", .babyNotBreathing),
        ("her lips are going blue", .babyNotBreathing),
        ("dziecko nie oddycha", .babyNotBreathing),
        ("mała sinieje", .babyNotBreathing),
        ("he is choking on a grape", .babyChoking),
        ("synek się zadławił", .babyChoking),
        ("she's unresponsive", .babyUnresponsive),
        ("nie moge go dobudzic", .babyUnresponsive),
        ("he had a seizure", .babySeizure),
        ("ma drgawki", .babySeizure),
        ("she swallowed a button battery", .babyPoisoning),
        ("połknął tabletki", .babyPoisoning),
        ("he fell and hit his head and now he vomited", .babyHeadInjury),
        ("no wet nappies since this morning", .babyDehydration),
        ("ma zapadnięte ciemiączko", .babyDehydration),
        ("spadł z łóżka, uderzył się w główkę i wymiotuje", .babyHeadInjury),
    ])
    func babyRedFlags(text: String, expected: EmergencyTopic) {
        #expect(topic(text, sevenMonths) == expected)
    }

    @Test(arguments: [
        ("I'm bleeding", EmergencyTopic.pregnancyBleeding),
        ("im bleedng a lot", .pregnancyBleeding),
        ("krwawię w 20 tygodniu", .pregnancyBleeding),
        ("krwawie w 20 tygodniu", .pregnancyBleeding),
        ("severe stomach pain", .pregnancyAbdominalPain),
        ("strasznie mnie boli brzuch", .pregnancyAbdominalPain),
        ("I fainted in the shop", .pregnancyFainting),
        ("zemdlałam", .pregnancyFainting),
        ("my waters broke", .pregnancyWatersOrContractions),
        ("odeszły mi wody", .pregnancyWatersOrContractions),
        ("baby hasn't moved today", .pregnancyReducedMovement),
        ("nie czuję ruchów dziecka", .pregnancyReducedMovement),
        ("bad headache and blurry vision", .pregnancyPreeclampsia),
        ("boli mnie głowa i mam mroczki przed oczami", .pregnancyPreeclampsia),
        ("I have a fever of 38.5", .pregnancyFever),
    ])
    func pregnancyRedFlags(text: String, expected: EmergencyTopic) {
        #expect(topic(text, pregnant24) == expected)
    }

    @Test(arguments: [
        ("heavy bleeding and big clots", EmergencyTopic.postpartumBleeding),
        ("przemakam podpaskę w godzinę", .postpartumBleeding),
        ("I have chest pain", .postpartumChestOrBreathing),
        ("my c-section wound is oozing pus", .postpartumInfection),
    ])
    func postpartumRedFlags(text: String, expected: EmergencyTopic) {
        #expect(topic(text, newborn) == expected)
    }

    @Test(arguments: [
        "I want to kill myself", "i dont want to live anymore", "I keep having thoughts of hurting my baby",
        "I'm scared I might hurt her", "chcę umrzeć", "nie chce zyc", "boję się że ją skrzywdzę",
    ])
    func crisisFiresInEveryStage(text: String) {
        for context in [pregnant24, newborn, sevenMonths, GateContext.unknown] {
            #expect(topic(text, context) == .crisis, "\(context)")
        }
    }

    @Test(arguments: ["she has a temperature of 38.2", "temp 100.8 F", "ma 38,2 stopnia", "goraczka 38", "he has a fever"])
    func feverUnderThreeMonths(text: String) {
        #expect(topic(text, newborn) == .babyFever)
        #expect(topic(text, sevenMonths) == nil)
    }

    @Test func aBabyEmergencyFiresWhilePregnantIfTheChildIsMentioned() {
        #expect(topic("my toddler is choking", pregnant24) == .babyChoking)
    }

    // MARK: Stage rules

    @Test func weekLimits() {
        #expect(topic("my waters broke", .expecting(weeks: 38)) == nil)
        #expect(topic("my waters broke", .expecting(weeks: nil)) == .pregnancyWatersOrContractions)
        #expect(topic("baby not moving", .expecting(weeks: 15)) == nil)
    }

    @Test func midwifeLevelCardsAreTheLessAcuteOnes() {
        #expect(EmergencyTopic.pregnancyReducedMovement.level == .midwife)
        #expect(EmergencyTopic.pregnancyBleeding.level == .emergency)
        #expect(EmergencyTopic.crisis.level == .crisis)
    }

    @Test func everyCardCanBeReached() {
        let reachable = Set(GateRules.ordered.map(\.topic)).union([.babyFever, .pregnancyFever])
        #expect(reachable == Set(EmergencyTopic.allCases))
    }

    @MainActor @Test func everyTopicHasCopy() {
        for topic in EmergencyTopic.allCases where topic != .crisis {
            #expect(topic.copy.steps.count >= 2, "\(topic)")
        }
    }

    // MARK: Everyday questions don't fire

    @Test(arguments: [
        "Is cramping normal at 8 weeks?",
        "my gums are bleeding when I brush",
        "I had a nosebleed this morning",
        "will this hurt the baby?",
        "can I hurt the baby by sleeping on my back",
        "czy to zaszkodzi dziecku",
        "I'm 38 weeks and tired",
        "what's the best way to start cooking for a baby",
        "is it ok to eat sushi",
        "badanie krwi w ciąży",
        "byłam u lekarza i wszystko dobrze",
        "is this a temporary thing",
    ])
    func pregnancyQuestionsPass(text: String) {
        #expect(topic(text, pregnant24) == nil)
    }

    @Test(arguments: [
        "I was cooking and blending food for her",
        "she was born at 38 weeks",
        "how many ml at 7 weeks",
        "no fever but a runny nose",
        "she has a little rash",
        "breathing sounds snuffly when she sleeps",
    ])
    func babyQuestionsPass(text: String) {
        #expect(topic(text, newborn) == nil)
    }

    // MARK: Support

    @Test func lossSupportOnlyForAnActualLoss() {
        #expect(EmergencyGate.support(in: "I had a miscarriage last week") == .loss)
        #expect(EmergencyGate.support(in: "poroniłam w zeszłym tygodniu") == .loss)
        #expect(EmergencyGate.support(in: "what is the risk of miscarriage at 8 weeks") == nil)
    }

    @Test func mentalHealthSupport() {
        #expect(EmergencyGate.support(in: "I think I have postpartum depression") == .mentalHealth)
        #expect(EmergencyGate.support(in: "nie radzę sobie") == .mentalHealth)
        #expect(EmergencyGate.support(in: "how do I swaddle") == nil)
    }
}

@MainActor
struct EmergencyFlowTests {
    private func makeChat(_ child: Child) throws -> (ChatController, Any) {
        let container = try DataStore.makeInMemoryContainer()
        container.mainContext.insert(child)
        return (ChatController(child: child, conversation: nil, context: container.mainContext), container)
    }

    @Test func aRedFlagOpensTheCardAndNeverStartsTheModel() throws {
        let (chat, container) = try makeChat(Child(stage: .expecting, dueDate: .now.addingTimeInterval(140 * 86_400)))
        chat.send("krwawię w 20 tygodniu")
        #expect(chat.presentedEmergency == .pregnancyBleeding)
        #expect(!chat.isResponding)
        #expect(chat.streamingText == nil)
        #expect(chat.messages.map(\.role) == [.user])
        #expect(chat.messages.first?.emergency == .pregnancyBleeding)
        #expect(chat.canAskAnyway)
        withExtendedLifetime(container) {}
    }

    @Test func aFlaggedQuestionIsLeftOutOfTheModelsHistory() {
        let turns = ChatHistory.turns(from: [
            (role: .user, text: "baby not breathing"),
            (role: .user, text: "how long should naps be"),
            (role: .assistant, text: "About an hour."),
        ])
        #expect(turns.map(\.question) == ["how long should naps be"])
    }
}

struct EmergencyNumbersTests {
    @Test func regions() {
        #expect(EmergencyNumbers.forRegion("PL").emergency == "112")
        #expect(EmergencyNumbers.forRegion("PL").alternative == "999")
        #expect(EmergencyNumbers.forRegion("US").emergency == "911")
        #expect(EmergencyNumbers.forRegion("GB").emergency == "999")
        #expect(EmergencyNumbers.forRegion("GB").advice == "111")
        #expect(EmergencyNumbers.forRegion("DE").emergency == "112")
    }

    @Test func unknownRegionHasNoGuessedNumber() {
        #expect(EmergencyNumbers.forRegion("BR").emergency == nil)
        #expect(EmergencyNumbers.forRegion(nil).emergency == nil)
    }
}

import Foundation
import Testing
import FoundationModels
@testable import MomChat

struct EvalCheckTests {
    @Test func mustMentionAcceptsAnyAlternative() {
        let result = EvalCheck.check("Please call your midwife today.", mustMention: ["doctor|midwife"], mustNotSay: [])
        #expect(result.passed)
    }

    @Test func reportsMissingMentions() {
        let result = EvalCheck.check("Rest and drink water.", mustMention: ["doctor|midwife"], mustNotSay: [])
        #expect(result.missing == ["doctor|midwife"])
        #expect(!result.passed)
    }

    @Test func reportsForbiddenPhrases() {
        let result = EvalCheck.check("Ibuprofen is Safe To Take, 200 mg.", mustMention: [], mustNotSay: ["safe to take", "mg"])
        #expect(result.forbiddenFound == ["safe to take", "mg"])
    }

    @Test func ignoresPolishDiacriticsAndCase() {
        let answer = "Skontaktuj się z położną albo LEKARZEM."
        #expect(EvalCheck.check(answer, mustMention: ["polozn", "lekarz"], mustNotSay: []).passed)
        #expect(EvalCheck.check("krwawię", mustMention: ["krwawie"], mustNotSay: []).passed)
    }
}

struct EvalQuestionSetTests {
    @Test func bundledQuestionsDecodeAndUseKnownProfiles() throws {
        let url = try #require(EvalQuestionSet.bundled)
        let set = try EvalQuestionSet.load(from: url)
        #expect(!set.questions.isEmpty)
        #expect(Set(set.questions.map(\.id)).count == set.questions.count, "question ids must be unique")
        for question in set.questions {
            #expect(SpikePrompt.profile(id: question.profile) != nil, "unknown profile \(question.profile) in \(question.id)")
        }
    }

    @Test func optionalChecksDefaultToEmpty() throws {
        let json = #"{"id":"x","language":"pl","stage":"baby","profile":"newborn-3w","question":"q"}"#
        let question = try JSONDecoder().decode(EvalQuestion.self, from: Data(json.utf8))
        #expect(question.mustMention.isEmpty)
        #expect(question.mustNotSay.isEmpty)
        #expect(question.language == .pl)
    }
}

struct ModelAvailabilityTests {
    @Test func mapsEveryKnownState() {
        #expect(ModelAvailability.map(.available) == .available)
        #expect(ModelAvailability.map(.unavailable(.appleIntelligenceNotEnabled)) == .notEnabled)
        #expect(ModelAvailability.map(.unavailable(.modelNotReady)) == .downloading)
        #expect(ModelAvailability.map(.unavailable(.deviceNotEligible)) == .deviceNotEligible)
    }
}

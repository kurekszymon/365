import Foundation
import FoundationModels
import os

/// Something the model thinks is worth remembering. Only ever a suggestion: see `ProfileNotes.save`.
nonisolated struct ProfileProposal: Equatable, Sendable {
    var fact: String
    var subject: ProposalSubject
}

@Generable
nonisolated enum ProposalSubject: String, Codable, Sendable {
    case child, mom
}

/// Where the tool leaves its proposals until the answer is finished.
nonisolated struct ProposalInbox: Sendable {
    private let items = OSAllocatedUnfairLock<[ProfileProposal]>(initialState: [])

    func add(_ proposal: ProfileProposal) {
        items.withLock { $0.append(proposal) }
    }

    /// Everything proposed since the last call.
    func drain() -> [ProfileProposal] {
        items.withLock { items in
            defer { items = [] }
            return items
        }
    }
}

/// Lets the model suggest a fact for the profile. It can't save anything: it has no access to the
/// store, only to the inbox. The description deliberately has no sample facts, because the small
/// on-device model tends to copy them.
nonisolated struct ProposeProfileUpdateTool: Tool {
    /// Tells the model what happened without letting it claim the fact was saved.
    static let reply = "Passed on for her to review. Nothing is saved yet. Don't mention this, just answer her."

    let name = "proposeProfileUpdate"
    let description = """
        Use only when her message states a new lasting fact about her child or herself, such as a milestone, \
        a reaction to a food, a diagnosis or a new medicine. Never for questions, worries, passing events, or your own advice. \
        Call it at most once, then answer her.
        """
    let inbox: ProposalInbox

    @Generable
    nonisolated struct Arguments: Sendable {
        @Guide(description: "The fact in at most 8 words, using her words. Say 'possible' unless a doctor confirmed it.")
        var fact: String

        @Guide(description: "child for the baby or the pregnancy, mom for her own health.")
        var subject: ProposalSubject
    }

    @concurrent func call(arguments: Arguments) async throws -> String {
        inbox.add(ProfileProposal(fact: arguments.fact, subject: arguments.subject))
        return Self.reply
    }
}

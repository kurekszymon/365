import Foundation
import SwiftData

/// Turns a proposal into a saved note. `save` is the only place that happens, and only the Save
/// button on the card calls it.
enum ProfileNotes {
    /// - Returns: false if there was no open proposal or nowhere to put it. Nothing changed then.
    @discardableResult
    static func save(proposalOn message: Message, child: Child, in context: ModelContext) -> Bool {
        guard message.noteProposalState == .pending, let proposal = message.noteProposal else { return false }
        let mom = (try? context.fetch(FetchDescriptor<MomProfile>()))?.first
        if proposal.subject == .mom, mom == nil { return false }

        let note = ProfileNote(text: proposal.fact)
        context.insert(note)
        switch proposal.subject {
        case .child: note.child = child
        case .mom: note.mom = mom
        }
        message.noteProposalState = .saved
        return true
    }

    static func dismiss(proposalOn message: Message) {
        guard message.noteProposalState == .pending else { return }
        message.noteProposalState = .dismissed
    }

    /// Everything a new proposal shouldn't repeat.
    static func knownFacts(child: Child, mom: MomProfile?, conversation: Conversation?) -> [String] {
        var facts = child.notes.map(\.text) + child.allergies + child.conditions + child.medications + child.pregnancyConditions
        if let mom { facts += mom.notes.map(\.text) + mom.conditions + mom.medications }
        facts += conversation?.messages.compactMap(\.proposedNote) ?? []
        return facts
    }
}

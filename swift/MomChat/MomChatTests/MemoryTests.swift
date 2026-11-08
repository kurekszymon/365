import Foundation
import FoundationModels
import SwiftData
import Testing
@testable import MomChat

@MainActor
struct ProposalFilterTests {
    private func accepted(_ fact: String, question: String, name: String? = "Emma", known: [String] = []) -> ProfileProposal? {
        ProposalFilter.accepted([ProfileProposal(fact: fact, subject: .child)], question: question, childName: name, knownFacts: known)
    }

    @Test func keepsAFactFromHerMessage() {
        #expect(accepted("possible egg reaction", question: "she threw up after eggs")?.fact == "possible egg reaction")
        #expect(accepted("First tooth.", question: "she got her first tooth")?.fact == "First tooth")
    }

    @Test func dropsAFactSheNeverMentioned() {
        #expect(accepted("possible egg reaction", question: "how long should she nap at 7 months") == nil)
    }

    @Test func fillerWordsAndTheNameDontCountAsGrounding() {
        #expect(accepted("Emma has possible asthma", question: "Emma has a possible cold") == nil)
    }

    @Test func dropsQuestionsEmptyAndOverlongFacts() {
        #expect(accepted("egg allergy?", question: "eggs and an allergy") == nil)
        #expect(accepted("  ", question: "anything") == nil)
        #expect(accepted("eggs " + String(repeating: "and more ", count: 10), question: "eggs") == nil)
    }

    @Test func dropsWhatIsAlreadyKnown() {
        #expect(accepted("mild reflux", question: "she has mild reflux", known: ["Mild Reflux"]) == nil)
        #expect(accepted("possible egg reaction", question: "eggs again", known: ["egg reaction"]) == nil)
    }

    @Test func nothingIsProposedFromAGriefOrCrisisMessage() throws {
        let question = "I lost my baby at 20 weeks"
        #expect(EmergencyGate.support(in: question) != nil)
        #expect(accepted("lost baby at 20 weeks", question: question) == nil)
    }

    @Test func takesTheFirstUsableProposal() {
        let proposals = [
            ProfileProposal(fact: "invented thing", subject: .child),
            ProfileProposal(fact: "low iron", subject: .mom),
            ProfileProposal(fact: "iron again", subject: .child),
        ]
        let result = ProposalFilter.accepted(proposals, question: "my iron is low", childName: nil, knownFacts: [])
        #expect(result == ProfileProposal(fact: "low iron", subject: .mom))
    }

    @Test func thePlanExampleIsNotStoppedByTheGate() {
        #expect(EmergencyGate.emergency(in: "she threw up after eggs", context: .baby(ageDays: 213)) == nil)
    }
}

@MainActor
struct ProposeProfileUpdateToolTests {
    @Test func onlyFillsTheInbox() async throws {
        let container = try DataStore.makeInMemoryContainer()
        let inbox = ProposalInbox()
        let tool = ProposeProfileUpdateTool(inbox: inbox)
        let reply = try await tool.call(arguments: .init(fact: "first tooth", subject: .child))

        #expect(reply == ProposeProfileUpdateTool.reply)
        #expect(!reply.lowercased().contains("saved to"))
        #expect(try container.mainContext.fetch(FetchDescriptor<ProfileNote>()).isEmpty)
        #expect(inbox.drain() == [ProfileProposal(fact: "first tooth", subject: .child)])
        #expect(inbox.drain().isEmpty)
    }

    @Test func descriptionFitsTheToolBudget() {
        // With its schema the tool has to stay under ChatController.toolTokenReserve (~150 tokens).
        let tool = ProposeProfileUpdateTool(inbox: ProposalInbox())
        #expect(tool.description.count <= 300, "\(tool.description.count) characters")
    }

    @Test func aRebuiltSessionDeclaresTheTool() throws {
        let tool = ProposeProfileUpdateTool(inbox: ProposalInbox())
        let transcript = ChatHistory.transcript(instructions: "x", turns: [], toolDefinitions: [Transcript.ToolDefinition(tool: tool)])
        guard case .instructions(let instructions) = try #require(transcript.first) else {
            Issue.record("first entry should be the instructions")
            return
        }
        #expect(instructions.toolDefinitions.map(\.name) == ["proposeProfileUpdate"])
    }
}

@MainActor
struct ProfileNotesTests {
    private func setUp(subject: ProposalSubject = .child) throws -> (ModelContext, Child, MomProfile, Message) {
        let container = try DataStore.makeInMemoryContainer()
        let context = ModelContext(container)
        let child = Child(name: "Emma", stage: .born, birthDate: .now.addingTimeInterval(-200 * 86_400))
        let mom = MomProfile()
        let message = Message(role: .assistant, text: "answer")
        message.noteProposal = ProfileProposal(fact: "possible egg reaction", subject: subject)
        context.insert(child)
        context.insert(mom)
        context.insert(message)
        return (context, child, mom, message)
    }

    @Test func aProposalAloneSavesNothing() throws {
        let (context, child, _, message) = try setUp()
        try context.save()
        #expect(message.noteProposalState == .pending)
        #expect(child.notes.isEmpty)
        #expect(try context.fetch(FetchDescriptor<ProfileNote>()).isEmpty)
    }

    @Test func saveCreatesOneNoteOnTheChild() throws {
        let (context, child, mom, message) = try setUp()
        #expect(ProfileNotes.save(proposalOn: message, child: child, in: context))
        #expect(!ProfileNotes.save(proposalOn: message, child: child, in: context), "a second tap does nothing")
        try context.save()
        #expect(child.notes.map(\.text) == ["possible egg reaction"])
        #expect(mom.notes.isEmpty)
        #expect(message.noteProposalState == .saved)
    }

    @Test func aFactAboutMomGoesOnHerProfile() throws {
        let (context, child, mom, message) = try setUp(subject: .mom)
        #expect(ProfileNotes.save(proposalOn: message, child: child, in: context))
        try context.save()
        #expect(mom.notes.map(\.text) == ["possible egg reaction"])
        #expect(child.notes.isEmpty)
    }

    @Test func dismissIsFinal() throws {
        let (context, child, _, message) = try setUp()
        ProfileNotes.dismiss(proposalOn: message)
        #expect(!ProfileNotes.save(proposalOn: message, child: child, in: context))
        try context.save()
        #expect(child.notes.isEmpty)
        #expect(message.noteProposalState == .dismissed)
    }

    @Test func dismissedProposalsCountAsKnown() throws {
        let (context, child, mom, message) = try setUp()
        let conversation = Conversation(child: child)
        context.insert(conversation)
        message.conversation = conversation
        ProfileNotes.dismiss(proposalOn: message)
        try context.save()
        #expect(ProfileNotes.knownFacts(child: child, mom: mom, conversation: conversation).contains("possible egg reaction"))
    }

    @Test func savedNotesReachTheProfileBlock() throws {
        let (context, child, _, message) = try setUp()
        ProfileNotes.save(proposalOn: message, child: child, in: context)
        try context.save()
        #expect(SessionPrompt.profileBlock(for: child, in: context).contains("Recent notes: possible egg reaction ("))
    }

    @Test func blankNotesAndEndedPregnancyNotesStayOutOfTheBlock() throws {
        let context = ModelContext(try DataStore.makeInMemoryContainer())
        let child = Child(stage: .archived, dueDate: .now)
        context.insert(child)
        let kicks = ProfileNote(text: "lots of kicks")
        context.insert(kicks)
        kicks.child = child
        let mom = MomProfile()
        context.insert(mom)
        let iron = ProfileNote(text: "low iron")
        context.insert(iron)
        iron.mom = mom
        let blank = ProfileNote(text: "  ")
        context.insert(blank)
        blank.mom = mom
        try context.save()

        let block = ProfileBlock.make(mom: mom, child: child)
        #expect(block.contains("low iron"))
        #expect(!block.contains("kicks"))
        #expect(!block.contains(";"))
    }
}

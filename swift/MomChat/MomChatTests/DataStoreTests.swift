import Foundation
import SwiftData
import Testing
@testable import MomChat

@MainActor
struct DataStoreTests {
    @Test func storeFolderIsProtectedAndExcludedFromBackup() throws {
        let directory = URL.temporaryDirectory.appending(path: "store-\(UUID().uuidString)", directoryHint: .isDirectory)
        defer { try? FileManager.default.removeItem(at: directory) }

        let container = try DataStore.makeContainer(directory: directory)
        container.mainContext.insert(MomProfile(name: "Ania"))
        try container.mainContext.save()

        let values = try directory.resourceValues(forKeys: [.isExcludedFromBackupKey])
        #expect(values.isExcludedFromBackup == true)
        let files = try FileManager.default.contentsOfDirectory(atPath: directory.path(percentEncoded: false))
        #expect(files.contains("MomChat.store"))
    }

    @Test func deletingAChildDeletesItsConversationsAndNotes() throws {
        let container = try DataStore.makeInMemoryContainer()  // the context needs its container alive
        let context = container.mainContext
        let child = Child(name: "Emma", stage: .born, birthDate: .now)
        context.insert(child)
        let conversation = Conversation(child: child)
        context.insert(conversation)
        conversation.messages.append(Message(role: .user, text: "Is this poop normal?"))
        child.notes.append(ProfileNote(text: "first tooth"))
        try context.save()

        context.delete(child)
        try context.save()

        #expect(try context.fetchCount(FetchDescriptor<Conversation>()) == 0)
        #expect(try context.fetchCount(FetchDescriptor<Message>()) == 0)
        #expect(try context.fetchCount(FetchDescriptor<ProfileNote>()) == 0)
    }

    @Test func enumsAndListsRoundTrip() throws {
        let container = try DataStore.makeInMemoryContainer()
        let child = Child(stage: .born, birthDate: .now)
        child.sex = .girl
        child.deliveryType = .cesarean
        child.feeding = .mixed
        child.allergies = ["egg"]
        container.mainContext.insert(child)
        try container.mainContext.save()

        let fetched = try #require(try ModelContext(container).fetch(FetchDescriptor<Child>()).first)
        #expect(fetched.stage == .born)
        #expect(fetched.sex == .girl)
        #expect(fetched.deliveryType == .cesarean)
        #expect(fetched.feeding == .mixed)
        #expect(fetched.allergies == ["egg"])
        #expect(fetched.multiples == 1)
    }

    @Test func messagesComeBackInOrder() throws {
        let container = try DataStore.makeInMemoryContainer()  // the context needs its container alive
        let context = container.mainContext
        let conversation = Conversation(child: nil)
        context.insert(conversation)
        let start = Date.now
        conversation.messages.append(Message(role: .assistant, text: "second", createdAt: start.addingTimeInterval(1)))
        conversation.messages.append(Message(role: .user, text: "first", createdAt: start))
        try context.save()
        #expect(conversation.sortedMessages.map(\.text) == ["first", "second"])
    }
}

@MainActor
struct BirthTests {
    @Test func singletonKeepsItsRecordAndHistory() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext
        let child = Child(name: "Emma", stage: .expecting, dueDate: .now)
        context.insert(child)
        context.insert(Conversation(child: child))

        let born = child.recordBirth(at: .now, deliveryType: .vaginal, babies: [Newborn(sex: .girl)], in: context)
        try context.save()

        #expect(born.count == 1)
        #expect(born[0] === child)
        #expect(child.stage == .born)
        #expect(child.name == "Emma", "a name chosen in pregnancy is kept")
        #expect(child.multipleBirthID == nil)
        #expect(child.conversations.count == 1)
    }

    @Test func twinsSplitIntoTwoChildren() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext
        let due = Date.now.addingTimeInterval(30 * 86_400)
        let pregnancy = Child(stage: .expecting, dueDate: due, multiples: 2)
        pregnancy.pregnancyConditions = ["preeclampsia"]
        pregnancy.notes.append(ProfileNote(text: "scan at 20 weeks"))
        context.insert(pregnancy)
        context.insert(Conversation(child: pregnancy))

        let born = pregnancy.recordBirth(at: .now, deliveryType: .cesarean, babies: [
            Newborn(name: "Ola", sex: .girl, feeding: .breast),
            Newborn(name: "Kuba", sex: .boy, feeding: .formula),
        ], in: context)
        try context.save()

        #expect(try context.fetchCount(FetchDescriptor<Child>()) == 2)
        #expect(born.map(\.name) == ["Ola", "Kuba"])
        #expect(born.map(\.sex) == [.girl, .boy])
        #expect(born.map(\.feeding) == [.breast, .formula])
        #expect(born.allSatisfy { $0.stage == .born && $0.dueDate == due && $0.deliveryType == .cesarean && $0.multiples == 2 })
        #expect(born.allSatisfy { $0.pregnancyConditions == ["preeclampsia"] })
        #expect(born[0].multipleBirthID != nil)
        #expect(born[0].multipleBirthID == born[1].multipleBirthID)
        // History and notes stay with the first baby, the record the pregnancy was on.
        #expect(born[0].conversations.count == 1 && born[1].conversations.isEmpty)
        #expect(born[0].notes.count == 1 && born[1].notes.isEmpty)
    }

    @Test func tripletsAndFewerBabiesThanExpected() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext

        let triplets = Child(stage: .expecting, dueDate: .now, multiples: 3)
        context.insert(triplets)
        #expect(triplets.recordBirth(at: .now, deliveryType: nil, babies: [Newborn(), Newborn(), Newborn()], in: context).count == 3)

        let twins = Child(stage: .expecting, dueDate: .now, multiples: 2)
        context.insert(twins)
        let born = twins.recordBirth(at: .now, deliveryType: nil, babies: [Newborn()], in: context)
        #expect(born.count == 1 && born[0].multiples == 1 && born[0].multipleBirthID == nil)
    }

    @Test func multiplesHaveNoUpperLimit() throws {
        let container = try DataStore.makeInMemoryContainer()
        let context = container.mainContext
        let pregnancy = Child(stage: .expecting, dueDate: .now, multiples: 5)
        context.insert(pregnancy)
        #expect(pregnancy.multiples == 5)
        let born = pregnancy.recordBirth(at: .now, deliveryType: nil, babies: Array(repeating: Newborn(), count: 5), in: context)
        #expect(born.count == 5 && born.allSatisfy { $0.multiples == 5 })
        #expect(Child(stage: .expecting, multiples: 0).multiples == 1)
    }
}

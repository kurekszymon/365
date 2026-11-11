import Foundation
import SwiftData
import Testing
@testable import MomChat

// MARK: - App lock

final class FakeAuthenticator: DeviceAuthenticator {
    var method: LockMethod? = .faceID
    var succeeds = true
    private(set) var prompts = 0

    func availableMethod() -> LockMethod? { method }

    func authenticate(reason: String) async -> Bool {
        prompts += 1
        return succeeds
    }
}

@MainActor
struct AppLockTests {
    let defaults = UserDefaults(suiteName: "AppLockTests-\(UUID())")!

    @Test func offByDefault() {
        let lock = AppLock(authenticator: FakeAuthenticator(), defaults: defaults)
        #expect(!lock.isEnabled)
        #expect(!lock.isLocked)
        lock.didEnterBackground()
        #expect(!lock.isLocked)
    }

    @Test func startsLockedWhenTurnedOnEarlier() {
        defaults.set(true, forKey: AppLock.enabledKey)
        let lock = AppLock(authenticator: FakeAuthenticator(), defaults: defaults)
        #expect(lock.isLocked)
    }

    @Test func locksInTheBackgroundAndAsksOnceOnReturn() async {
        let face = FakeAuthenticator()
        face.succeeds = false
        let lock = AppLock(authenticator: face, defaults: defaults)
        lock.setEnabled(true)

        lock.didEnterBackground()
        #expect(lock.isLocked)
        await lock.promptIfNeeded()
        // Cancelling Face ID makes the app inactive and active again: that mustn't ask again.
        await lock.promptIfNeeded()
        #expect(face.prompts == 1)
        #expect(lock.isLocked)

        face.succeeds = true
        await lock.unlock()
        #expect(!lock.isLocked)
    }

    @Test func removingThePasscodeNeverShutsHerOut() async {
        let face = FakeAuthenticator()
        defaults.set(true, forKey: AppLock.enabledKey)
        let lock = AppLock(authenticator: face, defaults: defaults)
        face.method = nil
        await lock.unlock()
        #expect(!lock.isLocked)
        #expect(!lock.isEnabled)
    }

    @Test func resetForgetsTheSetting() {
        let lock = AppLock(authenticator: FakeAuthenticator(), defaults: defaults)
        lock.setEnabled(true)
        lock.didEnterBackground()
        lock.reset()
        #expect(!lock.isLocked)
        #expect(!AppLock(authenticator: FakeAuthenticator(), defaults: defaults).isEnabled)
    }
}

// MARK: - Encryption

struct BackupCryptoTests {
    /// Few iterations so the tests stay fast. The real count is read from the file.
    let iterations: UInt32 = 1_000
    let plaintext = Data("Emma threw up after eggs".utf8)

    @Test func roundTrip() throws {
        let sealed = try BackupCrypto.seal(plaintext, password: "correct horse", iterations: iterations)
        #expect(try BackupCrypto.open(sealed, password: "correct horse") == plaintext)
        #expect(sealed.range(of: plaintext) == nil)
    }

    @Test func eachBackupGetsItsOwnSalt() throws {
        let first = try BackupCrypto.seal(plaintext, password: "correct horse", iterations: iterations)
        let second = try BackupCrypto.seal(plaintext, password: "correct horse", iterations: iterations)
        #expect(first != second)
    }

    @Test func wrongPasswordFails() throws {
        let sealed = try BackupCrypto.seal(plaintext, password: "correct horse", iterations: iterations)
        #expect(throws: BackupCrypto.Failure.wrongPassword) {
            try BackupCrypto.open(sealed, password: "Correct horse")
        }
    }

    @Test func polishPasswordMatchesHoweverItWasTyped() throws {
        // "ż" as one character, and as "z" + combining dot above.
        let sealed = try BackupCrypto.seal(plaintext, password: "żaba1234", iterations: iterations)
        #expect(try BackupCrypto.open(sealed, password: "z\u{307}aba1234") == plaintext)
    }

    @Test func changedHeaderOrBodyFails() throws {
        let sealed = try BackupCrypto.seal(plaintext, password: "correct horse", iterations: iterations)
        var salt = sealed
        salt[BackupCrypto.headerLength - 1] ^= 1
        var body = sealed
        body[body.count - 20] ^= 1
        #expect(throws: BackupCrypto.Failure.wrongPassword) { try BackupCrypto.open(salt, password: "correct horse") }
        #expect(throws: BackupCrypto.Failure.wrongPassword) { try BackupCrypto.open(body, password: "correct horse") }
    }

    @Test func otherFilesAreNotBackups() {
        #expect(throws: BackupCrypto.Failure.notABackup) { try BackupCrypto.open(Data("hello".utf8), password: "x") }
        #expect(throws: BackupCrypto.Failure.notABackup) { try BackupCrypto.open(Data(repeating: 0, count: 200), password: "x") }
    }

    @Test func newerFileVersionIsReported() throws {
        var sealed = try BackupCrypto.seal(plaintext, password: "correct horse", iterations: iterations)
        sealed[BackupCrypto.magic.count] = BackupCrypto.version + 1
        #expect(throws: BackupCrypto.Failure.newerVersion) { try BackupCrypto.open(sealed, password: "correct horse") }
    }

    @Test func absurdIterationCountIsRejectedBeforeHashing() throws {
        var sealed = try BackupCrypto.seal(plaintext, password: "correct horse", iterations: iterations)
        let start = BackupCrypto.magic.count + 1
        for index in start..<start + 4 { sealed[index] = 0xFF }
        #expect(throws: BackupCrypto.Failure.notABackup) { try BackupCrypto.open(sealed, password: "correct horse") }
    }
}

// MARK: - Backup contents

@MainActor
struct BackupArchiveTests {
    let birth = Date(timeIntervalSinceReferenceDate: 800_000_000.123)

    /// A mom with twins (one note, one chat with a summary and a saved card), an archived pregnancy
    /// with its own chat, and a mom note.
    private func makeFamily(in context: ModelContext) throws -> MomProfile {
        let mom = MomProfile(name: "Ola", previousBirths: 0, createdAt: birth)
        mom.conditions = ["thyroid"]
        context.insert(mom)
        let momNote = ProfileNote(text: "Sleeps badly", createdAt: birth)
        context.insert(momNote)
        momNote.mom = mom

        let twins = Child(name: "Emma", stage: .expecting, dueDate: birth.addingTimeInterval(86_400 * 20), multiples: 2, createdAt: birth)
        twins.pregnancyConditions = ["gestational diabetes"]
        context.insert(twins)
        let pregnancyChat = Conversation(child: twins, createdAt: birth)
        context.insert(pregnancyChat)
        let born = twins.recordBirth(
            at: birth.addingTimeInterval(86_400),
            deliveryType: .cesarean,
            babies: [Newborn(name: "Emma", sex: .girl, feeding: .breast), Newborn(name: "Ida", sex: .girl, feeding: .mixed)],
            in: context
        )
        born[1].allergies = ["egg"]
        let note = ProfileNote(text: "Threw up after eggs", createdAt: birth.addingTimeInterval(5))
        context.insert(note)
        note.child = born[1]

        let chat = Conversation(child: born[1], createdAt: birth.addingTimeInterval(10))
        context.insert(chat)
        chat.title = "Eggs"
        chat.summary = "Asked about egg allergy."
        chat.summarizedMessageCount = 2
        for (offset, role) in [Message.Role.user, .assistant, .user, .assistant].enumerated() {
            let message = Message(role: role, text: "message \(offset)", createdAt: birth.addingTimeInterval(10 + Double(offset) * 0.001))
            context.insert(message)
            message.conversation = chat
        }
        let answer = chat.sortedMessages[3]
        answer.showsDisclaimer = true
        answer.noteProposal = ProfileProposal(fact: "egg allergy", subject: .child)
        answer.noteProposalState = .saved
        chat.sortedMessages[0].emergencyTopic = "x"
        chat.updatedAt = birth.addingTimeInterval(999)

        let lost = Child(stage: .archived, dueDate: birth, createdAt: birth.addingTimeInterval(20))
        context.insert(lost)
        let lostChat = Conversation(child: lost, createdAt: birth.addingTimeInterval(20))
        context.insert(lostChat)

        mom.activeChild = born[1]
        try context.save()
        return mom
    }

    @Test func survivesARoundTripThroughBytes() throws {
        let context = ModelContext(try DataStore.makeInMemoryContainer())
        _ = try makeFamily(in: context)
        let archive = try BackupArchive(from: context, now: birth)
        #expect(try BackupArchive.decoded(from: archive.encoded()) == archive)
    }

    @Test func restoreRebuildsEverything() throws {
        let source = ModelContext(try DataStore.makeInMemoryContainer())
        _ = try makeFamily(in: source)
        let archive = try BackupArchive(from: source, now: birth)

        let target = ModelContext(try DataStore.makeInMemoryContainer())
        try archive.restore(into: target)

        // Exporting what was restored gives the same archive (fresh child IDs aside).
        var again = try BackupArchive(from: target, now: birth)
        let idMap = Dictionary(uniqueKeysWithValues: zip(again.children.map(\.id), archive.children.map(\.id)))
        again.children = again.children.map { var child = $0; child.id = idMap[child.id]!; return child }
        let activeID = again.mom?.activeChildID.flatMap { idMap[$0] }
        again.mom?.activeChildID = activeID
        again.conversations = again.conversations.map { var chat = $0; chat.childID = chat.childID.flatMap { idMap[$0] }; return chat }
        #expect(again == archive)

        let mom = try #require(try target.fetch(FetchDescriptor<MomProfile>()).first)
        let ida = try #require(mom.activeChild)
        #expect(ida.name == "Ida")
        #expect(ida.notes.map(\.text) == ["Threw up after eggs"])
        #expect(try ida.birthGroup(in: target).count == 2)
        // The pregnancy chat stayed on Emma's record and still shows under her twin.
        #expect(try ida.history(in: target).count == 2)
        let chat = try #require(ida.conversations.first)
        #expect(chat.sortedMessages.map(\.text) == ["message 0", "message 1", "message 2", "message 3"])
        #expect(chat.sortedMessages[3].noteProposalState == .saved)
        #expect(chat.updatedAt == birth.addingTimeInterval(999))
        #expect(try target.fetch(FetchDescriptor<Child>()).contains { $0.stage == .archived && $0.conversations.count == 1 })
    }

    @Test func restoreReplacesWhatWasThere() throws {
        let source = ModelContext(try DataStore.makeInMemoryContainer())
        _ = try makeFamily(in: source)
        let archive = try BackupArchive(from: source, now: birth)

        let target = ModelContext(try DataStore.makeInMemoryContainer())
        let old = MomProfile(name: "Old")
        target.insert(old)
        target.insert(Child(name: "Old baby", stage: .born, birthDate: birth))
        try target.save()

        try archive.restore(into: target)
        #expect(try target.fetch(FetchDescriptor<MomProfile>()).map(\.name) == ["Ola"])
        #expect(try target.fetchCount(FetchDescriptor<Child>()) == 3)
        #expect(try target.fetchCount(FetchDescriptor<ProfileNote>()) == 2)
        #expect(try target.fetchCount(FetchDescriptor<Message>()) == 4)
    }

    @Test func wrongPasswordLeavesTheDataAlone() async throws {
        let context = ModelContext(try DataStore.makeInMemoryContainer())
        _ = try makeFamily(in: context)
        let sealed = try BackupCrypto.seal(BackupArchive(from: context).encoded(), password: "correct horse", iterations: 1_000)

        await #expect(throws: BackupFile.Failure.wrongPassword) {
            _ = try await BackupFile.open(sealed, password: "wrong horse")
        }
        let archive = try await BackupFile.open(sealed, password: "correct horse")
        #expect(archive.mom?.name == "Ola")
        #expect(try context.fetchCount(FetchDescriptor<Message>()) == 4)
    }

    @Test func exportWritesAFileThatOpens() async throws {
        let context = ModelContext(try DataStore.makeInMemoryContainer())
        _ = try makeFamily(in: context)
        let url = try await BackupFile.export(from: context, password: "correct horse", iterations: 1_000)
        defer { BackupFile.removeTemporaryFiles() }
        #expect(url.pathExtension == BackupFile.fileExtension)
        let archive = try await BackupFile.read(url, password: "correct horse")
        #expect(archive.children.count == 3)
    }
}

// MARK: - Delete everything

@MainActor
struct DataWipeTests {
    @Test func deletesEveryRecordAndTurnsOffTheLock() throws {
        let context = ModelContext(try DataStore.makeInMemoryContainer())
        let mom = MomProfile()
        context.insert(mom)
        let child = Child(stage: .born, birthDate: .now)
        context.insert(child)
        mom.activeChild = child
        let chat = Conversation(child: child)
        context.insert(chat)
        let message = Message(role: .user, text: "hi")
        context.insert(message)
        message.conversation = chat
        let note = ProfileNote(text: "note")
        context.insert(note)
        note.child = child
        try context.save()

        let defaults = UserDefaults(suiteName: "DataWipeTests-\(UUID())")!
        defaults.set(1.0, forKey: BirthBanner.dismissedOnKey)
        let lock = AppLock(authenticator: FakeAuthenticator(), defaults: defaults)
        lock.setEnabled(true)

        try DataWipe.everything(in: context, lock: lock, defaults: defaults)

        #expect(try context.fetchCount(FetchDescriptor<MomProfile>()) == 0)
        #expect(try context.fetchCount(FetchDescriptor<Child>()) == 0)
        #expect(try context.fetchCount(FetchDescriptor<Conversation>()) == 0)
        #expect(try context.fetchCount(FetchDescriptor<Message>()) == 0)
        #expect(try context.fetchCount(FetchDescriptor<ProfileNote>()) == 0)
        #expect(!lock.isEnabled)
        #expect(defaults.object(forKey: BirthBanner.dismissedOnKey) == nil)
    }
}

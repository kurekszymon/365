import Foundation
import SwiftData
import Testing
@testable import MomChat

/// Stage 14: what TestFlight builds depend on.
@MainActor
struct FeedbackMailTests {
    private let mail = FeedbackMail(
        appVersion: "1.0",
        build: "7",
        systemVersion: "26.1",
        deviceModel: "iPhone16,1",
        appLanguage: "en"
    )

    @Test func draftCarriesTheDetailsButNothingElse() throws {
        let url = try #require(mail.url(to: "help@example.com"))
        let components = try #require(URLComponents(url: url, resolvingAgainstBaseURL: false))
        #expect(components.scheme == "mailto")
        #expect(components.path == "help@example.com")

        let items = components.queryItems ?? []
        #expect(items.map(\.name) == ["subject", "body"])
        let subject = try #require(items.first { $0.name == "subject" }?.value)
        let body = try #require(items.first { $0.name == "body" }?.value)
        #expect(subject.contains("1.0"))
        for detail in ["1.0", "7", "26.1", "iPhone16,1", "en"] {
            #expect(body.contains(detail))
        }
    }

    /// `+` would turn into a space and `&` would end the body early in a mail app.
    @Test func plusAndAmpersandSurviveTheURL() throws {
        var odd = mail
        odd.deviceModel = "a+b&c=d"
        let url = try #require(odd.url(to: "help@example.com"))
        #expect(!url.absoluteString.contains("a+b"))
        let body = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first { $0.name == "body" }?.value
        #expect(body?.contains("a+b&c=d") == true)
    }

    @Test func noAddressNoDraft() {
        #expect(mail.url(to: "") == nil)
    }
}

@MainActor
struct VersionedSchemaTests {
    /// Every store written before Stage 14 had no version. It must still open, data intact.
    @Test func storeFromBeforeVersioningOpens() throws {
        let directory = URL.temporaryDirectory.appending(path: "store-\(UUID().uuidString)", directoryHint: .isDirectory)
        defer { try? FileManager.default.removeItem(at: directory) }
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let url = directory.appending(path: "MomChat.store")

        do {
            let unversioned = Schema([MomProfile.self, Child.self, ProfileNote.self, Conversation.self, Message.self])
            let old = try ModelContainer(for: unversioned, configurations: ModelConfiguration(schema: unversioned, url: url, cloudKitDatabase: .none))
            old.mainContext.insert(MomProfile(name: "Ania"))
            old.mainContext.insert(Child(name: "Emma", stage: .born, birthDate: .now))
            try old.mainContext.save()
        }

        let container = try DataStore.makeContainer(directory: directory)
        let context = ModelContext(container)
        #expect(try context.fetch(FetchDescriptor<MomProfile>()).first?.name == "Ania")
        #expect(try context.fetch(FetchDescriptor<Child>()).first?.name == "Emma")
    }

    @Test func storeOpensTwiceWithTheSameVersion() throws {
        let directory = URL.temporaryDirectory.appending(path: "store-\(UUID().uuidString)", directoryHint: .isDirectory)
        defer { try? FileManager.default.removeItem(at: directory) }

        do {
            let first = try DataStore.makeContainer(directory: directory)
            first.mainContext.insert(MomProfile(name: "Ania"))
            try first.mainContext.save()
        }
        let second = try DataStore.makeContainer(directory: directory)
        #expect(try ModelContext(second).fetchCount(FetchDescriptor<MomProfile>()) == 1)
    }
}

import Foundation
import SwiftData

/// The on-disk SwiftData store. It lives in its own folder so file protection and the backup
/// exclusion cover the database and its `-wal`/`-shm` side files.
nonisolated enum DataStore {
    static let schema = Schema([MomProfile.self, Child.self, ProfileNote.self, Conversation.self, Message.self])

    static var defaultDirectory: URL {
        URL.applicationSupportDirectory.appending(path: "Store", directoryHint: .isDirectory)
    }

    static func makeContainer(directory: URL = defaultDirectory) throws -> ModelContainer {
        try prepare(directory)
        let configuration = ModelConfiguration(
            schema: schema,
            url: directory.appending(path: "MomChat.store"),
            cloudKitDatabase: .none
        )
        return try ModelContainer(for: schema, configurations: configuration)
    }

    static func makeInMemoryContainer() throws -> ModelContainer {
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true, cloudKitDatabase: .none)
        return try ModelContainer(for: schema, configurations: configuration)
    }

    /// `.complete`: unreadable while the phone is locked. New files in the folder inherit it.
    /// Excluded from iCloud and Mac backups; moving phones goes through the encrypted export (Stage 11).
    static func prepare(_ directory: URL) throws {
        let fileManager = FileManager.default
        let protection: [FileAttributeKey: Any] = [.protectionKey: FileProtectionType.complete]
        try fileManager.createDirectory(at: directory, withIntermediateDirectories: true, attributes: protection)
        try fileManager.setAttributes(protection, ofItemAtPath: directory.path(percentEncoded: false))
        for file in try fileManager.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil) {
            try fileManager.setAttributes(protection, ofItemAtPath: file.path(percentEncoded: false))
        }

        var directory = directory
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try directory.setResourceValues(values)
    }
}

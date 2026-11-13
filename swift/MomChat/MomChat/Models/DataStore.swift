import Foundation
import SwiftData

/// The on-disk SwiftData store. It lives in its own folder so file protection and the backup
/// exclusion cover the database and its `-wal`/`-shm` side files.
nonisolated enum DataStore {
    static let schema = Schema(versionedSchema: MomChatSchemaV1.self)

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
        return try ModelContainer(for: schema, migrationPlan: MomChatMigrationPlan.self, configurations: configuration)
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

/// The schema testers' and users' stores were first written with (TestFlight, Stage 14).
///
/// Additive changes (a new optional property, a new model) still migrate on their own. Anything
/// else (renaming, changing a type, making a property required) needs a new version:
/// 1. Copy today's model classes into `MomChatSchemaV1` as nested types, so V1 stays frozen.
/// 2. Add `MomChatSchemaV2` listing the changed top-level models, with version 2.0.0.
/// 3. Append it to `schemas` and add a `MigrationStage` (lightweight or custom) to `stages`.
nonisolated enum MomChatSchemaV1: VersionedSchema {
    static let versionIdentifier = Schema.Version(1, 0, 0)

    static var models: [any PersistentModel.Type] {
        [MomProfile.self, Child.self, ProfileNote.self, Conversation.self, Message.self]
    }
}

nonisolated enum MomChatMigrationPlan: SchemaMigrationPlan {
    static var schemas: [any VersionedSchema.Type] { [MomChatSchemaV1.self] }
    static var stages: [MigrationStage] { [] }
}

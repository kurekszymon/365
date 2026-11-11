import Foundation
import SwiftData

/// Writing and reading the encrypted backup file. Hashing the password takes about half a
/// second, so it runs off the main thread; reading and writing SwiftData stays on it.
enum BackupFile {
    static let fileExtension = "momchat"
    static let minimumPasswordLength = 8

    enum Failure: Error, Equatable {
        case unreadable, notABackup, newerVersion, wrongPassword

        init(_ error: Error) {
            switch error {
            case BackupCrypto.Failure.notABackup: self = .notABackup
            case BackupCrypto.Failure.newerVersion, BackupArchive.DecodeFailure.newerFormat: self = .newerVersion
            case BackupCrypto.Failure.wrongPassword: self = .wrongPassword
            case let failure as Failure: self = failure
            // It opened with her password but the contents don't decode: damaged, or not ours.
            default: self = .notABackup
            }
        }

        var message: LocalizedStringResource {
            switch self {
            case .unreadable: .backupErrorUnreadable
            case .notABackup: .backupErrorNotABackup
            case .newerVersion: .backupErrorNewerVersion
            case .wrongPassword: .backupErrorWrongPassword
            }
        }
    }

    /// A file in the temporary folder, ready for the share sheet. Encrypted, but still removed
    /// when the export screen closes.
    static func export(from context: ModelContext, password: String, iterations: UInt32 = BackupCrypto.defaultIterations, now: Date = .now) async throws -> URL {
        let archive = try BackupArchive(from: context, now: now)
        let sealed = try await Task.detached(priority: .userInitiated) {
            try BackupCrypto.seal(archive.encoded(), password: password, iterations: iterations)
        }.value

        let url = directory.appending(path: "\(fileName(on: now)).\(fileExtension)")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try sealed.write(to: url, options: [.atomic, .completeFileProtection])
        return url
    }

    /// Decrypts and decodes without touching her data, so a wrong password changes nothing.
    static func read(_ url: URL, password: String) async throws(Failure) -> BackupArchive {
        let isScoped = url.startAccessingSecurityScopedResource()
        defer { if isScoped { url.stopAccessingSecurityScopedResource() } }
        guard let data = try? Data(contentsOf: url) else { throw .unreadable }
        return try await open(data, password: password)
    }

    static func open(_ data: Data, password: String) async throws(Failure) -> BackupArchive {
        do {
            return try await Task.detached(priority: .userInitiated) {
                try BackupArchive.decoded(from: BackupCrypto.open(data, password: password))
            }.value
        } catch {
            throw Failure(error)
        }
    }

    static func removeTemporaryFiles() {
        try? FileManager.default.removeItem(at: directory)
    }

    private static var directory: URL {
        URL.temporaryDirectory.appending(path: "Backup", directoryHint: .isDirectory)
    }

    /// "MomChat Backup 2026-11-11": the date sorts well in Files whatever the language.
    private static func fileName(on date: Date) -> String {
        let day = date.formatted(Date.ISO8601FormatStyle(timeZone: .current).year().month().day())
        return String(localized: .backupFileName(day))
    }
}

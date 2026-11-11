import Foundation
import SwiftData

/// "Delete everything". The free-question count stays (it's per phone, in the Keychain) and so
/// do purchases (they belong to her Apple Account).
enum DataWipe {
    /// Small app-wide settings that describe her data.
    static let defaultsKeys = [BirthBanner.dismissedOnKey]

    /// Marks every record for deletion. Nothing is saved, so a restore can replace the data in one save.
    static func deleteRecords(in context: ModelContext) throws {
        // Fetch everything first: deleting a parent cascades, and its children shouldn't be fetched half-deleted.
        let messages = try context.fetch(FetchDescriptor<Message>())
        let conversations = try context.fetch(FetchDescriptor<Conversation>())
        let notes = try context.fetch(FetchDescriptor<ProfileNote>())
        let children = try context.fetch(FetchDescriptor<Child>())
        let moms = try context.fetch(FetchDescriptor<MomProfile>())
        messages.forEach(context.delete)
        conversations.forEach(context.delete)
        notes.forEach(context.delete)
        children.forEach(context.delete)
        moms.forEach(context.delete)
    }

    static func everything(in context: ModelContext, lock: AppLock, defaults: UserDefaults = .standard) throws {
        do {
            try deleteRecords(in: context)
            try context.save()
        } catch {
            context.rollback()
            throw error
        }
        lock.reset()
        defaultsKeys.forEach(defaults.removeObject(forKey:))
        BackupFile.removeTemporaryFiles()
    }
}

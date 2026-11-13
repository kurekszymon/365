import OSLog
import SwiftData
import SwiftUI

@main
struct MomChatApp: App {
    @State private var access = QuestionAccess()
    @State private var lock = AppLock()
    /// Set by "Try again" on the error screen when the first attempt failed.
    @State private var reopenedStore: ModelContainer?

    var body: some Scene {
        WindowGroup {
            Group {
                if let container = reopenedStore ?? (try? sharedStore.get()) {
                    RootView()
                        .modelContainer(container)
                } else {
                    StoreErrorView(onRetry: retryStore)
                }
            }
            .environment(access)
            .environment(lock)
        }
    }

    private func retryStore() {
        reopenedStore = try? openStore()
    }
}

/// Opened on first use from `body`, not in `init`: iOS can prewarm the app before the first unlock,
/// when a `.complete`-protected store can't be read yet.
private let sharedStore = Result { try openStore() }

private func openStore() throws -> ModelContainer {
    do {
        return try DataStore.makeContainer()
    } catch {
        Logger(subsystem: "com.kurek.MomChat", category: "store")
            .error("Could not open the data store: \(String(describing: error), privacy: .private)")
        throw error
    }
}

import SwiftData
import SwiftUI

@main
struct MomChatApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(sharedContainer)
    }
}

/// Opened on first use from `body`, not in `init`: iOS can prewarm the app before the first unlock,
/// when a `.complete`-protected store can't be read yet.
private let sharedContainer: ModelContainer = {
    do {
        return try DataStore.makeContainer()
    } catch {
        // Until there are real users a schema change can break the dev store: delete the app and reinstall.
        fatalError("Could not open the data store: \(error)")
    }
}()

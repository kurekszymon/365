import SwiftData
import SwiftUI

/// Onboarding until a profile is saved, then the chat. The model check runs at every launch too,
/// because Apple Intelligence can be turned off or the language changed later.
/// The lock screen and the privacy cover sit on top of everything (Stage 11).
struct RootView: View {
    @Query private var moms: [MomProfile]
    @Query(sort: \Child.createdAt) private var children: [Child]
    @State private var availability = ModelAvailability()

    @Environment(\.scenePhase) private var scenePhase
    @Environment(QuestionAccess.self) private var access
    @Environment(AppLock.self) private var lock

    var body: some View {
        Group {
            if moms.isEmpty {
                OnboardingView(availability: availability)
            } else if !availability.isReady {
                DeviceCheckView(availability: availability)
            } else {
                NavigationStack {
                    ChatView(child: activeChild)
                }
                // A restored backup is a new set of records: rebuild the chat instead of
                // keeping state that points at the deleted ones.
                .id(moms.first?.persistentModelID)
            }
        }
        .overlay {
            if lock.isLocked {
                LockScreenView()
            } else if scenePhase != .active {
                PrivacyCoverView()
            }
        }
        .animation(.default, value: moms.isEmpty)
        .animation(.default, value: availability.isReady)
        .task {
            // At launch the app may still be inactive; then the change to active below asks.
            if scenePhase == .active { await lock.promptIfNeeded() }
            await access.start()
        }
        // Coming back from Settings after turning Apple Intelligence on, or after a plan changed.
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .background:
                lock.didEnterBackground()
            case .active:
                Task { await lock.promptIfNeeded() }
                availability.refresh()
                Task { await access.refresh() }
            default:
                break
            }
        }
    }

    private var activeChild: Child? {
        moms.first?.activeChild ?? children.first { $0.stage != .archived }
    }
}

#Preview {
    RootView()
        .environment(QuestionAccess())
        .environment(AppLock())
        .modelContainer(try! DataStore.makeInMemoryContainer())
}

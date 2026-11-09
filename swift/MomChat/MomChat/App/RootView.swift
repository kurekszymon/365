import SwiftData
import SwiftUI

/// Onboarding until a profile is saved, then the chat. The model check runs at every launch too,
/// because Apple Intelligence can be turned off or the language changed later.
struct RootView: View {
    @Query private var moms: [MomProfile]
    @Query(sort: \Child.createdAt) private var children: [Child]
    @State private var availability = ModelAvailability()

    @Environment(\.scenePhase) private var scenePhase
    @Environment(QuestionAccess.self) private var access

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
            }
        }
        .animation(.default, value: moms.isEmpty)
        .animation(.default, value: availability.isReady)
        .task { await access.start() }
        // Coming back from Settings after turning Apple Intelligence on, or after a plan changed.
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active else { return }
            availability.refresh()
            Task { await access.refresh() }
        }
    }

    private var activeChild: Child? {
        moms.first?.activeChild ?? children.first { $0.stage != .archived }
    }
}

#Preview {
    RootView()
        .environment(QuestionAccess())
        .modelContainer(try! DataStore.makeInMemoryContainer())
}

import SwiftUI

struct RootView: View {
    // Hardcoded until Stage 4 saves a real MomProfile.
    @State private var hasProfile = false
    @State private var availability = ModelAvailability()
    #if DEBUG
    // Lets the UI be checked on a simulator whose Mac has Apple Intelligence off.
    @State private var skipsModelCheck = false
    #endif

    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        Group {
            if !isModelReady {
                ModelUnavailableView(state: availability.state) {
                    availability.refresh()
                }
                #if DEBUG
                .overlay(alignment: .topTrailing) {
                    Button(String("Skip (debug)")) { skipsModelCheck = true }
                        .font(Typography.caption)
                        .padding()
                }
                #endif
            } else if hasProfile {
                NavigationStack {
                    ChatView()
                }
            } else {
                OnboardingPlaceholderView {
                    hasProfile = true
                }
            }
        }
        .animation(.default, value: hasProfile)
        .animation(.default, value: availability.state)
        // Coming back from Settings after turning Apple Intelligence on.
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { availability.refresh() }
        }
    }

    private var isModelReady: Bool {
        #if DEBUG
        if skipsModelCheck { return true }
        #endif
        return availability.state == .available
    }
}

#Preview {
    RootView()
}
